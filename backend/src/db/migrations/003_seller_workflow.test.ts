import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { applyInitialSchema } from './001_initial.js';
import { applyAutomotiveSchema } from './002_automotive.js';
import { applySellerWorkflowSchema } from './003_seller_workflow.js';

describe('seller workflow migration', () => {
  it('migrates an existing automotive database without losing listings', () => {
    const database = new Database(':memory:');
    applyInitialSchema(database); applyAutomotiveSchema(database);
    database.prepare("INSERT INTO vehicle_brands (name,slug) VALUES ('Test','test')").run();
    database.prepare("INSERT INTO vehicle_models (brand_id,name,slug) VALUES (1,'Model','model')").run();
    database.prepare("INSERT INTO listings (brand_id,model_id,year,price,mileage,body_type,transmission,drive_type,engine_type,engine_volume,color,city,description,status) VALUES (1,1,2020,1000000,10000,'sedan','automatic','front','petrol',2,'Белый','Москва','Существующее объявление','published')").run();
    applySellerWorkflowSchema(database);
    expect((database.prepare('SELECT COUNT(*) count FROM listings').get() as { count: number }).count).toBe(1);
    expect(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='listing_moderation_history'").get()).toBeTruthy();
    database.close();
  });
});
