import { describe, expect, it } from 'vitest';
import { paymentState } from './payment';
import type { Payment, PaymentStatus } from '../types';

const payment = (status: PaymentStatus) => ({ status } as Payment);

describe('payment state presentation', () => {
  it.each([
    [null, 'Тариф не выбран', 'choose'],
    [payment('pending'), 'Ожидает оплаты', 'checkout'],
    [payment('paid'), 'Оплачено', 'submit'],
    [payment('failed'), 'Ошибка оплаты', 'retry'],
    [payment('cancelled'), 'Оплата отменена', 'retry'],
  ])('maps payment state to a clear CTA', (value, label, action) => {
    expect(paymentState(value as Payment | null)).toEqual({ label, action });
  });
});
