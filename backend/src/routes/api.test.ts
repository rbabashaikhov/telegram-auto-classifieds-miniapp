import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { createExternalCrmSlice, createExternalPropertySlice } from '../providers/crm/external.js';
import { createTestWorld } from '../test/harness.js';
import { saveQualification } from '../services/qualification.js';
import { addFavorite } from '../services/favorites.js';
import { cancelViewing, requestViewing } from '../services/viewings.js';
import { recordPropertyView } from '../services/intent.js';
import { funnelAnalytics } from '../services/analytics.js';
import { scoring } from '../services/scoring.js';
import { createSellerLead } from '../services/sellerLeads.js';

function admin() {
  return { 'x-admin-token': 'test-admin-token' };
}

describe('application flows', () => {
  it('creates a qualification, matches, score events and HOT temperature', () => {
    const { providers } = createTestWorld();
    const customer = providers.customers.upsert({
      id: 777,
      first_name: 'Тест',
      last_name: 'Лид',
    }).customer;
    const result = saveQualification(providers, {
      customerId: customer.id,
      goal: 'own_use',
      propertyType: 'new_build',
      locations: ['primorsky'],
      budgetMin: 16_000_000,
      budgetMax: 22_000_000,
      rooms: '2',
      purchaseTiming: 'now',
      payment: 'cash',
      mortgageStatus: null,
      preferences: ['finished', 'parking', 'near_metro'],
      areaMin: 60,
      areaMax: 80,
      consentAt: new Date().toISOString(),
    });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0]?.score).toBeGreaterThanOrEqual(result.matches[1]?.score ?? 0);
    expect(result.lead.score).toBeGreaterThanOrEqual(40);
    const events = providers.scoreEvents.listByLead(result.lead.id);
    expect(events.some((event) => event.eventType === 'purchase_now')).toBe(true);
    expect(events.some((event) => event.eventType === 'cash')).toBe(true);
  });

  it('applies behavioral scoring, clamps at 100 and records events', () => {
    const { providers } = createTestWorld();
    const customer = providers.customers.upsert({ id: 778, first_name: 'Горячий' }).customer;
    const { lead, matches } = saveQualification(providers, {
      customerId: customer.id,
      goal: 'own_use',
      propertyType: 'new_build',
      locations: ['primorsky'],
      budgetMin: 16_000_000,
      budgetMax: 24_000_000,
      rooms: '2',
      purchaseTiming: 'now',
      payment: 'cash',
      mortgageStatus: null,
      preferences: ['finished'],
      areaMin: null,
      areaMax: null,
      consentAt: new Date().toISOString(),
    });
    const propertyId = matches[0]!.propertyId;
    recordPropertyView(providers, customer.id, propertyId);
    recordPropertyView(providers, customer.id, propertyId);
    addFavorite(providers, customer.id, propertyId);
    requestViewing(providers, {
      customerId: customer.id,
      propertyId,
      scheduledAt: '2026-08-21T10:00:00',
      type: 'on_site',
    });
    const updated = providers.leads.getById(lead.id)!;
    expect(updated.score).toBeLessThanOrEqual(100);
    expect(['WARM', 'HOT']).toContain(updated.temperature);
    const types = providers.interactions.listByCustomer(customer.id).map((item) => item.eventType);
    expect(types).toContain('property_viewed');
    expect(types).toContain('property_revisited');
    expect(types).toContain('property_favorited');
    expect(types).toContain('viewing_requested');
    const scoreEvents = scoring(providers).snapshot(updated).events;
    expect(scoreEvents.length).toBeGreaterThan(2);
  });

  it('keeps favorite adds idempotent', () => {
    const { providers } = createTestWorld();
    const customer = providers.customers.upsert({ id: 779, first_name: 'Идемпотент' }).customer;
    const propertyId = providers.properties.listProperties()[0]!.id;
    const first = addFavorite(providers, customer.id, propertyId);
    const second = addFavorite(providers, customer.id, propertyId);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(providers.favorites.listByCustomer(customer.id)).toHaveLength(1);
  });

  it('creates and cancels a viewing only on explicit request', () => {
    const { providers } = createTestWorld();
    const customer = providers.customers.upsert({ id: 780, first_name: 'Просмотр' }).customer;
    const propertyId = providers.properties.listProperties()[0]!.id;
    const viewing = requestViewing(providers, {
      customerId: customer.id,
      propertyId,
      scheduledAt: '2026-08-22T15:00:00',
      type: 'office',
    });
    expect(viewing.status).toBe('scheduled');
    const cancelled = cancelViewing(providers, viewing.id, customer.id);
    expect(cancelled.status).toBe('cancelled');
  });

  it('creates a seller lead as a separate flow', () => {
    const { providers } = createTestWorld();
    const customer = providers.customers.upsert({ id: 781, first_name: 'Собственник' }).customer;
    const lead = createSellerLead(providers, {
      customerId: customer.id,
      location: 'central',
      propertyType: 'secondary',
      rooms: '2',
      area: 58,
      condition: 'good',
      desiredPrice: 17_000_000,
      saleTiming: 'now',
      comment: 'Готова показать на выходных',
      contact: '+7 900 111-22-33',
    });
    expect(lead.id).toBeGreaterThan(0);
    expect(providers.sellerLeads.list().some((item) => item.id === lead.id)).toBe(true);
  });

  it('aggregates funnel analytics from first-party events', () => {
    const { providers } = createTestWorld();
    const analytics = funnelAnalytics(providers);
    expect(analytics.funnel.find((stage) => stage.event === 'app_opened')?.customers).toBeGreaterThan(0);
    expect(analytics.funnel.find((stage) => stage.event === 'qualification_completed')?.customers).toBeGreaterThan(0);
    expect(analytics.temperature.HOT + analytics.temperature.WARM + analytics.temperature.COLD).toBeGreaterThan(0);
    expect(analytics.averageMatchesPerQualifiedLead).toBeGreaterThan(0);
  });
});

