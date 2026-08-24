# AutoMarket — automotive classifieds MVP

MVP автомобильной доски объявлений для Telegram Mini Apps. Пользователь может просматривать каталог, сохранять избранное и пройти полный seller flow: создать объявление, загрузить фотографии, выбрать тариф, пройти demo-оплату, отправить объявление на модерацию и опубликовать после решения администратора.

## Main flows

- Посетитель: каталог → фильтры и сортировка → карточка автомобиля → избранное.
- Продавец: «Разместить автомобиль» → характеристики → фото → предпросмотр → тариф размещения → демонстрационная оплата → модерация → публикация.
- Администратор: `/admin` → вход по локальному токену → объявления и фильтры → модерация с причиной отклонения → платежи.
- Demo admin: `/demo/admin` показывает те же объявления, платежи и историю в режиме только для чтения.

Browser demo использует существующего demo customer и содержит подготовленные объявления в разных состояниях, чтобы показать seller и moderation workflow без Telegram WebView.

## Architecture

```text
React + Vite + Telegram WebApp
  → REST API (Express)
  → application services
  → automotive + FileStorage + PaymentProvider interfaces
  → local SQLite provider (better-sqlite3, WAL) + LocalFileStorage + configured payment provider
```

Composition находится в `backend/src/container.ts`, SQL — только в local provider. Telegram `initData` validation и browser demo mode сохранены.

## Domain

Активный домен: `Customer`, `VehicleBrand`, `VehicleModel`, `Listing`, `ListingPhoto`, `Favorite`, `ModerationEvent`, `Tariff`, `Payment`, `PaymentEvent`.

Статусы объявлений: `draft`, `pending_moderation`, `published`, `rejected`, `archived`. Публичное API возвращает только `published`.

Lifecycle: `draft → payment pending → payment paid → pending_moderation → published` или `rejected → draft`. Неоплаченное объявление нельзя отправить на модерацию; статус проверяется на backend. Редактирование опубликованного объявления автоматически возвращает его на модерацию. Владелец определяется только из Telegram/demo auth context.

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

Для browser demo и локального admin задайте в корневом `.env`:

```dotenv
ALLOW_DEMO_MODE=true
PAYMENT_PROVIDER=demo
ALLOW_DEMO_PAYMENTS=true
ADMIN_TOKEN=<local value>
```

После изменения `.env` перезапустите dev server. На странице `/admin` введите то же значение `ADMIN_TOKEN`.

- Frontend: http://localhost:5173
- API health: http://localhost:3000/api/health
- Admin: http://localhost:5173/admin
- Read-only demo admin: http://localhost:5173/demo/admin
- Seller cabinet: http://localhost:5173/my/listings
- Payment admin: http://localhost:5173/admin/payments

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
- `GET /api/tariffs`
- `POST /api/me/listings/:id/payments`
- `GET /api/me/payments` and `GET /api/me/payments/:id`
- `GET /api/me/listings/:id/payment-status`
- `POST /api/demo-payments/:id/{succeed|fail|cancel}` (только при включённом demo mode)
- `POST /api/payments/webhook/:provider`
- `GET /api/admin/listings`
- `POST /api/admin/listings/:id/approve`
- `POST /api/admin/listings/:id/reject`
- `GET /api/demo-admin/listings`
- `GET /api/admin/payments` and `GET /api/demo-admin/payments`

Тарифы и суммы хранятся в SQLite в integer-копейках и всегда берутся backend-ом. `DemoPaymentProvider` даёт контролируемый checkout без реального списания; `ExternalPaymentProvider` — fail-closed stub с `501 PAYMENT_PROVIDER_NOT_CONFIGURED`. Provider выбирается только в composition layer. Реальный эквайринг пока не подключён.

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

### Production deployment

`compose.production.yaml` запускает один непривилегированный application container в общей внешней сети `miniapps-net`. Порт `3000` только объявлен внутри Docker network и не публикуется на интерфейсах VPS; HTTPS завершается общим reverse proxy.

Production `.env` хранится только на сервере и должен иметь права `0600`. Минимальные параметры:

```dotenv
NODE_ENV=production
APP_URL=https://automarket.example.com
DATABASE_PATH=/data/automarket.db
UPLOADS_DIR=/data/uploads/listings
ALLOW_DEMO_MODE=true
PAYMENT_PROVIDER=demo
ALLOW_DEMO_PAYMENTS=true
FEATURE_DEMO_TOUR=true
FEATURE_DEMO_ADMIN_PREVIEW=true
ADMIN_TOKEN=<separate random value of at least 32 bytes>
```

Не коммитьте production `.env`, admin token, reverse-proxy credentials или данные из persistent volume. Named volume `miniapps-automarket_automarket_data` сохраняет SQLite и uploads при restart/redeploy. Перед изменением общего reverse proxy сделайте backup его конфигурации, проверьте новую конфигурацию и только затем выполните graceful reload.

## Known limitations

Нет реального эквайринга, refunds, VIN decoding, внешних автомобильных баз, чата, продвижения, дилерских аккаунтов, subscription billing, сложной revision system и автоматизированного deployment pipeline. Контакт продавца остаётся demo-safe placeholder.

Локальные иллюстрации автомобилей — нейтральные SVG demo assets, а не фотографии реальных объявлений. Они намеренно не используют внешние hotlinks или снимки маркетплейсов.

Старые real-estate исходники пока оставлены как неактивный legacy-код: они не импортируются из runtime entrypoints и не доступны через UI/API. Это позволяет сохранить историю и вынести физическое удаление в отдельный безопасный cleanup.
