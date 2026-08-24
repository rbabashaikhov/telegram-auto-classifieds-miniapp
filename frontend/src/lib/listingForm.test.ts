import { describe, expect, it } from 'vitest';
import { validateListingStep } from './listingForm';
import type { ListingInput } from '../types';

const valid: ListingInput = { brandId: 1, modelId: 1, year: 2024, price: 2_000_000, mileage: 20_000, bodyType: 'sedan', transmission: 'automatic', driveType: 'front', engineType: 'petrol', engineVolume: 2, color: 'Белый', city: 'Москва', description: 'Подробное описание автомобиля для публикации.' };

describe('listing form validation', () => {
  it('accepts valid steps', () => { expect([0,1,2].map((step) => validateListingStep(step, valid, 2026))).toEqual(['','','']); });
  it('rejects incomplete vehicle and sale data', () => {
    expect(validateListingStep(0, { ...valid, modelId: 0 }, 2026)).not.toBe('');
    expect(validateListingStep(2, { ...valid, description: 'Коротко' }, 2026)).not.toBe('');
  });
});
