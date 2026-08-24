import type Database from 'better-sqlite3';

export function applySellerWorkflowSchema(database: Database.Database): void {
  database.exec(`
    ALTER TABLE listing_photos ADD COLUMN storage_key TEXT;
    ALTER TABLE listing_photos ADD COLUMN mime_type TEXT;
    ALTER TABLE listing_photos ADD COLUMN size_bytes INTEGER;

    CREATE TABLE listing_moderation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK(action IN ('submitted','approved','rejected','archived','reopened')),
      reason TEXT,
      admin_identifier TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_listings_owner ON listings(user_id, updated_at DESC);
    CREATE INDEX idx_listings_status_updated ON listings(status, updated_at DESC);
    CREATE INDEX idx_moderation_listing ON listing_moderation_history(listing_id, created_at DESC);

    CREATE TRIGGER limit_listing_photos
    BEFORE INSERT ON listing_photos
    WHEN (SELECT COUNT(*) FROM listing_photos WHERE listing_id = NEW.listing_id) >= 10
    BEGIN
      SELECT RAISE(ABORT, 'listing photo limit exceeded');
    END;
  `);
}
