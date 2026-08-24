import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { createTestWorld } from '../test/harness.js';

const admin = () => ({ 'x-admin-token': 'test-admin-token' });

describe('automotive public catalog', () => {
  it('returns only published listings and listing details', async () => {
    const { providers } = createTestWorld();
    const app = createApp(providers);
    const catalog = await request(app).get('/api/listings');
    expect(catalog.status).toBe(200);
    expect(catalog.body.data.length).toBeGreaterThanOrEqual(14);
    expect(catalog.body.data.every((item: { status: string }) => item.status === 'published')).toBe(true);
    const detail = await request(app).get(`/api/listings/${catalog.body.data[0].id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.photos.length).toBeGreaterThan(0);
  });

  it.each([
    ['brand', 'toyota', (x: { brand: { slug: string } }) => x.brand.slug === 'toyota'],
    ['priceMax', '2000000', (x: { price: number }) => x.price <= 2_000_000],
    ['yearMin', '2022', (x: { year: number }) => x.year >= 2022],
    ['bodyType', 'hatchback', (x: { bodyType: string }) => x.bodyType === 'hatchback'],
  ])('applies %s filter', async (key, value, predicate) => {
    const app = createApp(createTestWorld().providers);
    const response = await request(app).get('/api/listings').query({ [key]: value });
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every(predicate)).toBe(true);
  });

  it('sorts catalog', async () => {
    const app = createApp(createTestWorld().providers);
    const response = await request(app).get('/api/listings?sort=price_asc');
    const prices = response.body.data.map((item: { price: number }) => item.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('keeps favorites idempotent in browser demo mode', async () => {
    const app = createApp(createTestWorld().providers);
    const first = await request(app).post('/api/listings/1/favorite');
    const second = await request(app).post('/api/listings/1/favorite');
    expect(first.body.data.created).toBe(true);
    expect(second.body.data.created).toBe(false);
    const favorites = await request(app).get('/api/me/favorites');
    expect(favorites.body.data).toHaveLength(1);
  });

  it('returns a structured 404 for an unknown listing', async () => {
    const app = createApp(createTestWorld().providers);
    const response = await request(app).get('/api/listings/99999');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('automotive admin', () => {
  it('requires an admin token', async () => {
    const response = await request(createApp(createTestWorld().providers)).get('/api/admin/listings');
    expect(response.status).toBe(401);
  });

  it('shows all statuses to authorized admin', async () => {
    const response = await request(createApp(createTestWorld().providers)).get('/api/admin/listings').set(admin());
    expect(response.status).toBe(200);
    expect(response.body.data.some((item: { status: string }) => item.status === 'pending_moderation')).toBe(true);
  });

  it('keeps demo admin read-only', async () => {
    const app = createApp(createTestWorld().providers);
    expect((await request(app).get('/api/demo-admin/listings')).status).toBe(200);
    const write = await request(app).post('/api/demo-admin/listings/1').send({ status: 'published' });
    expect(write.status).toBe(405);
    expect(write.body.error.code).toBe('DEMO_ADMIN_READ_ONLY');
  });
});
