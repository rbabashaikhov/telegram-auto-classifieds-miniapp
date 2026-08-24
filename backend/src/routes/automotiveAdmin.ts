import { Router } from 'express';
import type { AutomotiveProviders } from '../automotive.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { isDemoAdminPreviewEnabled } from '../config.js';
import { AppError } from '../errors.js';
import { mountErrorHandler, ok, parseId } from './helpers.js';

export function createAutomotiveAdminRouter(data: AutomotiveProviders): Router {
  const router = Router();
  router.use(adminAuthMiddleware);
  router.get('/listings', (_req, res) => ok(res, data.catalog.list({}, false)));
  router.get('/listings/:id', (req, res) => {
    const item = data.catalog.get(parseId(req.params.id), false);
    if (!item) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    ok(res, item);
  });
  mountErrorHandler(router);
  return router;
}

export function createAutomotiveDemoAdminRouter(data: AutomotiveProviders): Router {
  const router = Router();
  router.use((_req, _res, next) => isDemoAdminPreviewEnabled() ? next() : next(new AppError('Demo admin disabled', 404, 'NOT_FOUND')));
  router.get('/listings', (_req, res) => ok(res, data.catalog.list({}, false)));
  router.get('/listings/:id', (req, res) => {
    const item = data.catalog.get(parseId(req.params.id), false);
    if (!item) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    ok(res, item);
  });
  router.all('*', (_req, _res, next) => next(new AppError('Demo admin is read-only', 405, 'DEMO_READ_ONLY')));
  mountErrorHandler(router);
  return router;
}
