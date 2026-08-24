import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { AutomotiveProviders } from '../automotive.js';
import { AppError } from '../errors.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import type { PaymentProvider, PaymentRepository } from '../payments.js';
import { applyPaymentEvent, createListingPayment, paymentStatusForListing, transitionPayment } from '../services/payments.js';
import { asyncHandler, mountErrorHandler, ok, parseId, readIdempotencyKey } from './helpers.js';

function customerId(req: Parameters<typeof requireAuth>[0], data: AutomotiveProviders): number {
  return data.customers.upsert(requireAuth(req).telegramUser).customer.id;
}

export interface PaymentRuntime { demoEnabled: boolean }

export function createPaymentsRouter(data: AutomotiveProviders, payments: PaymentRepository, provider: PaymentProvider,
  runtime: PaymentRuntime, authenticate: RequestHandler = authMiddleware): Router {
  const router = Router();
  router.get('/tariffs', (_req, res) => ok(res, payments.listActiveTariffs()));

  router.use('/me/payments', authenticate);
  router.use('/me/listings/:id/payments', authenticate);
  router.use('/me/listings/:id/payment-status', authenticate);
  router.get('/me/payments', (req, res) => ok(res, payments.listByCustomer(customerId(req, data))));
  router.get('/me/payments/:id', (req, res) => {
    const payment = payments.getDetails(parseId(req.params.id));
    if (!payment || payment.customerId !== customerId(req, data)) throw new AppError('Payment not found', 404, 'NOT_FOUND');
    ok(res, payment);
  });
  router.post('/me/listings/:id/payments', asyncHandler(async (req, res) => {
    const { tariffId } = z.object({ tariffId: z.number().int().positive(), idempotencyKey: z.string().optional() }).parse(req.body);
    ok(res, await createListingPayment({ data, payments, provider, customerId: customerId(req, data), listingId: parseId(req.params.id),
      tariffId, idempotencyKey: readIdempotencyKey(req) }), 201);
  }));
  router.get('/me/listings/:id/payment-status', (req, res) => ok(res, paymentStatusForListing(data, payments, customerId(req, data), parseId(req.params.id))));

  router.use('/demo-payments', authenticate);
  router.post('/demo-payments/:id/:action', (req, res) => {
    if (!runtime.demoEnabled || provider.name !== 'demo') throw new AppError('Demo payments are disabled', 404, 'NOT_FOUND');
    const action = z.enum(['succeed', 'fail', 'cancel']).parse(req.params.action);
    const status = { succeed: 'paid', fail: 'failed', cancel: 'cancelled' }[action] as 'paid' | 'failed' | 'cancelled';
    ok(res, transitionPayment(payments, parseId(req.params.id), customerId(req, data), status));
  });

  router.post('/payments/webhook/:provider', asyncHandler(async (req, res) => {
    if (req.params.provider !== provider.name) throw new AppError('Payment provider not configured', 501, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
    const event = await provider.handleWebhook(req.body, req.headers);
    ok(res, applyPaymentEvent(payments, provider.name, event));
  }));
  mountErrorHandler(router);
  return router;
}
