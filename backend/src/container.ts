import { db } from './db/schema.js';
import { createAutomotiveProviders } from './providers/local/automotiveSqlite.js';
import { LocalFileStorage } from './providers/local/fileStorage.js';
import { config } from './config.js';
import { createPaymentProvider } from './providers/payments.js';

export const providers = createAutomotiveProviders(db);
export const fileStorage = new LocalFileStorage(config.uploadsDir);
export const paymentRepository = providers.payments;
export const paymentProvider = createPaymentProvider(config.paymentProvider);
