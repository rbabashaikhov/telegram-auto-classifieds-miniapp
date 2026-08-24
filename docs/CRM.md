# CRM integration contract

Mini App не является CRM. Application layer зависит от портов (`CustomerProvider`, `LeadProvider`, `FavoriteProvider`, `ViewingProvider`, `InteractionProvider`, `LeadScoreEventProvider`). Когда появится Bitrix24, amoCRM или custom CRM, реализуется набор CRM providers. UI и use cases не переписываются.

`CRM_ADAPTER=external` без `CRM_BASE_URL` возвращает контролируемый HTTP `501` с кодом `CRM_NOT_CONFIGURED`. Тихого fallback на SQLite нет.

`CRM_ADAPTER=mock` — in-memory адаптер для проверки composition layer.

`CRM_ADAPTER=local` — SQLite demo provider.

Выбор адаптера только в `backend/src/container.ts`.

## Ports

| Port | Responsibility |
| --- | --- |
| CustomerProvider | upsert Telegram user, UTM, consent, delete/reset |
| BuyerProfileProvider | qualification / search preference |
| LeadProvider | commercial lead + temperature |
| LeadScoreEventProvider | audit trail of score changes |
| FavoriteProvider | intent signal, idempotent add |
| ViewingProvider | viewing requests and status history |
| InteractionProvider | first-party events + UTM |
| SellerLeadProvider | owner funnel, separate from buyers |
| EventProvider | outbound `lead.*`, `favorite.*`, `viewing.*` |

## Outbound handoff payload

`crmHandoff(customerId)` собирает:

```text
Customer
BuyerProfile
Lead
LeadScore
LeadScoreEvent[]
TopMatches
Favorites
Viewings
Source/UTM
RecentInteractionEvents
```

Пример `lead.qualified`:

```json
{
  "leadId": 12,
  "customerId": 4,
  "score": 91,
  "temperature": "HOT"
}
```

## Mapping

### Customer

| Mini App | CRM |
| --- | --- |
| id | mapping table |
| telegramUserId | telegram_id |
| name | NAME |
| phone | PHONE |
| utm_* | SOURCE / UTM fields |

### BuyerProfile

| Mini App | CRM custom fields |
| --- | --- |
| goal / rooms / locations | UF_GOAL / UF_ROOMS / UF_LOCATIONS |
| budgetMin / budgetMax | UF_BUDGET_FROM / UF_BUDGET_TO |
| purchaseTiming / payment / mortgageStatus | UF_TIMING / UF_PAYMENT / UF_MORTGAGE |
| preferences | UF_FEATURES |

### Lead

| Mini App | CRM |
| --- | --- |
| score / temperature | UF_LEAD_SCORE / UF_TEMPERATURE |
| status `new → qualified → viewing → handoff` | pipeline stages |
| agentId | ASSIGNED_BY_ID |

Не маппить frontend DTO один-в-один. CRM хранит коммерческий снимок, matching engine остаётся в application layer.

## Inbound / outbound

Outbound (Mini App → CRM / webhook):

- `lead.created`
- `lead.qualified`
- `lead.became_hot`
- `favorite.added`
- `viewing.requested`
- `viewing.completed`
- `seller_lead.created`

Inbound (на будущее, не реализовано):

- смена статуса лида менеджером в CRM
- назначение агента
- статус просмотра после визита

Рекомендуемый контур:

```http
POST /api/integrations/crm/leads/:id/status
POST /api/integrations/crm/viewings/:id/status
```

Защищать integration token, не `ADMIN_TOKEN` клиентской админки.

## Idempotency

- Favorite add: unique `(customer_id, property_id)`
- Lead upsert: unique `customer_id`
- Outbound events: consumer должен считать `(name, leadId, occurredAt)` идемпотентным
- HTTP write endpoints принимают `Idempotency-Key`

Повторный `qualification` обновляет профиль и пересчитывает matches / profile score, не создаёт второго buyer lead.

## Property provider

Каталог не является CRM-сущностью по умолчанию. `PROPERTY_ADAPTER=local|external`.

`PROPERTY_ADAPTER=external` без `PROPERTY_PROVIDER_URL` → `501 PROPERTY_PROVIDER_NOT_CONFIGURED`.

Будущие источники: CRM inventory, ERP застройщика, XML/feed, property API. Matching engine работает с `Property` + `PropertyProject` + features, не с SQLite.

## How to connect a vendor adapter

1. Реализовать порты в `backend/src/providers/crm/bitrix.ts` (или amo/custom).
2. Подключить только в `container.ts` при `CRM_ADAPTER=external` и настроенном `CRM_BASE_URL`.
3. Не добавлять `if (crmMode)` в services/routes.
4. Прогнать существующие matching / scoring / viewing тесты против fake порта.
