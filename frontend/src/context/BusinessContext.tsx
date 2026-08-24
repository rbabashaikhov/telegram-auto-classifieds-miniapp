import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName: 'AutoMarket Demo',
  businessType: 'marketplace',
  businessVertical: 'automotive_classifieds',
  appTitle: 'AutoMarket Demo',
  appDescription: 'Автомобильная доска объявлений в Telegram.',
  timezone: 'Europe/Moscow',
  demoMode: true,
  adminProtected: true,
  paymentProvider: 'demo',
  demoPaymentsEnabled: true,
  currency: 'RUB',
  currencySymbol: '₽',
  branding: { accent: '#2563EB', logoUrl: null },
  mortgage: { defaultRate: 16, defaultTermYears: 20, defaultDownPercent: 20 },
  features: { demoTour: true, demoAdminPreview: true },
};

export const BusinessContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useBusiness(): AppConfig {
  return useContext(BusinessContext);
}
