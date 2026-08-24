import { Router } from 'express';
import { z } from 'zod';
import { calculateMortgage } from '../domain/mortgage.js';
import { config } from '../config.js';
import { DISTRICTS, FEATURE_CODES, PAYMENT_METHODS, PROPERTY_TYPES, PURCHASE_GOALS, PURCHASE_TIMINGS, ROOM_OPTIONS, SELLER_CONDITIONS, VIEWING_TYPES } from '../types.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { writeRateLimit } from '../middleware/rateLimit.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
import { ensureCustomer, resetCustomer, trackEvent } from '../services/customers.js';
import { addFavorite, removeFavorite } from '../services/favorites.js';
import { computeMatches } from '../services/matching.js';
import { saveQualification } from '../services/qualification.js';
import { createSellerLead } from '../services/sellerLeads.js';
import { recordManagerContact, recordPaymentCalculated, recordPropertyView } from '../services/intent.js';
import { cancelViewing, requestViewing, viewingSlots } from '../services/viewings.js';
import { scoring } from '../services/scoring.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';
import { serializeCustomer, serializeProfile, serializeProperty, serializeSeller, serializeViewing } from './serialize.js';

const qualificationSchema = z.object({
  goal: z.enum(PURCHASE_GOALS),
  propertyType: z.enum(PROPERTY_TYPES),
  locations: z.array(z.string()).min(1),
  budgetMin: z.number().int().nonnegative(),
  budgetMax: z.number().int().positive(),
  rooms: z.enum(ROOM_OPTIONS),
  purchaseTiming: z.enum(PURCHASE_TIMINGS),
  payment: z.enum(PAYMENT_METHODS),
  mortgageStatus: z.enum(['approved', 'application_in_progress', 'not_applied']).nullable().optional(),
  preferences: z.array(z.enum(FEATURE_CODES)).default([]),
  areaMin: z.number().int().positive().nullable().optional(),
  areaMax: z.number().int().positive().nullable().optional(),
  consent: z.literal(true),
  utm: z
    .object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmContent: z.string().optional(),
    })
    .optional(),
});

const previewSchema = qualificationSchema.omit({ consent: true }).partial({
  locations: true,
  budgetMin: true,
  budgetMax: true,
  rooms: true,
  purchaseTiming: true,
  payment: true,
  propertyType: true,
  goal: true,
});

const sellerSchema = z.object({
  location: z.enum(DISTRICTS),
  propertyType: z.enum(PROPERTY_TYPES),
  rooms: z.enum(ROOM_OPTIONS),
  area: z.number().positive(),
  condition: z.enum(SELLER_CONDITIONS),
  desiredPrice: z.number().int().positive(),
  saleTiming: z.enum(PURCHASE_TIMINGS),
  comment: z.string().max(1000).optional(),
  contact: z.string().max(80).optional(),
  consent: z.literal(true),
});

const viewingSchema = z.object({
  propertyId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  type: z.enum(VIEWING_TYPES),
});

function customerFrom(req: Parameters<typeof requireAuth>[0], data: Providers) {
  const auth = requireAuth(req);
  return ensureCustomer(data, auth.telegramUser);
}

