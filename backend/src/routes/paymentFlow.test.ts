import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { DemoPaymentProvider, ExternalPaymentProvider } from '../providers/payments.js';
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
  return request(app).post(`/api/me/listings/${listingId}/payments`).set('idempotency-key', key)
    .send({ tariffId, amount: 1, price: 1, currency: 'USD', paid: true });
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
    expect(first.body.data.currency).toBe('RUB');
    expect(second.body.data.id).toBe(first.body.data.id);
  });

  it('does not duplicate a concurrent idempotent HTTP request or an already-paid tariff', async () => {
    const { app, providers, listingId, tariffId } = await setup();
    const before = providers.payments.listAll().length;
    const [first, second] = await Promise.all([
      createPayment(app, listingId, tariffId, 'parallel-request'),
      createPayment(app, listingId, tariffId, 'parallel-request'),
    ]);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect(providers.payments.listAll()).toHaveLength(before + 1);
    await request(app).post(`/api/demo-payments/${first.body.data.id}/succeed`);
    const paidRetry = await createPayment(app, listingId, tariffId, 'new-key-after-paid');
    expect(paidRetry.body.data.id).toBe(first.body.data.id);
    expect(providers.payments.listAll()).toHaveLength(before + 1);
  });

  it('rejects another owner and inactive tariffs', async () => {
    const { app, db, listingId, tariffId } = await setup();
    expect((await request(app).post(`/api/me/listings/${listingId}/payments`).set('idempotency-key', 'foreign').set(other).send({ tariffId })).status).toBe(404);
    db.prepare('UPDATE tariffs SET active=0 WHERE id=?').run(tariffId);
    const inactive = await createPayment(app, listingId, tariffId, 'inactive'); expect(inactive.status).toBe(400); expect(inactive.body.error.code).toBe('INACTIVE_TARIFF');
    const missing = await createPayment(app, listingId, 999_999, 'missing'); expect(missing.status).toBe(400); expect(missing.body.error.code).toBe('INACTIVE_TARIFF');
  });

  it('enforces ownership across payment, status, demo actions, and submit endpoints', async () => {
    const { app, listingId, tariffId } = await setup(); const created = await createPayment(app, listingId, tariffId, 'owner-boundary');
    expect((await request(app).get(`/api/me/payments/${created.body.data.id}`).set(other)).status).toBe(404);
    expect((await request(app).get(`/api/me/listings/${listingId}/payment-status`).set(other)).status).toBe(404);
    for (const action of ['succeed','fail','cancel']) {
      expect((await request(app).post(`/api/demo-payments/${created.body.data.id}/${action}`).set(other)).status).toBe(404);
    }
    expect((await request(app).post(`/api/me/listings/${listingId}/submit`).set(other)).status).toBe(404);
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
    const unpaid = await request(app).post(`/api/me/listings/${listingId}/submit`).send({ paid: true, amount: 29_900 }); expect(unpaid.status).toBe(402); expect(unpaid.body.error.code).toBe('PAYMENT_REQUIRED');
    const directApprove = await request(app).post(`/api/admin/listings/${listingId}/approve`).set(admin);
    expect(directApprove.status).toBe(409); expect(directApprove.body.error.code).toBe('INVALID_LISTING_STATUS');
    const created = await createPayment(app, listingId, tariffId, 'submit-paid'); await request(app).post(`/api/demo-payments/${created.body.data.id}/succeed`);
    const submitted = await request(app).post(`/api/me/listings/${listingId}/submit`); expect(submitted.body.data.status).toBe('pending_moderation');
    expect((await request(app).get(`/api/listings/${listingId}`)).status).toBe(404);
  });

  it.each([['fail','failed'],['cancel','cancelled']] as const)('preserves a %s attempt before a new paid payment', async (action, failedStatus) => {
    const { app, providers, listingId, tariffId } = await setup();
    const failed = await createPayment(app, listingId, tariffId, `attempt-${action}`);
    await request(app).post(`/api/demo-payments/${failed.body.data.id}/${action}`);
    const paid = await createPayment(app, listingId, tariffId, `retry-${action}`);
    await request(app).post(`/api/demo-payments/${paid.body.data.id}/succeed`);
    expect(paid.body.data.id).not.toBe(failed.body.data.id);
    const attempts = providers.payments.listAll().filter((item) => item.listingId === listingId);
    expect(attempts.map((item) => item.status)).toEqual(expect.arrayContaining([failedStatus, 'paid']));
    expect((await request(app).post(`/api/me/listings/${listingId}/submit`)).body.data.status).toBe('pending_moderation');
  });

  it('uses any successful payment for eligibility even when the latest attempt failed', async () => {
    const { app, providers, listingId, tariffId } = await setup();
    const paid = await createPayment(app, listingId, tariffId, 'eligibility-paid');
    await request(app).post(`/api/demo-payments/${paid.body.data.id}/succeed`);
    const otherTariff = providers.payments.listActiveTariffs().find((item) => item.id !== tariffId)!;
    const later = await createPayment(app, listingId, otherTariff.id, 'eligibility-later-failed');
    await request(app).post(`/api/demo-payments/${later.body.data.id}/fail`);
    expect(providers.payments.latestForListing(listingId)?.status).toBe('failed');
    expect((await request(app).post(`/api/me/listings/${listingId}/submit`)).body.data.status).toBe('pending_moderation');
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
    expect(() => applyPaymentEvent(providers.payments, 'demo', { ...event, status: 'pending', eventId: 'provider-event-3' })).toThrow(/Cannot transition/);
    expect(() => applyPaymentEvent(providers.payments, 'demo', { ...event, status: 'cancelled', eventId: 'provider-event-4' })).toThrow(/Cannot transition/);
    expect(() => applyPaymentEvent(providers.payments, 'demo', { ...event, providerPaymentId: 'unknown', eventId: 'unknown-event' })).toThrow(/Payment not found/);
    expect(providers.payments.get(created.body.data.id)?.status).toBe('paid');
  });

  it.each([['fail','failed'],['cancel','cancelled']] as const)('blocks %s → paid webhook transitions', async (action, expected) => {
    const { app, providers, listingId, tariffId } = await setup(); const created = await createPayment(app, listingId, tariffId, `terminal-${action}`);
    await request(app).post(`/api/demo-payments/${created.body.data.id}/${action}`);
    expect(() => applyPaymentEvent(providers.payments, 'demo', { providerPaymentId: created.body.data.providerPaymentId, status: 'paid', eventId: `illegal-${action}` })).toThrow(/Cannot transition/);
    expect(providers.payments.get(created.body.data.id)?.status).toBe(expected);
  });

  it('protects real admin and keeps demo admin payment views read-only', async () => {
    const { app, listingId, tariffId } = await setup(); const payment = await createPayment(app, listingId, tariffId, 'admin-view');
    expect((await request(app).get('/api/admin/payments')).status).toBe(401);
    expect((await request(app).get('/api/admin/payments').set('x-admin-token', 'wrong')).status).toBe(401);
    expect((await request(app).get('/api/admin/payments').set(admin)).status).toBe(200);
    expect((await request(app).get(`/api/admin/payments/${payment.body.data.id}`).set(admin)).status).toBe(200);
    expect((await request(app).get('/api/demo-admin/payments')).status).toBe(200);
    expect((await request(app).get(`/api/demo-admin/payments/${payment.body.data.id}`)).status).toBe(200);
    expect((await request(app).post('/api/demo-admin/payments/1')).status).toBe(405);
  });

  it('keeps paid eligibility through reject, edit, resubmit, published edit, and archive', async () => {
    const { app, providers, listingId, tariffId } = await setup(); const payment = await createPayment(app, listingId, tariffId, 'lifecycle-paid');
    await request(app).post(`/api/demo-payments/${payment.body.data.id}/succeed`);
    await request(app).post(`/api/me/listings/${listingId}/submit`).expect(200);
    await request(app).post(`/api/admin/listings/${listingId}/reject`).set(admin).send({ reason: 'Добавьте детали состояния кузова.' }).expect(200);
    await request(app).patch(`/api/me/listings/${listingId}`).send({ ...listingInput({ providers } as ReturnType<typeof createTestWorld>), color: 'Синий' }).expect(200);
    await request(app).post(`/api/me/listings/${listingId}/submit`).expect(200);
    await request(app).post(`/api/admin/listings/${listingId}/approve`).set(admin).expect(200);
    const paymentCount = providers.payments.listAll().filter((item) => item.listingId === listingId).length;
    const edited = await request(app).patch(`/api/me/listings/${listingId}`).send({ ...listingInput({ providers } as ReturnType<typeof createTestWorld>), price: 2_600_000 });
    expect(edited.body.data.status).toBe('pending_moderation');
    await request(app).post(`/api/admin/listings/${listingId}/approve`).set(admin).expect(200);
    expect(providers.payments.listAll().filter((item) => item.listingId === listingId)).toHaveLength(paymentCount);
    await request(app).post(`/api/me/listings/${listingId}/archive`).expect(200);
    expect((await request(app).get(`/api/listings/${listingId}`)).status).toBe(404);
    expect((await request(app).delete(`/api/me/listings/${listingId}`)).status).toBe(404);
    expect(providers.payments.get(payment.body.data.id)?.status).toBe('paid');
  });

  it('fails closed for an unconfigured external provider without demo fallback or residual payment', async () => {
    const world = createTestWorld(); const app = createApp(world.providers, storage, world.providers.payments, new ExternalPaymentProvider(), { demoEnabled: false });
    const created = await request(app).post('/api/me/listings').send(listingInput(world)); const listingId = created.body.data.id;
    const tariffId = world.providers.payments.listActiveTariffs()[0]!.id; const before = world.providers.payments.listAll().length;
    const response = await createPayment(app, listingId, tariffId, 'external-unconfigured');
    expect(response.status).toBe(501); expect(response.body.error.code).toBe('PAYMENT_PROVIDER_NOT_CONFIGURED');
    expect(world.providers.payments.listAll()).toHaveLength(before);
    const retry = await createPayment(app, listingId, tariffId, 'external-unconfigured');
    expect(retry.status).toBe(501); expect(retry.body.error.code).toBe('PAYMENT_PROVIDER_NOT_CONFIGURED');
    expect(world.providers.payments.listAll()).toHaveLength(before);
    expect((await request(app).post('/api/demo-payments/1/succeed')).status).toBe(404);
    expect((await request(app).post('/api/payments/webhook/external').send({ malformed: true })).status).toBe(501);
  });

  it('keeps seller payments unauthorized without Telegram auth outside demo mode', async () => {
    const world = createTestWorld(); const app = express(); app.use(express.json());
    app.use('/api', createPaymentsRouter(world.providers, world.providers.payments, new DemoPaymentProvider(), { demoEnabled: false }, createAuthMiddleware({ allowDemoMode: false, telegramBotToken: '' })));
    expect((await request(app).get('/api/me/payments')).status).toBe(401);
    expect((await request(app).post('/api/demo-payments/1/succeed')).status).toBe(401);
  });

  it('disables demo mutation endpoints when the demo guard is off', async () => {
    const world = createTestWorld(); const app = createApp(world.providers, storage, world.providers.payments, new DemoPaymentProvider(), { demoEnabled: false });
    expect((await request(app).post('/api/demo-payments/1/succeed')).status).toBe(404);
    const malformed = await request(app).post('/api/payments/webhook/demo').send({ malformed: true });
    expect(malformed.status).toBe(405); expect(malformed.body.error.code).toBe('DEMO_WEBHOOK_DISABLED');
  });
});
