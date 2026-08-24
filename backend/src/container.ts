import { db } from './db/schema.js';
import { createAutomotiveProviders } from './providers/local/automotiveSqlite.js';
import { LocalFileStorage } from './providers/local/fileStorage.js';
import { config } from './config.js';

export const providers = createAutomotiveProviders(db);
export const fileStorage = new LocalFileStorage(config.uploadsDir);
