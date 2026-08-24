import Database from 'better-sqlite3';
import { applySchema } from '../db/schema.js';
import { seed } from '../db/seed.js';
import { createAutomotiveProviders } from '../providers/local/automotiveSqlite.js';
import type { AutomotiveProviders } from '../automotive.js';

export interface TestWorld {
  db: Database.Database;
  providers: AutomotiveProviders;
  user: { id: number; first_name: string; last_name: string; username: string };
}

export function createTestWorld(now = new Date('2026-08-18T12:00:00')): TestWorld {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db, now);
  return {
    db,
    providers: createAutomotiveProviders(db),
    user: { id: 999000001, first_name: 'Иван', last_name: 'Петров', username: 'demo_client' },
  };
}
