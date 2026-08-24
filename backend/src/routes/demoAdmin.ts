import { Router } from 'express';
import { isDemoAdminPreviewEnabled } from '../config.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
import { dashboardKpis, funnelAnalytics } from '../services/analytics.js';
import { crmHandoff } from '../services/crmHandoff.js';
import { scoring } from '../services/scoring.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';
import { serializeLead, serializeProperty, serializeSeller, serializeViewing } from './serialize.js';

export function createDemoAdminRouter(
  data: Providers = defaultProviders,
  options?: { isEnabled?: () => boolean },
): Router {
  const router = Router();
  const isEnabled = options?.isEnabled ?? (() => isDemoAdminPreviewEnabled());

  router.use((req, res, next) => {
    if (!isEnabled()) {
      res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({
        ok: false,
        error: { code: 'DEMO_READ_ONLY', message: 'Demo admin is read-only' },
      });
      return;
    }
    next();
  });

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
    asyncHandler((_req, res) => {
      ok(
        res,
        data.leads.list().map((lead) => {
          const customer = data.customers.getById(lead.customerId);
          const profile = lead.buyerProfileId ? data.profiles.getById(lead.buyerProfileId) : undefined;
          return {
            ...serializeLead(lead),
            customer: customer ? { id: customer.id, name: customer.name } : null,
            purchaseTiming: profile?.purchaseTiming ?? null,
            payment: profile?.payment ?? null,
            budgetMin: profile?.budgetMin ?? null,
            budgetMax: profile?.budgetMax ?? null,
            matches: profile ? data.matches.listByProfile(profile.id).length : 0,
            favorites: data.favorites.listByCustomer(lead.customerId).length,
            agent: lead.agentId ? data.agents.getById(lead.agentId) : null,
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
      ok(res, {
        lead: { ...serializeLead(lead), scoreBreakdown: scoring(data).snapshot(lead) },
        handoff: crmHandoff(data, lead.customerId),
        timeline: data.interactions.listByCustomer(lead.customerId, 50),
        matches: (lead.buyerProfileId ? data.matches.listByProfile(lead.buyerProfileId) : []).map((match) => ({
          ...match,
          property: serializeProperty(data.properties.getProperty(match.propertyId)!, match),
        })),
      });
    }),
  );

  router.get(
    '/viewings',
    asyncHandler((_req, res) => {
      ok(res, data.viewings.list().map(serializeViewing));
    }),
  );

  router.get(
    '/seller-leads',
    asyncHandler((_req, res) => {
      ok(res, data.sellerLeads.list().map(serializeSeller));
    }),
  );

  mountErrorHandler(router);
  return router;
}

export const demoAdminRouter = createDemoAdminRouter();
