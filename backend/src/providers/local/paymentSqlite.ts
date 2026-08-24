import type Database from 'better-sqlite3';
import type { NormalizedPaymentEvent, Payment, PaymentDetails, PaymentEvent, PaymentRepository, PaymentStatus, Tariff } from '../../payments.js';

type Row = Record<string, unknown>;
const nowIso = () => new Date().toISOString();
const json = (value: unknown): Record<string, unknown> | null => value ? JSON.parse(String(value)) as Record<string, unknown> : null;

function mapTariff(row: Row): Tariff {
  return { id: Number(row.id), code: String(row.code), name: String(row.name), description: String(row.description),
    priceMinor: Number(row.price_minor), currency: String(row.currency), durationDays: Number(row.duration_days),
    active: Boolean(row.active), displayOrder: Number(row.display_order), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapPayment(row: Row): Payment {
  return { id: Number(row.id), customerId: Number(row.customer_id), listingId: Number(row.listing_id), tariffId: Number(row.tariff_id),
    provider: String(row.provider), providerPaymentId: (row.provider_payment_id as string | null) ?? null,
    amountMinor: Number(row.amount_minor), currency: String(row.currency), status: row.status as PaymentStatus,
    confirmationUrl: (row.confirmation_url as string | null) ?? null, idempotencyKey: String(row.idempotency_key),
    providerPayload: json(row.provider_payload), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    paidAt: (row.paid_at as string | null) ?? null, failedAt: (row.failed_at as string | null) ?? null,
    cancelledAt: (row.cancelled_at as string | null) ?? null };
}
function mapEvent(row: Row): PaymentEvent {
  return { id: Number(row.id), paymentId: Number(row.payment_id), provider: String(row.provider), providerEventId: String(row.provider_event_id),
    status: row.status as PaymentStatus, metadata: json(row.metadata), createdAt: String(row.created_at) };
}

export function createPaymentRepository(database: Database.Database): PaymentRepository {
  const get = (id: number) => { const row = database.prepare('SELECT * FROM payments WHERE id=?').get(id) as Row | undefined; return row ? mapPayment(row) : undefined; };
  const events = (id: number) => (database.prepare('SELECT * FROM payment_events WHERE payment_id=? ORDER BY created_at,id').all(id) as Row[]).map(mapEvent);
  const details = (payment: Payment): PaymentDetails => ({ ...payment, tariff: mapTariff(database.prepare('SELECT * FROM tariffs WHERE id=?').get(payment.tariffId) as Row), events: events(payment.id) });
  return {
    listActiveTariffs: () => (database.prepare('SELECT * FROM tariffs WHERE active=1 ORDER BY display_order,id').all() as Row[]).map(mapTariff),
    getTariff(id) { const row = database.prepare('SELECT * FROM tariffs WHERE id=?').get(id) as Row | undefined; return row ? mapTariff(row) : undefined; },
    create(input) {
      const at = nowIso();
      const result = database.prepare(`INSERT INTO payments
        (customer_id,listing_id,tariff_id,provider,amount_minor,currency,status,idempotency_key,created_at,updated_at)
        VALUES (?,?,?,?,?,?,'pending',?,?,?)`).run(input.customerId, input.listingId, input.tariffId, input.provider, input.amountMinor, input.currency, input.idempotencyKey, at, at);
      return get(Number(result.lastInsertRowid))!;
    },
    attachProvider(id, providerPaymentId, confirmationUrl, payload) {
      database.prepare('UPDATE payments SET provider_payment_id=?,confirmation_url=?,provider_payload=?,updated_at=? WHERE id=?')
        .run(providerPaymentId, confirmationUrl, payload ? JSON.stringify(payload) : null, nowIso(), id);
      return get(id)!;
    },
    removePending(id) { return database.prepare("DELETE FROM payments WHERE id=? AND status='pending' AND provider_payment_id IS NULL").run(id).changes > 0; },
    get,
    getDetails(id) { const payment = get(id); return payment ? details(payment) : undefined; },
    getByIdempotencyKey(key) { const row = database.prepare('SELECT * FROM payments WHERE idempotency_key=?').get(key) as Row | undefined; return row ? mapPayment(row) : undefined; },
    getByProviderPaymentId(provider, providerPaymentId) { const row = database.prepare('SELECT * FROM payments WHERE provider=? AND provider_payment_id=?').get(provider, providerPaymentId) as Row | undefined; return row ? mapPayment(row) : undefined; },
    listByCustomer(customerId) { return (database.prepare('SELECT * FROM payments WHERE customer_id=? ORDER BY created_at DESC,id DESC').all(customerId) as Row[]).map(mapPayment).map(details); },
    listAll(status) {
      const rows = status ? database.prepare('SELECT * FROM payments WHERE status=? ORDER BY created_at DESC,id DESC').all(status) : database.prepare('SELECT * FROM payments ORDER BY created_at DESC,id DESC').all();
      return (rows as Row[]).map(mapPayment).map(details);
    },
    latestForListing(listingId) { const row = database.prepare('SELECT * FROM payments WHERE listing_id=? ORDER BY created_at DESC,id DESC LIMIT 1').get(listingId) as Row | undefined; return row ? details(mapPayment(row)) : undefined; },
    paidForListing(listingId) { const row = database.prepare("SELECT * FROM payments WHERE listing_id=? AND status='paid' ORDER BY paid_at DESC,id DESC LIMIT 1").get(listingId) as Row | undefined; return row ? mapPayment(row) : undefined; },
    addEvent(paymentId, provider, event: NormalizedPaymentEvent) {
      const existing = database.prepare('SELECT * FROM payment_events WHERE provider=? AND provider_event_id=?').get(provider, event.eventId) as Row | undefined;
      if (existing) return { event: mapEvent(existing), created: false };
      const result = database.prepare('INSERT INTO payment_events (payment_id,provider,provider_event_id,status,metadata) VALUES (?,?,?,?,?)')
        .run(paymentId, provider, event.eventId, event.status, event.metadata ? JSON.stringify(event.metadata) : null);
      return { event: mapEvent(database.prepare('SELECT * FROM payment_events WHERE id=?').get(result.lastInsertRowid) as Row), created: true };
    },
    transition(id, from, to) {
      const at = nowIso();
      const timestampColumn = to === 'paid' ? 'paid_at' : to === 'failed' ? 'failed_at' : 'cancelled_at';
      const result = database.prepare(`UPDATE payments SET status=?,updated_at=?,${timestampColumn}=? WHERE id=? AND status=?`).run(to, at, at, id, from);
      if (!result.changes) return get(id)!;
      return get(id)!;
    },
  };
}
