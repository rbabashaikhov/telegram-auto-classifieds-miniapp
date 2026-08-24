import { Router } from 'express';
import { z } from 'zod';
import { FEATURE_CODES, PROPERTY_STATUSES, PROPERTY_TYPES, VIEWING_STATUSES } from '../types.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
import { dashboardKpis, funnelAnalytics } from '../services/analytics.js';
import { crmHandoff } from '../services/crmHandoff.js';
import { persistMatches } from '../services/matching.js';
import { scoring } from '../services/scoring.js';
import { changeViewingStatus } from '../services/viewings.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';
import { serializeLead, serializeProperty, serializeSeller, serializeViewing } from './serialize.js';

export function createAdminRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(adminAuthMiddleware);

  router.get(
    '/dashboard',
    asyncHandler((_req, res) => {
      ok(res, dashboardKpis(data));
    }),
  );

  router.get(
    '/analytics',
    asyncHandler((_req, res) => {
      ok(res, funnelAnalytics(data));
    }),
  );

  router.get(
    '/leads',
    asyncHandler((req, res) => {
      const temperature = typeof req.query.temperature === 'string' ? req.query.temperature : undefined;
      const purchaseTiming = typeof req.query.purchaseTiming === 'string' ? req.query.purchaseTiming : undefined;
      const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;
      const budgetMin = req.query.budgetMin ? Number(req.query.budgetMin) : undefined;
      const budgetMax = req.query.budgetMax ? Number(req.query.budgetMax) : undefined;
      const leads = data.leads.list({
        temperature: temperature as 'HOT' | 'WARM' | 'COLD' | undefined,
        purchaseTiming: purchaseTiming as 'now' | '1_3_months' | '3_6_months' | 'exploring' | undefined,
        agentId: Number.isFinite(agentId) ? agentId : undefined,
        budgetMin: Number.isFinite(budgetMin) ? budgetMin : undefined,
        budgetMax: Number.isFinite(budgetMax) ? budgetMax : undefined,
      });
      ok(
        res,
        leads.map((lead) => {
          const customer = data.customers.getById(lead.customerId);
          const profile = lead.buyerProfileId ? data.profiles.getById(lead.buyerProfileId) : undefined;
          const matches = profile ? data.matches.listByProfile(profile.id) : [];
          const favorites = data.favorites.listByCustomer(lead.customerId);
          const activity = data.interactions.listByCustomer(lead.customerId, 1)[0];
          const agent = lead.agentId ? data.agents.getById(lead.agentId) : undefined;
          return {
            ...serializeLead(lead),
            customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
            budgetMin: profile?.budgetMin ?? null,
            budgetMax: profile?.budgetMax ?? null,
            purchaseTiming: profile?.purchaseTiming ?? null,
            payment: profile?.payment ?? null,
            matches: matches.length,
            favorites: favorites.length,
            latestActivity: activity
              ? { eventType: activity.eventType, timestamp: activity.timestamp }
              : null,
            agent: agent ? { id: agent.id, name: agent.name } : null,
          };
        }),
      );
    }),
  );

  router.get(
    '/leads/:id',
    asyncHandler((req, res) => {
      const lead = data.leads.getById(parseId(req.params.id));
      if (!lead) {
        res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } });
        return;
      }
      const handoff = crmHandoff(data, lead.customerId);
      const snapshot = scoring(data).snapshot(lead);
      const profile = data.profiles.getByCustomerId(lead.customerId);
      const matches = profile ? data.matches.listByProfile(profile.id) : [];
      ok(res, {
        lead: { ...serializeLead(lead), scoreBreakdown: snapshot },
        handoff,
        requirements: profile,
        financialReadiness: profile
          ? { payment: profile.payment, mortgageStatus: profile.mortgageStatus, budgetMin: profile.budgetMin, budgetMax: profile.budgetMax }
          : null,
        matches: matches.map((match) => ({
          ...match,
          property: serializeProperty(data.properties.getProperty(match.propertyId)!, match),
        })),
        favorites: data.favorites.listByCustomer(lead.customerId).map((item) => ({
          ...item,
          property: serializeProperty(data.properties.getProperty(item.propertyId)!),
        })),
        viewings: data.viewings.listByCustomer(lead.customerId).map(serializeViewing),
        timeline: data.interactions.listByCustomer(lead.customerId, 50),
        agent: lead.agentId ? data.agents.getById(lead.agentId) : null,
      });
    }),
  );

  router.post(
    '/leads/:id/assign',
    asyncHandler((req, res) => {
      const body = z.object({ agentId: z.number().int().positive().nullable() }).parse(req.body);
      ok(res, data.leads.update(parseId(req.params.id), { agentId: body.agentId }));
    }),
  );

  router.get(
    '/agents',
    asyncHandler((_req, res) => {
      ok(res, data.agents.list());
    }),
  );

  router.get(
    '/properties',
    asyncHandler((_req, res) => {
      ok(res, {
        projects: data.properties.listProjects(),
        properties: data.properties.listProperties().map((property) => serializeProperty(property)),
      });
    }),
  );

  router.post(
    '/properties',
    asyncHandler((req, res) => {
      const body = z
        .object({
          projectId: z.number().int().positive(),
          unitNumber: z.string().min(1),
          rooms: z.enum(['studio', '1', '2', '3plus']),
          roomsCount: z.number().int().nonnegative(),
          area: z.number().positive(),
          floor: z.number().int().positive(),
          floorsTotal: z.number().int().positive(),
          price: z.number().int().positive(),
          finish: z.enum(['finished', 'white_box', 'unfinished']),
          status: z.enum(PROPERTY_STATUSES).default('available'),
          completionDate: z.string(),
          gallery: z.array(z.string()).default([]),
          description: z.string().default(''),
          active: z.boolean().default(true),
          features: z.array(z.object({ code: z.enum(FEATURE_CODES), label: z.string().optional() })).default([]),
        })
        .parse(req.body);
      const created = data.properties.createProperty({
        ...body,
        features: body.features.map((feature) => ({ code: feature.code, label: feature.label || feature.code })),
      });
      for (const profile of data.profiles.listAll()) {
        persistMatches(data, profile);
      }
      ok(res, serializeProperty(created), 201);
    }),
  );

  router.patch(
    '/properties/:id',
    asyncHandler((req, res) => {
      const body = z
        .object({
          unitNumber: z.string().optional(),
          price: z.number().int().positive().optional(),
          status: z.enum(PROPERTY_STATUSES).optional(),
          active: z.boolean().optional(),
          description: z.string().optional(),
          finish: z.enum(['finished', 'white_box', 'unfinished']).optional(),
        })
        .parse(req.body);
      const updated = data.properties.updateProperty(parseId(req.params.id), body);
      for (const profile of data.profiles.listAll()) persistMatches(data, profile);
      ok(res, serializeProperty(updated));
    }),
  );

  router.post(
    '/projects',
    asyncHandler((req, res) => {
      const body = z
        .object({
          slug: z.string().min(1),
          name: z.string().min(1),
          district: z.enum(['primorsky', 'moskovsky', 'central', 'vyborgsky', 'vasileostrovsky']),
          address: z.string().min(1),
          description: z.string(),
          propertyType: z.enum(PROPERTY_TYPES),
          completionDate: z.string(),
          imageUrl: z.string().default('/images/projects/harbor.svg'),
          gallery: z.array(z.string()).default([]),
          features: z.array(z.enum(FEATURE_CODES)).default([]),
          active: z.boolean().default(true),
          displayOrder: z.number().int().default(0),
        })
        .parse(req.body);
      ok(res, data.properties.createProject(body), 201);
    }),
  );

  router.get(
    '/viewings',
    asyncHandler((req, res) => {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      ok(
        res,
        data.viewings
          .list({ status: status as (typeof VIEWING_STATUSES)[number] | undefined })
          .map((viewing) => ({
            ...serializeViewing(viewing),
            customer: data.customers.getById(viewing.customerId),
            property: serializeProperty(data.properties.getProperty(viewing.propertyId)!),
            agent: viewing.agentId ? data.agents.getById(viewing.agentId) : null,
          })),
      );
    }),
  );

  router.post(
    '/viewings/:id/status',
    asyncHandler((req, res) => {
      const body = z.object({ status: z.enum(VIEWING_STATUSES), note: z.string().optional() }).parse(req.body);
      ok(res, serializeViewing(changeViewingStatus(data, parseId(req.params.id), body.status, body.note)));
    }),
  );

  router.get(
    '/seller-leads',
    asyncHandler((_req, res) => {
      ok(
        res,
        data.sellerLeads.list().map((lead) => ({
          ...serializeSeller(lead),
          customer: data.customers.getById(lead.customerId),
        })),
      );
    }),
  );

  router.post(
    '/seller-leads/:id/status',
    asyncHandler((req, res) => {
      const body = z.object({ status: z.enum(['new', 'contacted', 'qualified', 'closed']) }).parse(req.body);
      ok(res, serializeSeller(data.sellerLeads.updateStatus(parseId(req.params.id), body.status)));
    }),
  );

  mountErrorHandler(router);
  return router;
}

export const adminRouter = createAdminRouter();
