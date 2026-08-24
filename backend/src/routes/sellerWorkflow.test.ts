import request from 'supertest';
import { describe, expect, it } from 'vitest';
import express from 'express';
import { createHmac } from 'node:crypto';
import { AppError } from '../errors.js';
import type { FileStorage, FileUpload, StoredFile } from '../providers/fileStorage.js';
import { createApp } from '../index.js';
import { createTestWorld } from '../test/harness.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { createSellerListingsRouter } from './sellerListings.js';

class MemoryFileStorage implements FileStorage {
  files = new Map<string, Buffer>();
  async save(file: FileUpload): Promise<StoredFile> {
    if (file.mimeType !== 'image/png' || !file.buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
      throw new AppError('Invalid image file', 400, 'INVALID_IMAGE');
    }
    const key = `memory-${this.files.size}.png`; this.files.set(key, file.buffer);
    return { key, url: `/test/${key}`, mimeType: file.mimeType, sizeBytes: file.buffer.length };
  }
  async delete(key: string): Promise<void> { this.files.delete(key); }
}

const admin = () => ({ 'x-admin-token': 'test-admin-token' });
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const otherUser = () => ({ 'x-telegram-init-data': new URLSearchParams({ user: JSON.stringify({ id: 555002, first_name: 'Другой' }) }).toString() });

function signedInitData(botToken: string, user: object): string {
  const params = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) });
  const pairs: string[] = [];
  params.forEach((value, key) => pairs.push(`${key}=${value}`));
  pairs.sort();
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update(pairs.join('\n')).digest('hex'));
  return params.toString();
}

function sellerApp(allowDemoMode: boolean, telegramBotToken = '') {
  const world = createTestWorld();
  const storage = new MemoryFileStorage();
  const app = express();
  app.use(express.json());
  app.use('/api', createSellerListingsRouter(world.providers, storage, createAuthMiddleware({ allowDemoMode, telegramBotToken })));
  return { ...world, storage, app };
}

function input(providers: ReturnType<typeof createTestWorld>['providers']) {
  const brand = providers.catalog.brands()[0]!;
  const model = providers.catalog.models(brand.slug)[0]!;
  return { brandId: brand.id, modelId: model.id, year: 2021, price: 2_700_000, mileage: 52_000, bodyType: 'sedan', transmission: 'automatic', driveType: 'front', engineType: 'petrol', engineVolume: 2, color: 'Синий', city: 'Москва', description: 'Автомобиль в хорошем состоянии с регулярным техническим обслуживанием.' };
}

async function createDraft() {
  const world = createTestWorld(); const storage = new MemoryFileStorage(); const app = createApp(world.providers, storage);
  const created = await request(app).post('/api/me/listings').send(input(world.providers));
  return { ...world, storage, app, id: Number(created.body.data.id) };
}

