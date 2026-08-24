import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { DemoPaymentProvider } from '../providers/payments.js';
import type { FileStorage } from '../providers/fileStorage.js';
import { applyPaymentEvent } from '../services/payments.js';
import { createTestWorld } from '../test/harness.js';
import { createPaymentsRouter } from './payments.js';

const storage: FileStorage = { async save() { throw new Error('not used'); }, async delete() {} };
const other = { 'x-telegram-init-data': new URLSearchParams({ user: JSON.stringify({ id: 222333, first_name: 'Other' }) }).toString() };
const admin = { 'x-admin-token': 'test-admin-token' };

function listingInput(world: ReturnType<typeof createTestWorld>) {
  const brand = world.providers.catalog.brands()[0]!; const model = world.providers.catalog.models(brand.slug)[0]!;
  return { brandId: brand.id, modelId: model.id, year: 2022, price: 2_500_000, mileage: 40_000, bodyType: 'sedan', transmission: 'automatic', driveType: 'front', engineType: 'petrol', engineVolume: 2, color: 'Белый', city: 'Москва', description: 'Тестовое объявление с подробным описанием автомобиля и его состояния.' };
}

async function setup() {
  const world = createTestWorld();
  const app = createApp(world.providers, storage, world.providers.payments, new DemoPaymentProvider(), { demoEnabled: true });
  const created = await request(app).post('/api/me/listings').send(listingInput(world));
  const listingId = Number(created.body.data.id);
  world.providers.sellerListings.addPhoto(listingId, { url: '/photo.png', storageKey: 'photo', mimeType: 'image/png', sizeBytes: 12 });
  const tariffId = world.providers.payments.listActiveTariffs()[0]!.id;
  return { ...world, app, listingId, tariffId };
}

async function createPayment(app: express.Express, listingId: number, tariffId: number, key: string) {
  return request(app).post(`/api/me/listings/${listingId}/payments`).set('idempotency-key', key).send({ tariffId, amount: 1, currency: 'USD' });
}

describe('payment-ready listing flow', () => {
  it('returns only active tariffs in display order', async () => {
    const { app, db } = await setup(); db.prepare("UPDATE tariffs SET active=0 WHERE code='standard'").run();
    const response = await request(app).get('/api/tariffs');
    expect(response.status).toBe(200); expect(response.body.data.map((x: { code: string }) => x.code)).toEqual(['basic','extended']);
  });

  it('creates a backend-priced pending payment and is idempotent', async () => {
    const { app, listingId, tariffId } = await setup();
    const first = await createPayment(app, listingId, tariffId, 'same-request'); const second = await createPayment(app, listingId, tariffId, 'same-request');
    expect(first.status).toBe(201); expect(first.body.data.status).toBe('pending'); expect(first.body.data.amountMinor).toBe(29_900);
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('rejects another owner and inactive tariffs', async () => {
    const { app, db, listingId, tariffId } = await setup();
    expect((await request(app).post(`/api/me/listings/${listingId}/payments`).set('idempotency-key', 'foreign').set(other).send({ tariffId })).status).toBe(404);
    db.prepare('UPDATE tariffs SET active=0 WHERE id=?').run(tariffId);
    const inactive = await createPayment(app, listingId, tariffId, 'inactive'); expect(inactive.status).toBe(400); expect(inactive.body.error.code).toBe('INACTIVE_TARIFF');
  });

  it.each([['succeed','paid'],['fail','failed'],['cancel','cancelled']] as const)('supports controlled pending → %s demo transition', async (action, status) => {
    const { app, listingId, tariffId } = await setup(); const created = await createPayment(app, listingId, tariffId, `transition-${action}`);
    const changed = await request(app).post(`/api/demo-payments/${created.body.data.id}/${action}`);
    expect(changed.status).toBe(200); expect(changed.body.data.status).toBe(status);
    const illegal = await request(app).post(`/api/demo-payments/${created.body.data.id}/succeed`);
    expect(illegal.status).toBe(409); expect(illegal.body.error.code).toBe('INVALID_PAYMENT_TRANSITION');
  });

  it('requires payment before submit and allows a paid listing only', async () => {
    const { app, listingId, tariffId } = await setup();
    const unpaid = await request(app).post(`/api/me/listings/${listingId}/submit`); expect(unpaid.status).toBe(402); expect(unpaid.body.error.code).toBe('PAYMENT_REQUIRED');
    const created = await createPayment(app, listingId, tariffId, 'submit-paid'); await request(app).post(`/api/demo-payments/${created.body.data.id}/succeed`);
    const submitted = await request(app).post(`/api/me/listings/${listingId}/submit`); expect(submitted.body.data.status).toBe('pending_moderation');
    expect((await request(app).get(`/api/listings/${listingId}`)).status).toBe(404);
  });

  it('keeps payment reads owner-scoped', async () => {
    const { app, listingId, tariffId } = await setup(); const created = await createPayment(app, listingId, tariffId, 'private-payment');
    expect((await request(app).get(`/api/me/payments/${created.body.data.id}`).set(other)).status).toBe(404);
    const own = await request(app).get('/api/me/payments'); expect(own.body.data.some((x: { id: number }) => x.id === created.body.data.id)).toBe(true);
  });

  it('processes normalized events idempotently and blocks regression', async () => {
    const { providers, app, listingId, tariffId } = await setup(); const created = await createPayment(app, listingId, tariffId, 'webhook-event');
    const event = { providerPaymentId: created.body.data.providerPaymentId, status: 'paid' as const, eventId: 'provider-event-1' };
    const first = applyPaymentEvent(providers.payments, 'demo', event); const duplicate = applyPaymentEvent(providers.payments, 'demo', event);
    expect(first.status).toBe('paid'); expect(duplicate.events).toHaveLength(1);
    expect(() => applyPaymentEvent(providers.payments, 'demo', { ...event, status: 'failed', eventId: 'provider-event-2' })).toThrow(/Cannot transition/);
    expect(providers.payments.get(created.body.data.id)?.status).toBe('paid');
  });

  it('protects real admin and keeps demo admin payment views read-only', async () => {
    const { app, listingId, tariffId } = await setup(); await createPayment(app, listingId, tariffId, 'admin-view');
    expect((await request(app).get('/api/admin/payments')).status).toBe(401);
    expect((await request(app).get('/api/admin/payments').set(admin)).status).toBe(200);
    expect((await request(app).get('/api/demo-admin/payments')).status).toBe(200);
    expect((await request(app).post('/api/demo-admin/payments/1')).status).toBe(405);
  });

  it('keeps seller payments unauthorized without Telegram auth outside demo mode', async () => {
    const world = createTestWorld(); const app = express(); app.use(express.json());
    app.use('/api', createPaymentsRouter(world.providers, world.providers.payments, new DemoPaymentProvider(), { demoEnabled: false }, createAuthMiddleware({ allowDemoMode: false, telegramBotToken: '' })));
    expect((await request(app).get('/api/me/payments')).status).toBe(401);
  });

  it('disables demo mutation endpoints when the demo guard is off', async () => {
    const world = createTestWorld(); const app = createApp(world.providers, storage, world.providers.payments, new DemoPaymentProvider(), { demoEnabled: false });
    expect((await request(app).post('/api/demo-payments/1/succeed')).status).toBe(404);
  });
});
