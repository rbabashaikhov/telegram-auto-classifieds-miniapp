import type { Payment } from '../types';

export function paymentState(payment: Payment | null): { label: string; action: 'choose' | 'checkout' | 'retry' | 'submit' | 'none' } {
  if (!payment) return { label: 'Тариф не выбран', action: 'choose' };
  if (payment.status === 'pending') return { label: 'Ожидает оплаты', action: 'checkout' };
  if (payment.status === 'paid') return { label: 'Оплачено', action: 'submit' };
  if (payment.status === 'failed') return { label: 'Ошибка оплаты', action: 'retry' };
  return { label: 'Оплата отменена', action: 'retry' };
}

export function formatMoneyMinor(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100);
}
