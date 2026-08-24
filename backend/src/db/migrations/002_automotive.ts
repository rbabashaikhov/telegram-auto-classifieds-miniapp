import type Database from 'better-sqlite3';

export function applyAutomotiveSchema(database: Database.Database): void {
  database.exec(`
    DROP TABLE IF EXISTS favorites;

    CREATE TABLE vehicle_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE vehicle_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_id INTEGER NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      UNIQUE(brand_id, name),
      UNIQUE(brand_id, slug)
    );

    CREATE TABLE listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      brand_id INTEGER NOT NULL REFERENCES vehicle_brands(id),
      model_id INTEGER NOT NULL REFERENCES vehicle_models(id),
      year INTEGER NOT NULL CHECK(year BETWEEN 1900 AND 2100),
      price INTEGER NOT NULL CHECK(price >= 0),
      mileage INTEGER NOT NULL CHECK(mileage >= 0),
      body_type TEXT NOT NULL,
      transmission TEXT NOT NULL,
      drive_type TEXT NOT NULL,
      engine_type TEXT NOT NULL,
      engine_volume REAL NOT NULL CHECK(engine_volume > 0),
      color TEXT NOT NULL,
      city TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft','pending_moderation','published','rejected','archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE listing_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      UNIQUE(listing_id, position)
    );

    CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, listing_id)
    );

    CREATE INDEX idx_vehicle_models_brand ON vehicle_models(brand_id, name);
    CREATE INDEX idx_listings_public ON listings(status, created_at DESC);
    CREATE INDEX idx_listings_brand_model ON listings(brand_id, model_id);
    CREATE INDEX idx_listings_filters ON listings(price, year, mileage);
    CREATE INDEX idx_listing_photos_listing ON listing_photos(listing_id, position);
    CREATE INDEX idx_favorites_customer ON favorites(customer_id, created_at DESC);
  `);
}
