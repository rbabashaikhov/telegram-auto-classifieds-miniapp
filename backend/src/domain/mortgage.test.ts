import { describe, expect, it } from 'vitest';
import { calculateMortgage } from './mortgage.js';

describe('mortgage calculator', () => {
  it('computes an approximate annuity payment', () => {
    const result = calculateMortgage({
      price: 20_000_000,
      downPayment: 4_000_000,
      annualRatePercent: 16,
      termYears: 20,
    });
    expect(result.loanAmount).toBe(16_000_000);
    expect(result.monthlyPayment).toBeGreaterThan(200_000);
    expect(result.monthlyPayment).toBeLessThan(230_000);
  });
});
