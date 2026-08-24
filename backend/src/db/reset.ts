import 'dotenv/config';
import { db } from './schema.js';
import { seed } from './seed.js';

db.exec(`
  PRAGMA foreign_keys = OFF;
  DELETE FROM idempotency_keys;
  DELETE FROM outbound_events;
  DELETE FROM interaction_events;
  DELETE FROM viewing_history;
  DELETE FROM viewings;
  DELETE FROM lead_score_events;
  DELETE FROM leads;
  DELETE FROM property_matches;
  DELETE FROM favorites;
  DELETE FROM property_features;
  DELETE FROM properties;
  DELETE FROM property_projects;
  DELETE FROM seller_leads;
  DELETE FROM buyer_profiles;
  DELETE FROM customers;
  DELETE FROM agents;
  PRAGMA foreign_keys = ON;
`);
seed(db);
console.log('Seed reset complete');
