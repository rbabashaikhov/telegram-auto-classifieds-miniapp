import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName: 'Норд Эстейт',
  businessType: 'agency',
  businessVertical: 'real_estate',
  appTitle: 'Норд Эстейт',
  appDescription: 'Квартиры под ваш сценарий жизни — не каталог, а квалифицированный подбор.',
  timezone: 'Europe/Moscow',
  demoMode: true,
  adminProtected: true,
  currency: 'RUB',
  currencySymbol: '₽',
  branding: { accent: '#C4A574', logoUrl: null },
  mortgage: { defaultRate: 16, defaultTermYears: 20, defaultDownPercent: 20 },
  features: { demoTour: true, demoAdminPreview: true },
};

export const BusinessContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useBusiness(): AppConfig {
  return useContext(BusinessContext);
}
