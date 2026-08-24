import { describe, expect, it } from 'vitest';
import {
  behaviorDelta,
  clampLeadScore,
  composeLeadScore,
  DEFAULT_SCORING_WEIGHTS,
  profileScoreFromBuyer,
  temperatureFromScore,
} from './scoring.js';

describe('lead scoring', () => {
  it('scores a ready cash buyer from profile signals', () => {
    const result = profileScoreFromBuyer({
      purchaseTiming: 'now',
      payment: 'cash',
      mortgageStatus: null,
    });
    expect(result.points).toBe(45);
    expect(result.events.map((event) => event.eventType)).toEqual(['purchase_now', 'cash']);
  });

  it('adds mortgage approval for a near-term buyer', () => {
    const result = profileScoreFromBuyer({
      purchaseTiming: '1_3_months',
      payment: 'mortgage',
      mortgageStatus: 'approved',
    });
    expect(result.points).toBe(30);
    expect(result.events.map((event) => event.eventType)).toEqual([
      'purchase_1_3_months',
      'mortgage_approved',
    ]);
  });

  it('applies documented behavior deltas', () => {
    expect(behaviorDelta('property_viewed')?.delta).toBe(2);
    expect(behaviorDelta('property_revisited')?.delta).toBe(4);
    expect(behaviorDelta('property_favorited')?.delta).toBe(7);
    expect(behaviorDelta('payment_calculated')?.delta).toBe(5);
    expect(behaviorDelta('viewing_requested')?.delta).toBe(25);
    expect(behaviorDelta('manager_contact_requested')?.delta).toBe(30);
    expect(behaviorDelta('qualification_started')).toBeNull();
  });

  it('clamps the combined score at 100', () => {
    const result = composeLeadScore(80, 90);
    expect(result.score).toBe(100);
    expect(result.temperature).toBe('HOT');
  });

  it('maps HOT / WARM / COLD thresholds', () => {
    expect(temperatureFromScore(0)).toBe('COLD');
    expect(temperatureFromScore(39)).toBe('COLD');
    expect(temperatureFromScore(40)).toBe('WARM');
    expect(temperatureFromScore(69)).toBe('WARM');
    expect(temperatureFromScore(70)).toBe('HOT');
    expect(temperatureFromScore(100)).toBe('HOT');
  });

  it('keeps clampLeadScore inside 0–100', () => {
    expect(clampLeadScore(-12)).toBe(0);
    expect(clampLeadScore(140)).toBe(100);
    expect(DEFAULT_SCORING_WEIGHTS.viewingRequested).toBe(25);
  });
});
