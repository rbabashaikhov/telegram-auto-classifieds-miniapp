import { describe, expect, it } from 'vitest';
import type { Listing, SellerListing } from '../types';
import { automotiveDemoTour } from './autoTour';
import { resolveTourPath, type AutomotiveTourReader } from './navigation';

function reader(calls: string[]): AutomotiveTourReader {
  return {
    getListings: async () => {
      calls.push('GET /api/listings');
      return [{ id: 41 }] as Listing[];
    },
    getMyListings: async () => {
      calls.push('GET /api/me/listings');
      return [{ id: 73, status: 'draft', photos: [{ id: 1 }] }] as SellerListing[];
    },
  };
}

describe('automotive guided tour navigation', () => {
  it('moves through the live catalog, seller, editor and demo-admin routes', async () => {
    const calls: string[] = [];
    const api = reader(calls);
    const paths = [];
    for (const step of automotiveDemoTour.steps) {
      paths.push(step.action ? await resolveTourPath(step.action, api) : step.route);
    }
    expect(paths).toEqual([
      '/',
      '/',
      '/listings/41',
      '/my/listings',
      '/my/listings/73/edit?tourStep=details',
      '/my/listings/73/edit?tourStep=preview',
      '/my/listings/73/edit?tourStep=payment',
      '/my/listings',
      '/demo/admin',
    ]);
  });

  it('uses only read APIs and never creates tour business records', async () => {
    const calls: string[] = [];
    const api = reader(calls);
    for (const step of automotiveDemoTour.steps) {
      if (step.action) await resolveTourPath(step.action, api);
    }
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => call.startsWith('GET '))).toBe(true);
    expect(calls).not.toContain('POST');
  });
});
