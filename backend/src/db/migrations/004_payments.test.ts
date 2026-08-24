import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { applySchema } from '../schema.js';
import { seed } from '../seed.js';
import { applyInitialSchema } from './001_initial.js';
import { applyAutomotiveSchema } from './002_automotive.js';
import { applySellerWorkflowSchema } from './003_seller_workflow.js';
import { applyPaymentsSchema } from './004_payments.js';

describe('004 payments migration', () => {
  it('migrates an existing automotive database without losing listing relations', () => {
    const db = new Database(':memory:'); applyInitialSchema(db); applyAutomotiveSchema(db); applySellerWorkflowSchema(db);
    db.prepare("INSERT INTO vehicle_brands (name,slug) VALUES ('Test','test')").run();
    db.prepare("INSERT INTO vehicle_models (brand_id,name,slug) VALUES (1,'Model','model')").run();
    db.prepare(`INSERT INTO listings (brand_id,model_id,year,price,mileage,body_type,transmission,drive_type,engine_type,engine_volume,color,city,description,status)
      VALUES (1,1,2020,1000000,10000,'sedan','automatic','front','petrol',2,'Белый','Москва','Existing published listing','published')`).run();
    db.prepare("INSERT INTO listing_photos (listing_id,url,position) VALUES (1,'/existing.png',0)").run();
    db.prepare("INSERT INTO listing_moderation_history (listing_id,action,admin_identifier) VALUES (1,'approved','existing-admin')").run();
    applyPaymentsSchema(db);
    expect((db.prepare('SELECT status FROM listings WHERE id=1').get() as { status: string }).status).toBe('published');
    expect((db.prepare('SELECT url FROM listing_photos WHERE listing_id=1').get() as { url: string }).url).toBe('/existing.png');
    expect((db.prepare('SELECT action FROM listing_moderation_history WHERE listing_id=1').get() as { action: string }).action).toBe('approved');
    db.close();
  });

  it('registers migration 004 and seeds tariffs idempotently', () => {
    const db = new Database(':memory:'); applySchema(db); seed(db);
    const paymentsBefore = (db.prepare('SELECT COUNT(*) count FROM payments').get() as { count: number }).count;
    seed(db);
    expect((db.prepare('SELECT COUNT(*) count FROM tariffs').get() as { count: number }).count).toBe(3);
    expect((db.prepare("SELECT COUNT(*) count FROM listings WHERE status='published'").get() as { count: number }).count).toBeGreaterThan(0);
    expect((db.prepare("SELECT name FROM schema_migrations WHERE id=4").get() as { name: string }).name).toBe('004_payments');
    expect((db.prepare('SELECT COUNT(*) count FROM payments').get() as { count: number }).count).toBe(paymentsBefore);
    expect((db.prepare('SELECT COUNT(*) count FROM payments p JOIN listings l ON l.id=p.listing_id WHERE l.user_id IS NULL OR l.user_id<>p.customer_id').get() as { count: number }).count).toBe(0);
    db.close();
  });
});
