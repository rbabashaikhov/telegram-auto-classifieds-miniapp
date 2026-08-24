# Real Estate Lead & Matching Telegram Mini App

Демонстрационный продукт линейки Telegram Mini Apps для агентства недвижимости или застройщика.

Это не каталог квартир. Это воронка:

**traffic → buyer qualification → property matching → behavioral scoring → qualified lead → viewing → CRM-ready handoff**

## Business problem

Реклама приводит человека в Telegram. Менеджер получает «хочу двушку» без бюджета, срока и готовности. Каталог на сайте не квалифицирует и не объясняет, почему объект подходит.

## Solution

Mini App проводит короткий qualification, подбирает объекты детерминированным matching engine, объясняет причины, копит behavioral signals и отдаёт менеджеру HOT lead с историей. Application layer готов к CRM, не притворяясь CRM.

## Architecture

```text
Frontend (React + Vite + Telegram WebApp)
   ↓ REST
Express API
   ↓
Application services
   ↓
Domain ports
   ↓
Providers
 ├── SQLite/local
 ├── CRM adapters (local | mock | external stub)
 ├── Property source adapters (local | external stub)
 └── Events (local | webhook | mock)
```

Adapter selection только в `backend/src/container.ts`. Services не содержат `if (crmMode)`.

## Features

- Пошаговая квалификация покупателя
- ~15 объектов в 3 вымышленных ЖК
- Matching 0–100 с reasons
- Избранное как intent signal
- Ипотечный калькулятор (demo, без банков)
- Запись на просмотр (on-site / office / online)
- Lead scoring: profile + behavior, COLD/WARM/HOT
- First-party events + UTM
- Отдельный seller funnel
- Кабинет клиента «Мой подбор»
- Manager console: dashboard, leads, lead detail, properties CRUD, viewings, seller leads, analytics
- Guided sales demo поверх живого UI
- CRM-ready и property-provider-ready порты

## Domain

Customer, BuyerProfile, SearchPreference, SellerLead, PropertyProject, Property, PropertyFeature, Favorite, PropertyMatch, MatchReason, Lead, LeadScore, LeadScoreEvent, Agent, Viewing, ViewingHistory, InteractionEvent.

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:3000/api/health  
Admin: http://localhost:5173/admin (токен `nord-estate-demo`)

```bash
npm test
npm run typecheck
```

## Env

| Variable | Purpose |
| --- | --- |
| `DATA_MODE` | `local` |
| `CRM_ADAPTER` | `local` \| `external` \| `mock` |
| `PROPERTY_ADAPTER` | `local` \| `external` |
| `EVENT_ADAPTER` | `local` \| `webhook` \| `mock` |
| `DATABASE_PATH` | SQLite file |
| `ADMIN_TOKEN` | fail-closed manager auth |
| `TELEGRAM_BOT_TOKEN` | initData HMAC |
| `ALLOW_DEMO_MODE` | browser demo user |
| `APP_URL` | CORS origin |
| `TZ` | timezone |
| `CRM_BASE_URL` | required for a future external CRM |
| `PROPERTY_PROVIDER_URL` | required for a future inventory feed |

`CRM_ADAPTER=external` без конфигурации → `501 CRM_NOT_CONFIGURED`  
`PROPERTY_ADAPTER=external` без конфигурации → `501 PROPERTY_PROVIDER_NOT_CONFIGURED`

Admin никогда не становится публичным из-за demo mode.

## Docker

```bash
docker build -t telegram-real-estate-miniapp .
docker run --rm -p 3000:3000 -e ADMIN_TOKEN=nord-estate-demo telegram-real-estate-miniapp
```

Один контейнер: Express отдаёт `/api/*` и статику frontend. SQLite в `/data/realestate.db`.

Не деплоить на общий VPS этим этапом — линейка переносится отдельно.

## Demo mode

Browser без Telegram: пользователь Иван Петров. Guided tour рассказывает воронку на живом UI. Тур заполняет client-side draft и не создаёт Lead/Viewing/Favorite без явного действия.

## Admin

`/admin` защищён `ADMIN_TOKEN`.  
`/demo/admin` — read-only sales preview, только при `ALLOW_DEMO_MODE` + feature flag.

## CRM readiness

См. [docs/CRM.md](docs/CRM.md).

## Property provider readiness

Local SQLite — полноценный demo catalog. Matching работает через `PropertyCatalogProvider`. External stub готов к ERP/XML/API.

## Analytics

First-party funnel:

App opened → Qualification started → Qualification completed → Property viewed → Favorite → Viewing requested

Плюс температура лидов, топ объектов, UTM, conversion property → viewing.

## Tests

Backend покрывает matching, budget bounds, scoring, temperature, score events, favorite idempotency, revisit, viewing create/cancel, interactions, funnel, seller lead, Telegram initData, unauthorized admin, CRM/property 501.

## Known limitations

- Нет реальной интеграции Bitrix24 / amoCRM / ипотечных банков
- Нет живых фото ЖК — архитектурные SVG-иллюстрации
- Matching детерминированный, без ML/LLM
- Seller flow не делает automated valuation
- Просмотры не синхронизируются с календарём агента
- Production deploy на общий VPS — отдельный этап

## Future: rental variation (not in this release)

Отдельная rental-вертикаль не входит в текущий продукт. Возможное расширение:

- менеджер добавляет объект
- статусы AVAILABLE / RESERVED / RENTED
- фото, цена, район, комнаты, площадь, условия
- фильтры, избранное, контакт менеджера
- заявка на просмотр и лид на объект

Сейчас Mini App остаётся buyer qualification + matching + viewing funnel, не каталогом аренды.
