import { Router } from 'express';
import type { AutomotiveProviders } from '../automotive.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { isDemoAdminPreviewEnabled } from '../config.js';
import { AppError } from '../errors.js';
import { mountErrorHandler, ok, parseId } from './helpers.js';
import { z } from 'zod';
import { LISTING_STATUSES } from '../automotive.js';
import { adminListingDetails, approveListing, rejectListing } from '../services/moderation.js';
import { PAYMENT_STATUSES, type PaymentDetails, type PaymentRepository } from '../payments.js';

function paymentAdminDetails(data: AutomotiveProviders, payment: PaymentDetails) {
  const listing = data.catalog.get(payment.listingId, false);
  const customer = data.customers.getById(payment.customerId);
  return { ...payment, listing: listing ? { id: listing.id, title: `${listing.brand.name} ${listing.model.name}, ${listing.year}` } : null,
    customer: customer ? { id: customer.id, name: customer.name, username: customer.username } : null };
}

export function createAutomotiveAdminRouter(data: AutomotiveProviders, payments: PaymentRepository): Router {
  const router = Router();
  router.use(adminAuthMiddleware);
  router.get('/listings', (req, res) => {
    const status = z.enum(LISTING_STATUSES).optional().parse(req.query.status);
    const listings = data.catalog.list({}, false);
    ok(res, status ? listings.filter((item) => item.status === status) : listings);
  });
  router.get('/listings/:id', (req, res) => {
    ok(res, adminListingDetails(data, parseId(req.params.id)));
  });
  router.get('/payments', (req, res) => {
    const status = z.enum(PAYMENT_STATUSES).optional().parse(req.query.status);
    ok(res, payments.listAll(status).map((payment) => paymentAdminDetails(data, payment)));
  });
  router.get('/payments/:id', (req, res) => {
    const payment = payments.getDetails(parseId(req.params.id));
    if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    ok(res, paymentAdminDetails(data, payment));
  });
  router.post('/listings/:id/approve', (req, res) => ok(res, approveListing(data, parseId(req.params.id))));
  router.post('/listings/:id/reject', (req, res) => {
    const { reason } = z.object({ reason: z.string().trim().min(5).max(1000) }).parse(req.body);
    ok(res, rejectListing(data, parseId(req.params.id), reason));
  });
  mountErrorHandler(router);
  return router;
}

export function createAutomotiveDemoAdminRouter(data: AutomotiveProviders, payments: PaymentRepository): Router {
  const router = Router();
  router.use((_req, _res, next) => isDemoAdminPreviewEnabled() ? next() : next(new AppError('Demo admin disabled', 404, 'NOT_FOUND')));
  router.get('/listings', (req, res) => {
    const status = z.enum(LISTING_STATUSES).optional().parse(req.query.status);
    const listings = data.catalog.list({}, false);
    ok(res, status ? listings.filter((item) => item.status === status) : listings);
  });
  router.get('/listings/:id', (req, res) => {
    ok(res, adminListingDetails(data, parseId(req.params.id)));
  });
  router.get('/payments', (req, res) => {
    const status = z.enum(PAYMENT_STATUSES).optional().parse(req.query.status);
    ok(res, payments.listAll(status).map((payment) => paymentAdminDetails(data, payment)));
  });
  router.get('/payments/:id', (req, res) => {
    const payment = payments.getDetails(parseId(req.params.id));
    if (!payment) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    ok(res, paymentAdminDetails(data, payment));
  });
  router.all('*', (_req, _res, next) => next(new AppError('Demo admin is read-only', 405, 'DEMO_ADMIN_READ_ONLY')));
  mountErrorHandler(router);
  return router;
}