describe('seller listing workflow', () => {
  it('lets the browser demo customer create a draft and list own listings', async () => {
    const { app, id } = await createDraft();
    const response = await request(app).get('/api/me/listings');
    expect(response.status).toBe(200);
    expect(response.body.data.some((item: { id: number; status: string }) => item.id === id && item.status === 'draft')).toBe(true);
  });

  it('lets the browser demo customer submit an owned listing', async () => {
    const { app, id, providers } = await createDraft();
    providers.sellerListings.addPhoto(id, { url: '/images/cars/car-1.svg', storageKey: 'seed', mimeType: 'image/png', sizeBytes: 10 });
    const response = await request(app).post(`/api/me/listings/${id}/submit`);
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('pending_moderation');
  });

  it('rejects a browser request when demo mode is disabled', async () => {
    const { app, providers } = sellerApp(false);
    const response = await request(app).post('/api/me/listings').send(input(providers));
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts valid signed Telegram auth when demo mode is disabled', async () => {
    const token = '123456:PRODUCTION_TEST_TOKEN';
    const { app, providers } = sellerApp(false, token);
    const initData = signedInitData(token, { id: 88001, first_name: 'Telegram', username: 'telegram_user' });
    const created = await request(app).post('/api/me/listings').set('x-telegram-init-data', initData).send(input(providers));
    expect(created.status).toBe(201);
    const listings = await request(app).get('/api/me/listings').set('x-telegram-init-data', initData);
    expect(listings.status).toBe(200);
    expect(listings.body.data).toHaveLength(1);
  });

  it('does not expose another customer listing through /api/me', async () => {
    const { app, id } = await createDraft();
    expect((await request(app).get(`/api/me/listings/${id}`).set(otherUser())).status).toBe(404);
  });

  it('updates an owned draft', async () => {
    const { app, id, providers } = await createDraft();
    const response = await request(app).patch(`/api/me/listings/${id}`).send({ ...input(providers), price: 2_950_000 });
    expect(response.status).toBe(200);
    expect(response.body.data.price).toBe(2_950_000);
  });

  it('submits to moderation and rejects invalid lifecycle updates', async () => {
    const { app, id, providers } = await createDraft();
    providers.sellerListings.addPhoto(id, { url: '/images/cars/car-1.svg', storageKey: 'seed', mimeType: 'image/png', sizeBytes: 10 });
    const submitted = await request(app).post(`/api/me/listings/${id}/submit`);
    expect(submitted.body.data.status).toBe('pending_moderation');
    expect((await request(app).get(`/api/listings/${id}`)).status).toBe(404);
    expect((await request(app).patch(`/api/me/listings/${id}`).send(input(providers))).status).toBe(409);
  });

  it('publishes only after admin approval', async () => {
    const { app, id, providers } = await createDraft();
    providers.sellerListings.addPhoto(id, { url: '/images/cars/car-1.svg', storageKey: 'seed', mimeType: 'image/png', sizeBytes: 10 });
    await request(app).post(`/api/me/listings/${id}/submit`);
    const approved = await request(app).post(`/api/admin/listings/${id}/approve`).set(admin());
    expect(approved.body.data.status).toBe('published');
    expect((await request(app).get(`/api/listings/${id}`)).status).toBe(200);
  });

  it('stores rejection reason and allows edit plus resubmit', async () => {
    const { app, id, providers } = await createDraft();
    providers.sellerListings.addPhoto(id, { url: '/images/cars/car-1.svg', storageKey: 'seed', mimeType: 'image/png', sizeBytes: 10 });
    await request(app).post(`/api/me/listings/${id}/submit`);
    await request(app).post(`/api/admin/listings/${id}/reject`).set(admin()).send({ reason: 'Добавьте фотографию салона.' });
    const owner = await request(app).get(`/api/me/listings/${id}`);
    expect(owner.body.data.status).toBe('rejected');
    expect(owner.body.data.moderationHistory.some((event: { reason: string }) => event.reason === 'Добавьте фотографию салона.')).toBe(true);
    await request(app).patch(`/api/me/listings/${id}`).send({ ...input(providers), color: 'Белый' }).expect(200);
    expect((await request(app).post(`/api/me/listings/${id}/submit`)).body.data.status).toBe('pending_moderation');
  });

  it('archives a published listing and removes it from public catalog', async () => {
    const { app, id, providers } = await createDraft();
    providers.sellerListings.addPhoto(id, { url: '/images/cars/car-1.svg', storageKey: 'seed', mimeType: 'image/png', sizeBytes: 10 });
    await request(app).post(`/api/me/listings/${id}/submit`);
    await request(app).post(`/api/admin/listings/${id}/approve`).set(admin());
    expect((await request(app).post(`/api/me/listings/${id}/archive`)).body.data.status).toBe('archived');
    expect((await request(app).get(`/api/listings/${id}`)).status).toBe(404);
  });

  it('validates uploaded image MIME and content', async () => {
    const { app, id, storage } = await createDraft();
    expect((await request(app).post(`/api/me/listings/${id}/photos`).attach('photos', png, { filename: 'file.txt', contentType: 'text/plain' })).status).toBe(400);
    expect((await request(app).post(`/api/me/listings/${id}/photos`).attach('photos', Buffer.from('not png'), { filename: 'fake.png', contentType: 'image/png' })).status).toBe(400);
    expect((await request(app).post(`/api/me/listings/${id}/photos`).attach('photos', png, { filename: '../../unsafe.png', contentType: 'image/png' })).status).toBe(201);
    expect(storage.files.size).toBe(1);
  });

  it('requires admin auth and keeps demo admin writes read-only', async () => {
    const { app, id } = await createDraft();
    expect((await request(app).post(`/api/admin/listings/${id}/approve`)).status).toBe(401);
    const demoWrite = await request(app).post(`/api/demo-admin/listings/${id}/approve`);
    expect(demoWrite.status).toBe(405);
    expect(demoWrite.body.error.code).toBe('DEMO_ADMIN_READ_ONLY');
  });
});
