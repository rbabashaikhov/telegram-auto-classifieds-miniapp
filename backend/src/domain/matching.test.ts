import { describe, expect, it } from 'vitest';
import type { FeatureCode, Property, PropertyProject } from '../types.js';
import {
  DEFAULT_MATCHING_WEIGHTS,
  matchProperty,
  rankMatches,
  type MatchableProfile,
  type MatchableProperty,
} from './matching.js';

const NOW = new Date('2026-08-18T12:00:00');

function project(overrides: Partial<PropertyProject> = {}): PropertyProject {
  return {
    id: 1,
    slug: 'severnaya-gavan',
    name: 'Северная Гавань',
    district: 'primorsky',
    address: 'Приморский пр., 12',
    description: '',
    propertyType: 'new_build',
    completionDate: '2026-04-01',
    imageUrl: '',
    gallery: [],
    features: ['near_metro', 'parking'],
    active: true,
    displayOrder: 1,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: 10,
    projectId: 1,
    unitNumber: '42',
    rooms: '2',
    roomsCount: 2,
    area: 68,
    floor: 12,
    floorsTotal: 18,
    price: 18_500_000,
    finish: 'finished',
    status: 'available',
    completionDate: '2026-04-01',
    gallery: [],
    description: '',
    active: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function profile(overrides: Partial<MatchableProfile> = {}): MatchableProfile {
  return {
    propertyType: 'new_build',
    locations: ['primorsky'],
    budgetMin: 15_000_000,
    budgetMax: 22_000_000,
    rooms: '2',
    purchaseTiming: '1_3_months',
    preferences: ['finished', 'parking', 'near_metro'],
    areaMin: 60,
    areaMax: 80,
    ...overrides,
  };
}

function item(overrides?: {
  property?: Partial<Property>;
  project?: Partial<PropertyProject>;
  featureCodes?: FeatureCode[];
}): MatchableProperty {
  return {
    property: property(overrides?.property),
    project: project(overrides?.project),
    featureCodes: overrides?.featureCodes ?? ['parking', 'near_metro', 'balcony', 'high_floor'],
  };
}

describe('property matching', () => {
  it('scores a strong match near 100 with explicit reasons', () => {
    const result = matchProperty(profile(), item(), DEFAULT_MATCHING_WEIGHTS, NOW, 7);
    expect(result.buyerProfileId).toBe(7);
    expect(result.propertyId).toBe(10);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBeLessThanOrEqual(100);
    const labels = result.reasons.map((reason) => reason.label);
    expect(labels).toContain('входит в бюджет');
    expect(labels).toContain('нужный район');
    expect(labels).toContain('2 комнаты');
    expect(labels).toContain('готовая отделка');
  });

  it('treats budget upper bound as inclusive', () => {
    const result = matchProperty(
      profile({ budgetMax: 18_500_000 }),
      item(),
      DEFAULT_MATCHING_WEIGHTS,
      NOW,
    );
    expect(result.reasons.find((reason) => reason.code === 'budget')?.kind).toBe('match');
    expect(result.reasons.find((reason) => reason.code === 'budget')?.points).toBe(30);
  });

  it('treats budget lower bound as inclusive', () => {
    const result = matchProperty(
      profile({ budgetMin: 18_500_000 }),
      item(),
      DEFAULT_MATCHING_WEIGHTS,
      NOW,
    );
    expect(result.reasons.find((reason) => reason.code === 'budget')?.kind).toBe('match');
  });

  it('soft-penalizes a price just above budget', () => {
    const result = matchProperty(
      profile({ budgetMax: 18_000_000 }),
      item({ property: { price: 19_000_000 } }),
      DEFAULT_MATCHING_WEIGHTS,
      NOW,
    );
    const budget = result.reasons.find((reason) => reason.code === 'budget');
    expect(budget?.kind).toBe('partial');
    expect(budget?.points).toBe(15);
  });

  it('zeros budget points far outside the range', () => {
    const result = matchProperty(
      profile({ budgetMin: 8_000_000, budgetMax: 10_000_000 }),
      item({ property: { price: 25_000_000 } }),
      DEFAULT_MATCHING_WEIGHTS,
      NOW,
    );
    expect(result.reasons.find((reason) => reason.code === 'budget')?.points).toBe(0);
  });

  it('warns when area is slightly below the desired range', () => {
    const result = matchProperty(
      profile({ areaMin: 70 }),
      item({ property: { area: 65 } }),
      DEFAULT_MATCHING_WEIGHTS,
      NOW,
    );
    const area = result.reasons.find((reason) => reason.code === 'area');
    expect(area?.label).toBe('площадь немного меньше желаемой');
    expect(area?.kind).toBe('partial');
  });

  it('ranks better matches first', () => {
    const ranked = rankMatches(
      profile(),
      [
        item({ property: { id: 1, price: 40_000_000, rooms: 'studio' } }),
        item({ property: { id: 2 } }),
        item({
          property: { id: 3, rooms: '1', price: 19_000_000 },
          project: { district: 'central' },
        }),
      ],
      DEFAULT_MATCHING_WEIGHTS,
      NOW,
    );
    expect(ranked[0]?.propertyId).toBe(2);
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it('allows replacing matching weights', () => {
    const weights = { ...DEFAULT_MATCHING_WEIGHTS, budget: 0, location: 0, rooms: 0, propertyType: 0, moveIn: 0, features: 100 };
    const result = matchProperty(
      profile({ preferences: ['parking'] }),
      item({ featureCodes: ['parking'] }),
      weights,
      NOW,
    );
    expect(result.score).toBe(100);
  });
});
