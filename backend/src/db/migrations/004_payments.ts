import type Database from 'better-sqlite3';

export function applyPaymentsSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE tariffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_minor INTEGER NOT NULL CHECK(price_minor >= 0),
      currency TEXT NOT NULL,
      duration_days INTEGER NOT NULL CHECK(duration_days > 0),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      listing_id INTEGER NOT NULL REFERENCES listings(id),
      tariff_id INTEGER NOT NULL REFERENCES tariffs(id),
      provider TEXT NOT NULL,
      provider_payment_id TEXT,
      amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
      currency TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','paid','failed','cancelled')),
      confirmation_url TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      provider_payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      failed_at TEXT,
      cancelled_at TEXT
    );

    CREATE TABLE payment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_event_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','paid','failed','cancelled')),
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider, provider_event_id)
    );

    CREATE INDEX idx_payments_listing ON payments(listing_id, created_at DESC);
    CREATE INDEX idx_payments_customer ON payments(customer_id, created_at DESC);
    CREATE INDEX idx_payments_status ON payments(status, created_at DESC);
    CREATE UNIQUE INDEX idx_payments_provider_id ON payments(provider, provider_payment_id)
      WHERE provider_payment_id IS NOT NULL;
    CREATE INDEX idx_payment_events_payment ON payment_events(payment_id, created_at DESC);
  `);
}
