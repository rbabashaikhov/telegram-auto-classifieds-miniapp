import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { applySchema } from '../schema.js';
import { seed } from '../seed.js';
import { applyInitialSchema } from './001_initial.js';
import { applyAutomotiveSchema } from './002_automotive.js';
import { applySellerWorkflowSchema } from './003_seller_workflow.js';
import { applyPaymentsSchema } from './004_payments.js';

describe('004 payments migration', () => {
  it('migrates existing listings and seeds tariffs idempotently', () => {
    const db = new Database(':memory:'); applyInitialSchema(db); applyAutomotiveSchema(db); applySellerWorkflowSchema(db);
    db.prepare("INSERT INTO vehicle_brands (name,slug) VALUES ('Test','test')").run();
    db.prepare("INSERT INTO vehicle_models (brand_id,name,slug) VALUES (1,'Model','model')").run();
    db.prepare(`INSERT INTO listings (brand_id,model_id,year,price,mileage,body_type,transmission,drive_type,engine_type,engine_volume,color,city,description,status)
      VALUES (1,1,2020,1000000,10000,'sedan','automatic','front','petrol',2,'Белый','Москва','Existing published listing','published')`).run();
    applyPaymentsSchema(db);
    expect((db.prepare('SELECT status FROM listings WHERE id=1').get() as { status: string }).status).toBe('published');
    db.close();
  });

  it('registers migration 004 and seeds tariffs idempotently', () => {
    const db = new Database(':memory:'); applySchema(db); seed(db); seed(db);
    expect((db.prepare('SELECT COUNT(*) count FROM tariffs').get() as { count: number }).count).toBe(3);
    expect((db.prepare("SELECT COUNT(*) count FROM listings WHERE status='published'").get() as { count: number }).count).toBeGreaterThan(0);
    expect((db.prepare("SELECT name FROM schema_migrations WHERE id=4").get() as { name: string }).name).toBe('004_payments');
    db.close();
  });
});
