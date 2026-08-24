import { randomUUID } from 'node:crypto';
import type { AutomotiveProviders, Listing } from '../automotive.js';
import { AppError } from '../errors.js';
import type { NormalizedPaymentEvent, PaymentDetails, PaymentProvider, PaymentRepository, PaymentStatus } from '../payments.js';

function ownListing(data: AutomotiveProviders, customerId: number, listingId: number): Listing {
  const listing = data.sellerListings.getByOwner(listingId, customerId);
  if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
  return listing;
}

function ownPayment(payments: PaymentRepository, customerId: number, id: number): PaymentDetails {
  const payment = payments.getDetails(id);
  if (!payment || payment.customerId !== customerId) throw new AppError('Payment not found', 404, 'NOT_FOUND');
  return payment;
}

export async function createListingPayment(input: {
  data: AutomotiveProviders; payments: PaymentRepository; provider: PaymentProvider; customerId: number;
  listingId: number; tariffId: number; idempotencyKey?: string;
}): Promise<PaymentDetails> {
  const listing = ownListing(input.data, input.customerId, input.listingId);
  if (!['draft', 'rejected'].includes(listing.status)) throw new AppError('Listing cannot be paid in its current status', 409, 'INVALID_LISTING_STATUS');
  const tariff = input.payments.getTariff(input.tariffId);
  if (!tariff || !tariff.active) throw new AppError('Tariff is not active', 400, 'INACTIVE_TARIFF');
  const existingPaid = input.payments.paidForListing(listing.id);
  if (existingPaid && existingPaid.tariffId === tariff.id) return input.payments.getDetails(existingPaid.id)!;
  const key = input.idempotencyKey?.trim() || randomUUID();
  const duplicate = input.payments.getByIdempotencyKey(key);
  if (duplicate) {
    if (duplicate.customerId !== input.customerId || duplicate.listingId !== listing.id || duplicate.tariffId !== tariff.id) {
      throw new AppError('Idempotency key is already used for another request', 409, 'IDEMPOTENCY_CONFLICT');
    }
    return input.payments.getDetails(duplicate.id)!;
  }
  const payment = input.payments.create({ customerId: input.customerId, listingId: listing.id, tariffId: tariff.id,
    provider: input.provider.name, amountMinor: tariff.priceMinor, currency: tariff.currency, idempotencyKey: key });
  try {
    const providerResult = await input.provider.createPayment({ paymentId: payment.id, amountMinor: tariff.priceMinor,
      currency: tariff.currency, description: `${tariff.name}: ${listing.brand.name} ${listing.model.name}` });
    input.payments.attachProvider(payment.id, providerResult.providerPaymentId, providerResult.confirmationUrl, providerResult.payload);
    return input.payments.getDetails(payment.id)!;
  } catch (error) {
    input.payments.removePending(payment.id);
    throw error;
  }
}

export function paymentStatusForListing(data: AutomotiveProviders, payments: PaymentRepository, customerId: number, listingId: number) {
  ownListing(data, customerId, listingId);
  return payments.latestForListing(listingId) ?? null;
}

export function transitionPayment(payments: PaymentRepository, paymentId: number, customerId: number, status: Exclude<PaymentStatus, 'pending'>, eventId = randomUUID()) {
  const payment = ownPayment(payments, customerId, paymentId);
  const added = payments.addEvent(payment.id, payment.provider, { providerPaymentId: payment.providerPaymentId ?? String(payment.id), status, eventId, metadata: { source: 'demo-action' } });
  if (!added.created) return payments.getDetails(payment.id)!;
  if (payment.status !== 'pending') throw new AppError(`Cannot transition payment from ${payment.status} to ${status}`, 409, 'INVALID_PAYMENT_TRANSITION');
  payments.transition(payment.id, 'pending', status);
  return payments.getDetails(payment.id)!;
}

export function applyPaymentEvent(payments: PaymentRepository, provider: string, event: NormalizedPaymentEvent) {
  const payment = payments.getByProviderPaymentId(provider, event.providerPaymentId);
  if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  const added = payments.addEvent(payment.id, provider, event);
  if (!added.created) return payments.getDetails(payment.id)!;
  if (event.status === 'pending' && payment.status === 'pending') return payments.getDetails(payment.id)!;
  if (payment.status !== 'pending' || event.status === 'pending') {
    throw new AppError(`Cannot transition payment from ${payment.status} to ${event.status}`, 409, 'INVALID_PAYMENT_TRANSITION');
  }
  payments.transition(payment.id, 'pending', event.status);
  return payments.getDetails(payment.id)!;
}
