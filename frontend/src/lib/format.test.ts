import { describe, expect, it } from 'vitest';
import { formatPrice, roomsLabel } from './format';

describe('format helpers', () => {
  it('formats RUB prices', () => {
    expect(formatPrice(18900000)).toContain('18');
    expect(formatPrice(18900000)).toContain('₽');
  });

  it('maps room codes', () => {
    expect(roomsLabel('2')).toBe('2-комн.');
    expect(roomsLabel('studio')).toBe('Студия');
  });
});
