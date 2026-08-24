function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const nodeEnv = process.env.NODE_ENV || 'development';

export type DataModeName = 'local';
export type CrmAdapterName = 'local' | 'external' | 'mock';
export type PropertyAdapterName = 'local' | 'external';
export type EventAdapterName = 'local' | 'webhook' | 'mock';

function dataModeName(value: string | undefined): DataModeName {
  if (value === 'local') return value;
  return 'local';
}

function crmAdapterName(value: string | undefined): CrmAdapterName {
  if (value === 'external' || value === 'mock' || value === 'local') return value;
  return 'local';
}

function propertyAdapterName(value: string | undefined): PropertyAdapterName {
  if (value === 'external' || value === 'local') return value;
  return 'local';
}

function eventAdapterName(value: string | undefined): EventAdapterName {
  if (value === 'webhook' || value === 'mock' || value === 'local') return value;
  return 'local';
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.API_PORT || process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || '',
  publicDir: process.env.PUBLIC_DIR || '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  allowDemoMode: process.env.ALLOW_DEMO_MODE === 'true',
  timezone: process.env.TZ || 'Europe/Moscow',
  dataMode: dataModeName(process.env.DATA_MODE),
  crmAdapter: crmAdapterName(process.env.CRM_ADAPTER),
  propertyAdapter: propertyAdapterName(process.env.PROPERTY_ADAPTER),
  eventAdapter: eventAdapterName(process.env.EVENT_ADAPTER),
  eventWebhookUrl: (process.env.EVENT_WEBHOOK_URL || '').trim(),
  crmBaseUrl: (process.env.CRM_BASE_URL || '').trim(),
  propertyProviderUrl: (process.env.PROPERTY_PROVIDER_URL || '').trim(),
  business: {
    name: process.env.BUSINESS_NAME || 'Норд Эстейт',
    vertical: process.env.BUSINESS_VERTICAL || 'real_estate',
    type: process.env.BUSINESS_TYPE || 'agency',
    title: process.env.APP_TITLE || 'Норд Эстейт',
    description:
      process.env.APP_DESCRIPTION ||
      'Квартиры под ваш сценарий жизни — не каталог, а квалифицированный подбор.',
    currency: process.env.CURRENCY || 'RUB',
    currencySymbol: process.env.CURRENCY_SYMBOL || '₽',
    brandAccent: process.env.BRAND_ACCENT || '#C4A574',
    logoUrl: process.env.BRAND_LOGO_URL || '',
  },
  mortgage: {
    defaultRate: Number(process.env.MORTGAGE_DEFAULT_RATE || 16),
    defaultTermYears: Number(process.env.MORTGAGE_DEFAULT_TERM_YEARS || 20),
    defaultDownPercent: Number(process.env.MORTGAGE_DEFAULT_DOWN_PERCENT || 20),
  },
  features: {
    demoTour: boolEnv(process.env.FEATURE_DEMO_TOUR, true),
    demoAdminPreview: boolEnv(process.env.FEATURE_DEMO_ADMIN_PREVIEW, true),
  },
  admin: {
    token: (process.env.ADMIN_TOKEN || '').trim(),
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 40),
  },
};

export function publicAppConfig() {
  return {
    businessName: config.business.name,
    businessType: config.business.type,
    businessVertical: config.business.vertical,
    appTitle: config.business.title,
    appDescription: config.business.description,
    timezone: config.timezone,
    demoMode: config.allowDemoMode,
    adminProtected: Boolean(config.admin.token),
    currency: config.business.currency,
    currencySymbol: config.business.currencySymbol,
    branding: {
      accent: config.business.brandAccent,
      logoUrl: config.business.logoUrl || null,
    },
    mortgage: config.mortgage,
    features: {
      demoTour: config.features.demoTour,
      demoAdminPreview: config.features.demoAdminPreview,
    },
  };
}

export function isDemoAdminPreviewEnabled(
  cfg: {
    allowDemoMode: boolean;
    features: { demoAdminPreview: boolean };
  } = config,
): boolean {
  return cfg.allowDemoMode && cfg.features.demoAdminPreview;
}

export function isCrmConfigured(
  cfg: { crmAdapter: CrmAdapterName; crmBaseUrl: string } = config,
): boolean {
  return cfg.crmAdapter !== 'external' || Boolean(cfg.crmBaseUrl);
}

export function isPropertyProviderConfigured(
  cfg: { propertyAdapter: PropertyAdapterName; propertyProviderUrl: string } = config,
): boolean {
  return cfg.propertyAdapter !== 'external' || Boolean(cfg.propertyProviderUrl);
}
