import type Database from 'better-sqlite3';

export function applyInitialSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      username TEXT,
      phone TEXT,
      consent_at TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE buyer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
      goal TEXT NOT NULL,
      property_type TEXT NOT NULL,
      locations TEXT NOT NULL,
      budget_min INTEGER NOT NULL,
      budget_max INTEGER NOT NULL,
      rooms TEXT NOT NULL,
      purchase_timing TEXT NOT NULL,
      payment TEXT NOT NULL,
      mortgage_status TEXT,
      preferences TEXT NOT NULL,
      area_min INTEGER,
      area_max INTEGER,
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE seller_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      location TEXT NOT NULL,
      property_type TEXT NOT NULL,
      rooms TEXT NOT NULL,
      area REAL NOT NULL,
      condition TEXT NOT NULL,
      desired_price INTEGER NOT NULL,
      sale_timing TEXT NOT NULL,
      comment TEXT,
      contact TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE property_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      district TEXT NOT NULL,
      address TEXT NOT NULL,
      description TEXT NOT NULL,
      property_type TEXT NOT NULL,
      completion_date TEXT NOT NULL,
      image_url TEXT NOT NULL,
      gallery TEXT NOT NULL,
      features TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES property_projects(id) ON DELETE CASCADE,
      unit_number TEXT NOT NULL,
      rooms TEXT NOT NULL,
      rooms_count INTEGER NOT NULL,
      area REAL NOT NULL,
      floor INTEGER NOT NULL,
      floors_total INTEGER NOT NULL,
      price INTEGER NOT NULL,
      finish TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      completion_date TEXT NOT NULL,
      gallery TEXT NOT NULL,
      description TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE property_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, property_id)
    );

    CREATE TABLE property_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_profile_id INTEGER NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      reasons TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(buyer_profile_id, property_id)
    );

    CREATE TABLE agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      title TEXT NOT NULL,
      specialization TEXT NOT NULL,
      avatar_url TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
      buyer_profile_id INTEGER REFERENCES buyer_profiles(id) ON DELETE SET NULL,
      agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
      score INTEGER NOT NULL DEFAULT 0,
      temperature TEXT NOT NULL DEFAULT 'COLD',
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE lead_score_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      score_after INTEGER NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE viewings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
      scheduled_at TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE viewing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      viewing_id INTEGER NOT NULL REFERENCES viewings(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE interaction_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT
    );

    CREATE TABLE outbound_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE idempotency_keys (
      key TEXT NOT NULL,
      scope TEXT NOT NULL,
      status INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (key, scope)
    );

    CREATE INDEX idx_properties_project ON properties(project_id);
    CREATE INDEX idx_favorites_customer ON favorites(customer_id);
    CREATE INDEX idx_leads_temperature ON leads(temperature);
    CREATE INDEX idx_interactions_customer ON interaction_events(customer_id, timestamp);
    CREATE INDEX idx_viewings_status ON viewings(status);
    CREATE INDEX idx_matches_profile ON property_matches(buyer_profile_id, score DESC);
  `);
}
