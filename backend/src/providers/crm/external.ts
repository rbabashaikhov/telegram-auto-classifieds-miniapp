import { AppError } from '../../errors.js';
import type { Providers } from '../types.js';

function notConfigured(code: 'CRM_NOT_CONFIGURED' | 'PROPERTY_PROVIDER_NOT_CONFIGURED', method: string): never {
  const message =
    code === 'CRM_NOT_CONFIGURED'
      ? `CRM adapter is not configured. Implement a vendor provider for ${method}.`
      : `Property provider is not configured. Implement an inventory adapter for ${method}.`;
  throw new AppError(message, 501, code, { method });
}

function stubPort<T extends object>(code: 'CRM_NOT_CONFIGURED' | 'PROPERTY_PROVIDER_NOT_CONFIGURED'): T {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return () => notConfigured(code, String(prop));
      },
    },
  ) as T;
}

export function createExternalCrmSlice(): Pick<
  Providers,
  | 'customers'
  | 'profiles'
  | 'favorites'
  | 'matches'
  | 'leads'
  | 'scoreEvents'
  | 'agents'
  | 'viewings'
  | 'sellerLeads'
  | 'interactions'
  | 'idempotency'
> {
  return {
    customers: stubPort( 'CRM_NOT_CONFIGURED'),
    profiles: stubPort('CRM_NOT_CONFIGURED'),
    favorites: stubPort('CRM_NOT_CONFIGURED'),
    matches: stubPort('CRM_NOT_CONFIGURED'),
    leads: stubPort('CRM_NOT_CONFIGURED'),
    scoreEvents: stubPort('CRM_NOT_CONFIGURED'),
    agents: stubPort('CRM_NOT_CONFIGURED'),
    viewings: stubPort('CRM_NOT_CONFIGURED'),
    sellerLeads: stubPort('CRM_NOT_CONFIGURED'),
    interactions: stubPort('CRM_NOT_CONFIGURED'),
    idempotency: stubPort('CRM_NOT_CONFIGURED'),
  };
}

export function createExternalPropertySlice(): Pick<Providers, 'properties'> {
  return {
    properties: stubPort('PROPERTY_PROVIDER_NOT_CONFIGURED'),
  };
}

export function createUnconfiguredExternalCrmProviders(): Providers {
  return {
    ...createExternalCrmSlice(),
    ...createExternalPropertySlice(),
    events: stubPort('CRM_NOT_CONFIGURED'),
    transaction<T>(fn: () => T): T {
      return fn();
    },
  };
}
