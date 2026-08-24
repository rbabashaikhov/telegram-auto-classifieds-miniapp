import { config } from './config.js';
import { db } from './db/schema.js';
import { logger } from './logger.js';
import { createExternalCrmSlice, createExternalPropertySlice } from './providers/crm/external.js';
import { createMockCrmSlice } from './providers/crm/mock.js';
import { createMockEventPublisher } from './providers/events/mock.js';
import { createWebhookEventPublisher } from './providers/events/webhook.js';
import { createLocalProviders } from './providers/local/sqlite.js';
import type { Providers } from './providers/types.js';

function composeProviders(): Providers {
  const local = createLocalProviders(db);

  const crmSlice =
    config.crmAdapter === 'external'
      ? createExternalCrmSlice()
      : config.crmAdapter === 'mock'
        ? createMockCrmSlice()
        : {
            customers: local.customers,
            profiles: local.profiles,
            favorites: local.favorites,
            matches: local.matches,
            leads: local.leads,
            scoreEvents: local.scoreEvents,
            agents: local.agents,
            viewings: local.viewings,
            sellerLeads: local.sellerLeads,
            interactions: local.interactions,
            idempotency: local.idempotency,
          };

  const propertySlice =
    config.propertyAdapter === 'external'
      ? createExternalPropertySlice()
      : { properties: local.properties };

  let events = local.events;
  if (config.eventAdapter === 'mock') {
    events = createMockEventPublisher();
  } else if (config.eventAdapter === 'webhook') {
    events = createWebhookEventPublisher(local.events, config.eventWebhookUrl);
  }

  logger.info('Providers composed', {
    dataMode: config.dataMode,
    crmAdapter: config.crmAdapter,
    propertyAdapter: config.propertyAdapter,
    eventAdapter: config.eventAdapter,
  });

  return {
    ...local,
    ...crmSlice,
    ...propertySlice,
    events,
  };
}

export const providers: Providers = composeProviders();
