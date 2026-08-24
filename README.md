# AutoMarket Demo Telegram Mini App

MVP автомобильной доски объявлений для Telegram Mini Apps. Пользователь может просматривать каталог, сохранять избранное и пройти полный seller flow: создать объявление, загрузить фотографии, отправить его на модерацию и опубликовать после решения администратора.

## Architecture

```text
React + Vite + Telegram WebApp
  → REST API (Express)
  → application services
  → automotive + FileStorage interfaces
  → local SQLite provider (better-sqlite3, WAL) + LocalFileStorage
```

Composition находится в `backend/src/container.ts`, SQL — только в local provider. Telegram `initData` validation и browser demo mode сохранены.

## Domain

Активный домен: `Customer`, `VehicleBrand`, `VehicleModel`, `Listing`, `ListingPhoto`, `Favorite`, `ModerationEvent`.

Статусы объявлений: `draft`, `pending_moderation`, `published`, `rejected`, `archived`. Публичное API возвращает только `published`.

Lifecycle: `draft → pending_moderation → published` или `draft → pending_moderation → rejected → draft`. Редактирование опубликованного объявления автоматически возвращает его на модерацию. Владелец определяется только из Telegram/demo auth context.

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

Для browser demo и локального admin задайте в корневом `.env`:

```dotenv
ALLOW_DEMO_MODE=true
ADMIN_TOKEN=<local value>
```

После изменения `.env` перезапустите dev server. На странице `/admin` введите то же значение `ADMIN_TOKEN`.

- Frontend: http://localhost:5173
- API health: http://localhost:3000/api/health
- Admin: http://localhost:5173/admin
- Read-only demo admin: http://localhost:5173/demo/admin
- Seller cabinet: http://localhost:5173/my/listings

Загруженные изображения сохраняются вне SQLite в `UPLOADS_DIR` (`./data/uploads/listings` по умолчанию). Допускаются JPG, PNG, WebP и GIF до 5 МБ, максимум 10 фотографий на объявление. В Docker следует монтировать `/data`, где находятся база и uploads.

## API

- `GET /api/listings`
- `GET /api/listings/:id`
- `GET /api/vehicle-brands`
- `GET /api/vehicle-models?brand=...`
- `GET /api/me/favorites`
- `POST /api/listings/:id/favorite`
- `DELETE /api/listings/:id/favorite`
- `GET/POST /api/me/listings`
- `GET/PATCH /api/me/listings/:id`
- `POST /api/me/listings/:id/submit`
- `POST /api/me/listings/:id/archive`
- `POST /api/me/listings/:id/photos`
- `DELETE /api/me/listings/:id/photos/:photoId`
- `GET /api/admin/listings`
- `POST /api/admin/listings/:id/approve`
- `POST /api/admin/listings/:id/reject`
- `GET /api/demo-admin/listings`

Каталог поддерживает `brand`, `model`, `priceMin`, `priceMax`, `yearMin`, `yearMax`, `mileageMax`, `bodyType`, `transmission`, `driveType`, `engineType`, `city` и сортировки `newest`, `price_asc`, `price_desc`, `year_desc`, `mileage_asc`.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## Docker

```bash
docker build -t telegram-automarket-miniapp .
docker run --rm -p 3000:3000 -e ADMIN_TOKEN=automarket-demo telegram-automarket-miniapp
```

SQLite хранится в `/data/automarket.db`, изображения — в `/data/uploads/listings`.

## Current scope

Нет оплаты, VIN decoding, внешних автомобильных баз, чата, продвижения, дилерских аккаунтов, сложной revision system и production deploy. Контакт продавца остаётся demo-safe placeholder.

Старые real-estate исходники пока оставлены как неактивный legacy-код: они не импортируются из runtime entrypoints и не доступны через UI/API. Это позволяет сохранить историю и вынести физическое удаление в отдельный безопасный cleanup.
