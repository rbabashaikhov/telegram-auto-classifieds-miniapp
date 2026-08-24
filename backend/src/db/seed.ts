import type Database from 'better-sqlite3';

type DemoListing = [string, string, number, number, number, string, string, string, string, number, string, string, string, string];

const DEMO_LISTINGS: DemoListing[] = [
  ['Toyota', 'Camry', 2022, 3_790_000, 41_000, 'sedan', 'automatic', 'front', 'petrol', 2.5, 'Белый', 'Москва', 'Комфортный седан с прозрачной историей обслуживания.', 'published'],
  ['BMW', 'X3', 2021, 5_850_000, 58_000, 'suv', 'automatic', 'all', 'petrol', 2.0, 'Синий', 'Санкт-Петербург', 'Динамичный городской кроссовер в аккуратном состоянии.', 'published'],
  ['Kia', 'Rio', 2020, 1_720_000, 72_000, 'sedan', 'automatic', 'front', 'petrol', 1.6, 'Серый', 'Казань', 'Практичный автомобиль для города, регулярное ТО.', 'published'],
  ['Hyundai', 'Creta', 2023, 2_950_000, 18_500, 'suv', 'automatic', 'front', 'petrol', 2.0, 'Красный', 'Москва', 'Один владелец, бережная эксплуатация.', 'published'],
  ['Skoda', 'Octavia', 2019, 2_180_000, 89_000, 'liftback', 'robot', 'front', 'petrol', 1.4, 'Черный', 'Екатеринбург', 'Вместительный лифтбек с экономичным двигателем.', 'published'],
  ['Volkswagen', 'Tiguan', 2020, 3_350_000, 64_000, 'suv', 'robot', 'all', 'petrol', 2.0, 'Белый', 'Самара', 'Полный привод, удобный семейный салон.', 'published'],
  ['Lada', 'Vesta', 2022, 1_490_000, 35_000, 'sedan', 'manual', 'front', 'petrol', 1.6, 'Серебристый', 'Тула', 'Надёжный автомобиль с доступным обслуживанием.', 'published'],
  ['Geely', 'Coolray', 2023, 2_680_000, 22_000, 'suv', 'robot', 'front', 'petrol', 1.5, 'Оранжевый', 'Уфа', 'Современный компактный кроссовер с богатой комплектацией.', 'published'],
  ['Mazda', 'CX-5', 2019, 3_120_000, 76_000, 'suv', 'automatic', 'all', 'petrol', 2.5, 'Красный', 'Новосибирск', 'Управляемый кроссовер, ухоженный салон.', 'published'],
  ['Renault', 'Duster', 2021, 2_090_000, 49_000, 'suv', 'manual', 'all', 'diesel', 1.5, 'Зеленый', 'Пермь', 'Полный привод и экономичный дизель для поездок за город.', 'published'],
  ['Audi', 'A4', 2020, 4_270_000, 61_000, 'sedan', 'robot', 'all', 'petrol', 2.0, 'Серый', 'Москва', 'Сбалансированный премиальный седан.', 'published'],
  ['Nissan', 'Qashqai', 2018, 2_230_000, 94_000, 'suv', 'variator', 'front', 'petrol', 2.0, 'Синий', 'Омск', 'Удобный городской кроссовер с просторным багажником.', 'published'],
  ['Ford', 'Focus', 2017, 1_380_000, 118_000, 'hatchback', 'robot', 'front', 'petrol', 1.6, 'Белый', 'Воронеж', 'Компактный хэтчбек, хорошая управляемость.', 'published'],
  ['Mercedes-Benz', 'C-Class', 2021, 5_490_000, 45_000, 'sedan', 'automatic', 'rear', 'petrol', 1.5, 'Черный', 'Санкт-Петербург', 'Комфортный седан с качественной отделкой салона.', 'pending_moderation'],
  ['Haval', 'Jolion', 2024, 2_760_000, 8_000, 'suv', 'robot', 'front', 'petrol', 1.5, 'Серый', 'Ростов-на-Дону', 'Почти новый кроссовер, небольшой пробег.', 'published'],
  ['Volvo', 'V60', 2019, 3_880_000, 83_000, 'wagon', 'automatic', 'all', 'diesel', 2.0, 'Синий', 'Москва', 'Безопасный и практичный универсал.', 'archived'],
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function seed(database: Database.Database, now = new Date('2026-08-18T12:00:00')): void {
  const tariffs = [
    ['basic', 'Базовый', 'Размещение на 7 дней', 29_900, 'RUB', 7, 10],
    ['standard', 'Стандарт', 'Размещение на 30 дней', 59_900, 'RUB', 30, 20],
    ['extended', 'Расширенный', 'Размещение на 60 дней', 99_900, 'RUB', 60, 30],
  ] as const;
  const insertTariff = database.prepare(`INSERT OR IGNORE INTO tariffs
    (code,name,description,price_minor,currency,duration_days,active,display_order,created_at,updated_at)
    VALUES (?,?,?,?,?,?,1,?,?,?)`);
  tariffs.forEach((tariff) => insertTariff.run(...tariff, now.toISOString(), now.toISOString()));

  const existing = database.prepare('SELECT COUNT(*) AS count FROM listings').get() as { count: number };
  const insertBrand = database.prepare('INSERT OR IGNORE INTO vehicle_brands (name, slug) VALUES (?, ?)');
  const brandByName = database.prepare('SELECT id FROM vehicle_brands WHERE name = ?');
  const insertModel = database.prepare('INSERT OR IGNORE INTO vehicle_models (brand_id, name, slug) VALUES (?, ?, ?)');
  const modelByName = database.prepare('SELECT id FROM vehicle_models WHERE brand_id = ? AND name = ?');
  const insertListing = database.prepare(`INSERT INTO listings
    (user_id, brand_id, model_id, year, price, mileage, body_type, transmission, drive_type, engine_type, engine_volume, color, city, description, status, created_at, updated_at)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertPhoto = database.prepare('INSERT INTO listing_photos (listing_id, url, position) VALUES (?, ?, ?)');
  if (existing.count === 0) database.transaction(() => {
    DEMO_LISTINGS.forEach((item, index) => {
      const [brand, model, year, price, mileage, bodyType, transmission, driveType, engineType, engineVolume, color, city, description, status] = item;
      insertBrand.run(brand, slug(brand));
      const brandId = Number((brandByName.get(brand) as { id: number }).id);
      insertModel.run(brandId, model, slug(model));
      const modelId = Number((modelByName.get(brandId, model) as { id: number }).id);
      const timestamp = new Date(now.getTime() - index * 86_400_000).toISOString();
      const result = insertListing.run(brandId, modelId, year, price, mileage, bodyType, transmission, driveType, engineType, engineVolume, color, city, description, status, timestamp, timestamp);
      const listingId = Number(result.lastInsertRowid);
      insertPhoto.run(listingId, `/images/cars/car-${(index % 5) + 1}.svg`, 0);
      insertPhoto.run(listingId, `/images/cars/car-${((index + 1) % 5) + 1}.svg`, 1);
    });
  })();

  const demoTelegramId = 999000001;
  database.prepare(`INSERT OR IGNORE INTO customers (telegram_user_id,name,username,created_at,updated_at)
    VALUES (?,?,?,?,?)`).run(demoTelegramId, 'Иван Петров', 'demo_client', now.toISOString(), now.toISOString());
  const ownerId = Number((database.prepare('SELECT id FROM customers WHERE telegram_user_id=?').get(demoTelegramId) as { id: number }).id);
  const owned = database.prepare('SELECT COUNT(*) AS count FROM listings WHERE user_id=?').get(ownerId) as { count: number };
  if (owned.count === 0) {
    const toyotaBrand = database.prepare("SELECT id FROM vehicle_brands WHERE slug='toyota'").get() as { id: number };
    const camryModel = database.prepare("SELECT id FROM vehicle_models WHERE brand_id=? AND slug='camry'").get(toyotaBrand.id) as { id: number };
    const workflow = [
    { status: 'draft', year: 2016, price: 1_650_000, mileage: 126_000, city: 'Москва', description: 'Черновик объявления: автомобиль обслужен, подробности будут добавлены владельцем.' },
    { status: 'pending_moderation', year: 2020, price: 2_850_000, mileage: 67_000, city: 'Тверь', description: 'Объявление отправлено на проверку, автомобиль в хорошем демонстрационном состоянии.' },
    { status: 'published', year: 2019, price: 2_430_000, mileage: 88_000, city: 'Москва', description: 'Опубликованное объявление владельца с полной историей регулярного обслуживания.' },
    { status: 'rejected', year: 2018, price: 2_050_000, mileage: 101_000, city: 'Рязань', description: 'Демонстрационное объявление с причиной отклонения для повторного редактирования.' },
    ] as const;
    database.transaction(() => {
      workflow.forEach((item, index) => {
      const timestamp = new Date(now.getTime() + (index + 1) * 60_000).toISOString();
      const result = database.prepare(`INSERT INTO listings
        (user_id,brand_id,model_id,year,price,mileage,body_type,transmission,drive_type,engine_type,engine_volume,color,city,description,status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,'sedan','automatic','front','petrol',2.5,'Серый',?,?,?,?,?)`).run(
          ownerId, toyotaBrand.id, camryModel.id, item.year, item.price, item.mileage, item.city, item.description, item.status, timestamp, timestamp,
        );
      const listingId = Number(result.lastInsertRowid);
      insertPhoto.run(listingId, `/images/cars/car-${index + 1}.svg`, 0);
      if (item.status === 'pending_moderation') database.prepare("INSERT INTO listing_moderation_history (listing_id,action,created_at) VALUES (?,'submitted',?)").run(listingId, timestamp);
      if (item.status === 'published') database.prepare("INSERT INTO listing_moderation_history (listing_id,action,admin_identifier,created_at) VALUES (?,'approved','admin',?)").run(listingId, timestamp);
      if (item.status === 'rejected') database.prepare("INSERT INTO listing_moderation_history (listing_id,action,reason,admin_identifier,created_at) VALUES (?,'rejected','Добавьте более подробное описание состояния кузова.','admin',?)").run(listingId, timestamp);
      });
    })();
  }

  const ownedListings = database.prepare('SELECT id,status FROM listings WHERE user_id=? ORDER BY id').all(ownerId) as Array<{ id: number; status: string }>;
  const standardId = Number((database.prepare("SELECT id FROM tariffs WHERE code='standard'").get() as { id: number }).id);
  const seedStates = ['pending', 'paid', 'paid', 'failed'] as const;
  ownedListings.slice(0, 4).forEach((listing, index) => {
    const status = seedStates[index];
    const timestamp = new Date(now.getTime() + (index + 10) * 60_000).toISOString();
    database.prepare(`INSERT OR IGNORE INTO payments
      (customer_id,listing_id,tariff_id,provider,provider_payment_id,amount_minor,currency,status,confirmation_url,idempotency_key,provider_payload,created_at,updated_at,paid_at,failed_at,cancelled_at)
      VALUES (?,?,?,'demo',?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        ownerId, listing.id, standardId, `demo-seed-${listing.id}`, 59_900, 'RUB', status,
        `/payments/seed-${listing.id}/demo`, `seed-payment-${listing.id}`, JSON.stringify({ demo: true }), timestamp, timestamp,
        status === 'paid' ? timestamp : null, status === 'failed' ? timestamp : null, null,
      );
  });
  const rejected = ownedListings.find((listing) => listing.status === 'rejected');
  if (rejected) {
    const timestamp = new Date(now.getTime() + 20 * 60_000).toISOString();
    database.prepare(`INSERT OR IGNORE INTO payments
      (customer_id,listing_id,tariff_id,provider,provider_payment_id,amount_minor,currency,status,confirmation_url,idempotency_key,provider_payload,created_at,updated_at,cancelled_at)
      VALUES (?,?,?,'demo',?,59900,'RUB','cancelled',?,?,?, ?,?,?)`).run(
        ownerId, rejected.id, standardId, `demo-seed-cancelled-${rejected.id}`, `/payments/seed-cancelled-${rejected.id}/demo`,
        `seed-payment-cancelled-${rejected.id}`, JSON.stringify({ demo: true }), timestamp, timestamp, timestamp,
      );
  }
}