describe('http api', () => {
  it('rejects admin without token', async () => {
    const { providers } = createTestWorld();
    const app = createApp(providers);
    const response = await request(app).get('/api/admin/dashboard');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('ADMIN_UNAUTHORIZED');
  });

  it('returns admin dashboard with seed data when authorized', async () => {
    const { providers } = createTestWorld();
    const app = createApp(providers);
    const response = await request(app).get('/api/admin/dashboard').set(admin());
    expect(response.status).toBe(200);
    expect(response.body.data.hotLeads).toBeGreaterThan(0);
  });

  it('returns 501 CRM_NOT_CONFIGURED for the external CRM adapter', async () => {
    const { providers } = createTestWorld();
    const app = createApp({
      ...providers,
      ...createExternalCrmSlice(),
    });
    const response = await request(app).get('/api/me');
    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe('CRM_NOT_CONFIGURED');
  });

  it('returns 501 PROPERTY_PROVIDER_NOT_CONFIGURED for the external property adapter', async () => {
    const { providers } = createTestWorld();
    const app = createApp({
      ...providers,
      ...createExternalPropertySlice(),
    });
    const response = await request(app).get('/api/catalog');
    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe('PROPERTY_PROVIDER_NOT_CONFIGURED');
  });

  it('saves qualification through the public API', async () => {
    const { providers } = createTestWorld();
    const app = createApp(providers);
    const response = await request(app)
      .post('/api/qualification')
      .send({
        goal: 'own_use',
        propertyType: 'new_build',
        locations: ['moskovsky'],
        budgetMin: 12_000_000,
        budgetMax: 18_000_000,
        rooms: '2',
        purchaseTiming: '1_3_months',
        payment: 'mortgage',
        mortgageStatus: 'approved',
        preferences: ['school_nearby', 'quiet_area'],
        consent: true,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.matches.length).toBeGreaterThan(0);
    expect(response.body.data.lead.score).toBeGreaterThan(0);
  });
});
