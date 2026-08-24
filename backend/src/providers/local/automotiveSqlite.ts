import type Database from 'better-sqlite3';
import type { AutomotiveProviders, Listing, ListingFilters, ListingPhoto, VehicleBrand, VehicleModel } from '../../automotive.js';
import type { Customer, TelegramUser } from '../../types.js';

type Row = Record<string, unknown>;
const nowIso = () => new Date().toISOString();

function mapCustomer(row: Row): Customer {
  return {
    id: Number(row.id), telegramUserId: Number(row.telegram_user_id), name: String(row.name),
    username: (row.username as string | null) ?? null, phone: (row.phone as string | null) ?? null,
    consentAt: (row.consent_at as string | null) ?? null, utmSource: (row.utm_source as string | null) ?? null,
    utmMedium: (row.utm_medium as string | null) ?? null, utmCampaign: (row.utm_campaign as string | null) ?? null,
    utmContent: (row.utm_content as string | null) ?? null, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

const mapBrand = (row: Row): VehicleBrand => ({ id: Number(row.id), name: String(row.name), slug: String(row.slug) });
const mapModel = (row: Row): VehicleModel => ({ id: Number(row.id), brandId: Number(row.brand_id), name: String(row.name), slug: String(row.slug) });

export function createAutomotiveProviders(database: Database.Database): AutomotiveProviders {
  const photoStmt = database.prepare('SELECT * FROM listing_photos WHERE listing_id = ? ORDER BY position, id');
  const hydrate = (row: Row): Listing => ({
    id: Number(row.id), userId: row.user_id == null ? null : Number(row.user_id),
    brand: { id: Number(row.brand_id), name: String(row.brand_name), slug: String(row.brand_slug) },
    model: { id: Number(row.model_id), brandId: Number(row.brand_id), name: String(row.model_name), slug: String(row.model_slug) },
    year: Number(row.year), price: Number(row.price), mileage: Number(row.mileage), bodyType: String(row.body_type),
    transmission: String(row.transmission), driveType: String(row.drive_type), engineType: String(row.engine_type),
    engineVolume: Number(row.engine_volume), color: String(row.color), city: String(row.city),
    description: String(row.description), status: row.status as Listing['status'], createdAt: String(row.created_at),
    updatedAt: String(row.updated_at), photos: (photoStmt.all(row.id) as Row[]).map((photo): ListingPhoto => ({
      id: Number(photo.id), listingId: Number(photo.listing_id), url: String(photo.url), position: Number(photo.position),
    })),
  });
  const select = `SELECT l.*, b.name brand_name, b.slug brand_slug, m.name model_name, m.slug model_slug
    FROM listings l JOIN vehicle_brands b ON b.id=l.brand_id JOIN vehicle_models m ON m.id=l.model_id`;

  return {
    customers: {
      upsert(user: TelegramUser) {
        const found = database.prepare('SELECT * FROM customers WHERE telegram_user_id = ?').get(user.id) as Row | undefined;
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Пользователь';
        if (found) {
          database.prepare('UPDATE customers SET name=?, username=?, updated_at=? WHERE id=?').run(name, user.username ?? null, nowIso(), found.id);
          return { customer: mapCustomer(database.prepare('SELECT * FROM customers WHERE id=?').get(found.id) as Row), created: false };
        }
        const result = database.prepare('INSERT INTO customers (telegram_user_id,name,username,created_at,updated_at) VALUES (?,?,?,?,?)')
          .run(user.id, name, user.username ?? null, nowIso(), nowIso());
        return { customer: mapCustomer(database.prepare('SELECT * FROM customers WHERE id=?').get(result.lastInsertRowid) as Row), created: true };
      },
    },
    catalog: {
      list(filters: ListingFilters = {}, publishedOnly = true) {
        const clauses: string[] = [];
        const params: Array<string | number> = [];
        if (publishedOnly) clauses.push("l.status='published'");
        const textFilters: Array<[keyof ListingFilters, string]> = [
          ['brand', 'b.slug'], ['model', 'm.slug'], ['bodyType', 'l.body_type'], ['transmission', 'l.transmission'],
          ['driveType', 'l.drive_type'], ['engineType', 'l.engine_type'], ['city', 'l.city'],
        ];
        for (const [key, column] of textFilters) if (filters[key]) { clauses.push(`LOWER(${column})=LOWER(?)`); params.push(String(filters[key])); }
        const numeric: Array<[keyof ListingFilters, string, string]> = [
          ['priceMin', 'l.price', '>='], ['priceMax', 'l.price', '<='], ['yearMin', 'l.year', '>='],
          ['yearMax', 'l.year', '<='], ['mileageMax', 'l.mileage', '<='],
        ];
        for (const [key, column, op] of numeric) if (filters[key] !== undefined) { clauses.push(`${column}${op}?`); params.push(Number(filters[key])); }
        const order = { newest: 'l.created_at DESC, l.id DESC', price_asc: 'l.price ASC', price_desc: 'l.price DESC', year_desc: 'l.year DESC', mileage_asc: 'l.mileage ASC' }[filters.sort ?? 'newest'];
        const sql = `${select}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY ${order}`;
        return (database.prepare(sql).all(...params) as Row[]).map(hydrate);
      },
      get(id, publishedOnly = true) {
        const row = database.prepare(`${select} WHERE l.id=?${publishedOnly ? " AND l.status='published'" : ''}`).get(id) as Row | undefined;
        return row ? hydrate(row) : undefined;
      },
      brands() { return (database.prepare('SELECT * FROM vehicle_brands ORDER BY name').all() as Row[]).map(mapBrand); },
      models(brandValue) {
        const rows = brandValue
          ? database.prepare('SELECT m.* FROM vehicle_models m JOIN vehicle_brands b ON b.id=m.brand_id WHERE LOWER(b.slug)=LOWER(?) OR LOWER(b.name)=LOWER(?) ORDER BY m.name').all(brandValue, brandValue)
          : database.prepare('SELECT * FROM vehicle_models ORDER BY name').all();
        return (rows as Row[]).map(mapModel);
      },
    },
    favorites: {
      add(customerId, listingId) {
        const result = database.prepare('INSERT OR IGNORE INTO favorites (customer_id,listing_id) VALUES (?,?)').run(customerId, listingId);
        return { created: result.changes > 0 };
      },
      remove(customerId, listingId) { return database.prepare('DELETE FROM favorites WHERE customer_id=? AND listing_id=?').run(customerId, listingId).changes > 0; },
      list(customerId) {
        return (database.prepare(`${select} JOIN favorites f ON f.listing_id=l.id WHERE f.customer_id=? AND l.status='published' ORDER BY f.created_at DESC`).all(customerId) as Row[]).map(hydrate);
      },
    },
  };
}
