import { Router } from 'express';
import { z } from 'zod';
import type { AutomotiveProviders } from '../automotive.js';
import { LISTING_SORTS } from '../automotive.js';
import { authMiddleware, optionalAuthMiddleware, requireAuth } from '../middleware/auth.js';
import { addListingFavorite, getPublishedListing, listPublishedListings } from '../services/listings.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';

const optionalText = z.string().trim().min(1).max(80).optional();
const filtersSchema = z.object({
  brand: optionalText, model: optionalText, bodyType: optionalText, transmission: optionalText,
  driveType: optionalText, engineType: optionalText, city: optionalText,
  priceMin: z.coerce.number().int().nonnegative().optional(), priceMax: z.coerce.number().int().nonnegative().optional(),
  yearMin: z.coerce.number().int().min(1900).max(2100).optional(), yearMax: z.coerce.number().int().min(1900).max(2100).optional(),
  mileageMax: z.coerce.number().int().nonnegative().optional(), sort: z.enum(LISTING_SORTS).optional(),
});

export function createAutomotivePublicRouter(data: AutomotiveProviders): Router {
  const router = Router();
  router.get('/listings', optionalAuthMiddleware, asyncHandler((req, res) => ok(res, listPublishedListings(data, filtersSchema.parse(req.query)))));
  router.get('/listings/:id', optionalAuthMiddleware, asyncHandler((req, res) => ok(res, getPublishedListing(data, parseId(req.params.id)))));
  router.get('/vehicle-brands', (_req, res) => ok(res, data.catalog.brands()));
  router.get('/vehicle-models', (req, res) => ok(res, data.catalog.models(typeof req.query.brand === 'string' ? req.query.brand : undefined)));

  router.get('/me/favorites', authMiddleware, asyncHandler((req, res) => {
    const auth = requireAuth(req);
    const { customer } = data.customers.upsert(auth.telegramUser);
    ok(res, data.favorites.list(customer.id));
  }));
  router.post('/listings/:id/favorite', authMiddleware, asyncHandler((req, res) => {
    const auth = requireAuth(req);
    const { customer } = data.customers.upsert(auth.telegramUser);
    ok(res, addListingFavorite(data, customer.id, parseId(req.params.id)));
  }));
  router.delete('/listings/:id/favorite', authMiddleware, asyncHandler((req, res) => {
    const auth = requireAuth(req);
    const { customer } = data.customers.upsert(auth.telegramUser);
    ok(res, { removed: data.favorites.remove(customer.id, parseId(req.params.id)) });
  }));
  mountErrorHandler(router);
  return router;
}
