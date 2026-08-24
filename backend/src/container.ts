import { db } from './db/schema.js';
import { createAutomotiveProviders } from './providers/local/automotiveSqlite.js';

export const providers = createAutomotiveProviders(db);