export function createPublicRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get(
    '/catalog',
    asyncHandler((_req, res) => {
      const projects = data.properties.listProjects(true);
      const properties = data.properties.listProperties({ activeOnly: true, status: 'available' });
      ok(res, {
        projects,
        properties: properties.map((property) => serializeProperty(property)),
      });
    }),
  );

  router.get(
    '/properties/:id',
    asyncHandler((req, res) => {
      const property = data.properties.getProperty(parseId(req.params.id));
      if (!property) {
        res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Property not found' } });
        return;
      }
      const customer = customerFrom(req, data);
      const profile = data.profiles.getByCustomerId(customer.id);
      const match = profile
        ? data.matches.listByProfile(profile.id).find((item) => item.propertyId === property.id)
        : undefined;
      ok(res, {
        ...serializeProperty(property, match),
        favorited: data.favorites.has(customer.id, property.id),
      });
    }),
  );

  router.post(
    '/properties/:id/view',
    writeRateLimit,
    asyncHandler((req, res) => {
      const propertyId = parseId(req.params.id);
      const customer = customerFrom(req, data);
      const result = recordPropertyView(data, customer.id, propertyId);
      ok(res, { eventType: result.eventType });
    }),
  );

  router.post(
    '/events',
    writeRateLimit,
    asyncHandler((req, res) => {
      const body = z
        .object({
          eventType: z.enum([
            'app_opened',
            'qualification_started',
            'matches_opened',
            'viewing_started',
          ]),
          entityType: z.string().nullable().optional(),
          entityId: z.number().int().positive().nullable().optional(),
          utm: z
            .object({
              utmSource: z.string().optional(),
              utmMedium: z.string().optional(),
              utmCampaign: z.string().optional(),
              utmContent: z.string().optional(),
            })
            .optional(),
        })
        .parse(req.body);
      const customer = ensureCustomer(data, requireAuth(req).telegramUser, body.utm);
      ok(res, trackEvent(data, { customerId: customer.id, ...body, utm: body.utm }));
    }),
  );

  router.get(
    '/me',
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      const profile = data.profiles.getByCustomerId(customer.id) ?? null;
      const lead = data.leads.getByCustomerId(customer.id) ?? null;
      const favorites = data.favorites.listByCustomer(customer.id);
      const viewings = data.viewings.listByCustomer(customer.id);
      const matches = profile ? data.matches.listByProfile(profile.id) : [];
      ok(res, {
        customer: serializeCustomer(customer),
        profile: profile ? serializeProfile(profile) : null,
        lead: lead
          ? {
              ...lead,
              scoreBreakdown: scoring(data).snapshot(lead),
            }
          : null,
        favorites: favorites.map((item) => ({
          ...item,
          property: serializeProperty(data.properties.getProperty(item.propertyId)!),
        })),
        viewings: viewings.map(serializeViewing),
        matches: matches.map((match) => ({
          ...match,
          property: serializeProperty(data.properties.getProperty(match.propertyId)!, match),
        })),
      });
    }),
  );

  router.post(
    '/me/reset',
    writeRateLimit,
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      resetCustomer(data, customer.id);
      ok(res, { reset: true });
    }),
  );

  router.post(
    '/qualification',
    writeRateLimit,
    asyncHandler((req, res) => {
      const body = qualificationSchema.parse(req.body);
      if (body.budgetMax < body.budgetMin) {
        res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid budget range' } });
        return;
      }
      const customer = ensureCustomer(data, requireAuth(req).telegramUser, {
        ...body.utm,
        consentAt: new Date().toISOString(),
      });
      const result = saveQualification(data, {
        customerId: customer.id,
        goal: body.goal,
        propertyType: body.propertyType,
        locations: body.locations,
        budgetMin: body.budgetMin,
        budgetMax: body.budgetMax,
        rooms: body.rooms,
        purchaseTiming: body.purchaseTiming,
        payment: body.payment,
        mortgageStatus: body.payment === 'mortgage' ? body.mortgageStatus ?? null : null,
        preferences: body.preferences,
        areaMin: body.areaMin ?? null,
        areaMax: body.areaMax ?? null,
        consentAt: new Date().toISOString(),
      });
      ok(res, {
        profile: serializeProfile(result.profile),
        lead: result.lead,
        matches: result.matches.map((match) => ({
          ...match,
          property: serializeProperty(data.properties.getProperty(match.propertyId)!, match),
        })),
      });
    }),
  );

  router.post(
    '/matches/preview',
    asyncHandler((req, res) => {
      const body = previewSchema.parse(req.body);
      const matches = computeMatches(
        {
          id: 0,
          customerId: 0,
          goal: body.goal ?? 'own_use',
          propertyType: body.propertyType ?? 'new_build',
          locations: body.locations ?? [],
          budgetMin: body.budgetMin ?? 0,
          budgetMax: body.budgetMax ?? 100_000_000,
          rooms: body.rooms ?? '2',
          purchaseTiming: body.purchaseTiming ?? 'exploring',
          payment: body.payment ?? 'undecided',
          mortgageStatus: body.mortgageStatus ?? null,
          preferences: body.preferences ?? [],
          areaMin: body.areaMin ?? null,
          areaMax: body.areaMax ?? null,
          consentAt: '',
          createdAt: '',
          updatedAt: '',
        },
        data,
      );
      ok(
        res,
        matches.map((match) => ({
          ...match,
          property: serializeProperty(data.properties.getProperty(match.propertyId)!, match),
        })),
      );
    }),
  );

  router.get(
    '/matches',
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      const profile = data.profiles.getByCustomerId(customer.id);
      if (!profile) {
        ok(res, []);
        return;
      }
      trackEvent(data, { customerId: customer.id, eventType: 'matches_opened' });
      const matches = data.matches.listByProfile(profile.id);
      ok(
        res,
        matches.map((match) => ({
          ...match,
          property: serializeProperty(data.properties.getProperty(match.propertyId)!, match),
        })),
      );
    }),
  );

  router.post(
    '/favorites/:propertyId',
    writeRateLimit,
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      const result = addFavorite(data, customer.id, parseId(req.params.propertyId));
      ok(res, result);
    }),
  );

  router.delete(
    '/favorites/:propertyId',
    writeRateLimit,
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      ok(res, { removed: removeFavorite(data, customer.id, parseId(req.params.propertyId)) });
    }),
  );

  router.post(
    '/mortgage',
    asyncHandler((req, res) => {
      const body = z
        .object({
          propertyId: z.number().int().positive().optional(),
          price: z.number().positive(),
          downPayment: z.number().nonnegative(),
          annualRatePercent: z.number().nonnegative().default(config.mortgage.defaultRate),
          termYears: z.number().int().positive().default(config.mortgage.defaultTermYears),
        })
        .parse(req.body);
      const result = calculateMortgage(body);
      if (body.propertyId) {
        const customer = customerFrom(req, data);
        recordPaymentCalculated(data, customer.id, body.propertyId);
      }
      ok(res, result);
    }),
  );

  router.get(
    '/properties/:id/slots',
    asyncHandler((req, res) => {
      const date = String(req.query.date || '');
      ok(res, viewingSlots(data, parseId(req.params.id), date));
    }),
  );

  router.post(
    '/viewings',
    writeRateLimit,
    asyncHandler((req, res) => {
      const body = viewingSchema.parse(req.body);
      const customer = customerFrom(req, data);
      const viewing = requestViewing(data, {
        customerId: customer.id,
        propertyId: body.propertyId,
        scheduledAt: `${body.date}T${body.time}:00`,
        type: body.type,
      });
      ok(res, serializeViewing({ ...viewing, history: data.viewings.getById(viewing.id)?.history ?? [] }));
    }),
  );

  router.post(
    '/viewings/:id/cancel',
    writeRateLimit,
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      ok(res, serializeViewing(cancelViewing(data, parseId(req.params.id), customer.id)));
    }),
  );

  router.post(
    '/contact-manager',
    writeRateLimit,
    asyncHandler((req, res) => {
      const customer = customerFrom(req, data);
      ok(res, recordManagerContact(data, customer.id));
    }),
  );

  router.post(
    '/seller-leads',
    writeRateLimit,
    asyncHandler((req, res) => {
      const body = sellerSchema.parse(req.body);
      const customer = customerFrom(req, data);
      const lead = createSellerLead(data, {
        customerId: customer.id,
        location: body.location,
        propertyType: body.propertyType,
        rooms: body.rooms,
        area: body.area,
        condition: body.condition,
        desiredPrice: body.desiredPrice,
        saleTiming: body.saleTiming,
        comment: body.comment ?? null,
        contact: body.contact ?? null,
      });
      ok(res, serializeSeller(lead));
    }),
  );

  mountErrorHandler(router);
  return router;
}

export const publicRouter = createPublicRouter();
