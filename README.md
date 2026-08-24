# AutoMarket Demo Telegram Mini App

MVP-каркас автомобильной доски объявлений для Telegram Mini Apps. Публичный пользователь может просматривать опубликованные автомобили, фильтровать и сортировать каталог, открывать карточки и сохранять избранное. Администратор получает read-only список всех объявлений и их статусов.

## Architecture

```text
React + Vite + Telegram WebApp
  → REST API (Express)
  → application services
  → automotive provider interfaces
  → local SQLite provider (better-sqlite3, WAL)
```

Composition находится в `backend/src/container.ts`, SQL — только в local provider. Telegram `initData` validation и browser demo mode сохранены.

## Domain

Активный домен: `Customer`, `VehicleBrand`, `VehicleModel`, `Listing`, `ListingPhoto`, `Favorite`.

Статусы объявлений: `draft`, `pending_moderation`, `published`, `rejected`, `archived`. Публичное API возвращает только `published`.

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API health: http://localhost:3000/api/health
- Admin: http://localhost:5173/admin
- Read-only demo admin: http://localhost:5173/demo/admin

## API

- `GET /api/listings`
- `GET /api/listings/:id`
- `GET /api/vehicle-brands`
- `GET /api/vehicle-models?brand=...`
- `GET /api/me/favorites`
- `POST /api/listings/:id/favorite`
- `DELETE /api/listings/:id/favorite`
- `GET /api/admin/listings`
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

SQLite хранится в `/data/automarket.db`.

## Current scope

Нет оплаты, пользовательского создания объявлений, модерационных write-actions, VIN decoding, внешних автомобильных баз, чата, продвижения, дилерских аккаунтов и production deploy.

Старые real-estate исходники пока оставлены как неактивный legacy-код: они не импортируются из runtime entrypoints и не доступны через UI/API. Это позволяет сохранить историю и вынести физическое удаление в отдельный безопасный cleanup.
