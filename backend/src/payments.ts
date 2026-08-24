export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Tariff {
  id: number; code: string; name: string; description: string; priceMinor: number; currency: string;
  durationDays: number; active: boolean; displayOrder: number; createdAt: string; updatedAt: string;
}

export interface PaymentEvent {
  id: number; paymentId: number; provider: string; providerEventId: string; status: PaymentStatus;
  metadata: Record<string, unknown> | null; createdAt: string;
}

export interface Payment {
  id: number; customerId: number; listingId: number; tariffId: number; provider: string;
  providerPaymentId: string | null; amountMinor: number; currency: string; status: PaymentStatus;
  confirmationUrl: string | null; idempotencyKey: string; providerPayload: Record<string, unknown> | null;
  createdAt: string; updatedAt: string; paidAt: string | null; failedAt: string | null; cancelledAt: string | null;
}

export interface PaymentDetails extends Payment { tariff: Tariff; events: PaymentEvent[] }

export interface NormalizedPaymentEvent {
  providerPaymentId: string;
  status: PaymentStatus;
  eventId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentRepository {
  listActiveTariffs(): Tariff[];
  getTariff(id: number): Tariff | undefined;
  create(input: { customerId: number; listingId: number; tariffId: number; provider: string; amountMinor: number; currency: string; idempotencyKey: string }): Payment;
  attachProvider(id: number, providerPaymentId: string | null, confirmationUrl: string | null, payload?: Record<string, unknown>): Payment;
  removePending(id: number): boolean;
  get(id: number): Payment | undefined;
  getDetails(id: number): PaymentDetails | undefined;
  getByIdempotencyKey(key: string): Payment | undefined;
  getByProviderPaymentId(provider: string, providerPaymentId: string): Payment | undefined;
  listByCustomer(customerId: number): PaymentDetails[];
  listAll(status?: PaymentStatus): PaymentDetails[];
  latestForListing(listingId: number): PaymentDetails | undefined;
  paidForListing(listingId: number): Payment | undefined;
  addEvent(paymentId: number, provider: string, event: NormalizedPaymentEvent): { event: PaymentEvent; created: boolean };
  transition(id: number, from: PaymentStatus, to: PaymentStatus): Payment;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: { paymentId: number; amountMinor: number; currency: string; description: string }): Promise<{
    providerPaymentId: string | null; confirmationUrl: string | null; payload?: Record<string, unknown>;
  }>;
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>;
  handleWebhook(payload: unknown, headers: Record<string, string | string[] | undefined>): Promise<NormalizedPaymentEvent>;
}
