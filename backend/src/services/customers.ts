import type { InteractionEventType, TelegramUser, UtmSource } from '../types.js';
import type { Providers } from '../providers/types.js';

export function ensureCustomer(
  data: Providers,
  user: TelegramUser,
  extras?: Partial<UtmSource> & { name?: string; phone?: string; consentAt?: string | null },
) {
  return data.customers.upsert(user, extras).customer;
}

export function trackEvent(
  data: Providers,
  params: {
    customerId: number;
    eventType: InteractionEventType;
    entityType?: string | null;
    entityId?: number | null;
    metadata?: Record<string, unknown> | null;
    utm?: Partial<UtmSource>;
  },
) {
  const customer = data.customers.getById(params.customerId);
  return data.interactions.add({
    customerId: params.customerId,
    eventType: params.eventType,
    entityType: params.entityType ?? null,
    entityId: params.entityId ?? null,
    timestamp: new Date().toISOString(),
    metadata: params.metadata ?? null,
    utmSource: params.utm?.utmSource ?? customer?.utmSource ?? null,
    utmMedium: params.utm?.utmMedium ?? customer?.utmMedium ?? null,
    utmCampaign: params.utm?.utmCampaign ?? customer?.utmCampaign ?? null,
    utmContent: params.utm?.utmContent ?? customer?.utmContent ?? null,
  });
}

export function resetCustomer(data: Providers, customerId: number): void {
  data.customers.deleteById(customerId);
}
