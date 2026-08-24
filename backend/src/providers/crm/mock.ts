import type {
  Agent,
  BuyerProfile,
  Customer,
  Favorite,
  InteractionEvent,
  Lead,
  LeadScoreEvent,
  PropertyMatch,
  SellerLead,
  Viewing,
  ViewingDetails,
} from '../../types.js';
import type { Providers } from '../types.js';

let nextId = 1;
function id(): number {
  return nextId++;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * In-memory CRM adapter. Used when CRM_ADAPTER=mock.
 * Application services stay adapter-agnostic.
 */
export function createMockCrmSlice(): Pick<
  Providers,
  | 'customers'
  | 'profiles'
  | 'favorites'
  | 'matches'
  | 'leads'
  | 'scoreEvents'
  | 'agents'
  | 'viewings'
  | 'sellerLeads'
  | 'interactions'
  | 'idempotency'
> {
  const customers = new Map<number, Customer>();
  const customersByTg = new Map<number, number>();
  const profiles = new Map<number, BuyerProfile>();
  const favorites = new Map<string, Favorite>();
  const matches = new Map<number, PropertyMatch[]>();
  const leads = new Map<number, Lead>();
  const leadsByCustomer = new Map<number, number>();
  const scoreEvents = new Map<number, LeadScoreEvent[]>();
  const agents = new Map<number, Agent>();
  const viewings = new Map<number, ViewingDetails>();
  const sellerLeads = new Map<number, SellerLead>();
  const interactions: InteractionEvent[] = [];
  const idempotency = new Map<string, { key: string; scope: string; status: number; body: string; createdAt: string }>();

  const defaultAgent: Agent = {
    id: id(),
    name: 'Mock Agent',
    phone: '+7 900 000-00-00',
    email: 'mock@nordestate.demo',
    title: 'Брокер',
    specialization: 'mock',
    avatarUrl: null,
    active: true,
  };
  agents.set(defaultAgent.id, defaultAgent);

  return {
    customers: {
      upsert(user, extras) {
        const existingId = customersByTg.get(user.id);
        if (existingId) {
          const current = customers.get(existingId)!;
          const updated = {
            ...current,
            name: extras?.name ?? current.name,
            phone: extras?.phone ?? current.phone,
            updatedAt: nowIso(),
          };
          customers.set(existingId, updated);
          return { customer: updated, created: false };
        }
        const customer: Customer = {
          id: id(),
          telegramUserId: user.id,
          name: extras?.name || user.first_name || 'Клиент',
          username: user.username ?? null,
          phone: extras?.phone ?? null,
          consentAt: extras?.consentAt ?? null,
          utmSource: extras?.utmSource ?? null,
          utmMedium: extras?.utmMedium ?? null,
          utmCampaign: extras?.utmCampaign ?? null,
          utmContent: extras?.utmContent ?? null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        customers.set(customer.id, customer);
        customersByTg.set(user.id, customer.id);
        return { customer, created: true };
      },
      getById(customerId) {
        return customers.get(customerId);
      },
      getByTelegramUserId(telegramUserId) {
        const found = customersByTg.get(telegramUserId);
        return found ? customers.get(found) : undefined;
      },
      listAll() {
        return [...customers.values()];
      },
      update(customerId, patch) {
        const current = customers.get(customerId);
        if (!current) throw new Error('Customer not found');
        const updated = { ...current, ...patch, updatedAt: nowIso() };
        customers.set(customerId, updated);
        return updated;
      },
      deleteById(customerId) {
        const current = customers.get(customerId);
        if (current) customersByTg.delete(current.telegramUserId);
        customers.delete(customerId);
      },
    },
    profiles: {
      upsert(input) {
        const existing = [...profiles.values()].find((item) => item.customerId === input.customerId);
        const profile: BuyerProfile = {
          id: existing?.id ?? id(),
          ...input,
          createdAt: existing?.createdAt ?? nowIso(),
          updatedAt: nowIso(),
        };
        profiles.set(profile.id, profile);
        return profile;
      },
      getByCustomerId(customerId) {
        return [...profiles.values()].find((item) => item.customerId === customerId);
      },
      getById(profileId) {
        return profiles.get(profileId);
      },
      listAll() {
        return [...profiles.values()];
      },
    },
    favorites: {
      add(customerId, propertyId) {
        const key = `${customerId}:${propertyId}`;
        const existing = favorites.get(key);
        if (existing) return { favorite: existing, created: false };
        const favorite: Favorite = { id: id(), customerId, propertyId, createdAt: nowIso() };
        favorites.set(key, favorite);
        return { favorite, created: true };
      },
      remove(customerId, propertyId) {
        return favorites.delete(`${customerId}:${propertyId}`);
      },
      listByCustomer(customerId) {
        return [...favorites.values()].filter((item) => item.customerId === customerId);
      },
      has(customerId, propertyId) {
        return favorites.has(`${customerId}:${propertyId}`);
      },
    },
    matches: {
      replaceForProfile(buyerProfileId, items) {
        const stored = items.map((item) => ({ ...item, buyerProfileId, id: item.id ?? id() }));
        matches.set(buyerProfileId, stored);
        return stored;
      },
      listByProfile(buyerProfileId) {
        return matches.get(buyerProfileId) ?? [];
      },
    },
    leads: {
      upsertForCustomer(params) {
        const existingId = leadsByCustomer.get(params.customerId);
        if (existingId) {
          const current = leads.get(existingId)!;
          const updated: Lead = { ...current, ...params, updatedAt: nowIso() };
          leads.set(existingId, updated);
          return updated;
        }
        const lead: Lead = {
          id: id(),
          ...params,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        leads.set(lead.id, lead);
        leadsByCustomer.set(params.customerId, lead.id);
        return lead;
      },
      getById(leadId) {
        return leads.get(leadId);
      },
      getByCustomerId(customerId) {
        const found = leadsByCustomer.get(customerId);
        return found ? leads.get(found) : undefined;
      },
      list() {
        return [...leads.values()].sort((a, b) => b.score - a.score);
      },
      update(leadId, patch) {
        const current = leads.get(leadId);
        if (!current) throw new Error('Lead not found');
        const updated = { ...current, ...patch, updatedAt: nowIso() };
        leads.set(leadId, updated);
        return updated;
      },
    },
    scoreEvents: {
      add(params) {
        const event: LeadScoreEvent = { ...params, id: id() };
        const list = scoreEvents.get(params.leadId) ?? [];
        list.push(event);
        scoreEvents.set(params.leadId, list);
        return event;
      },
      listByLead(leadId) {
        return scoreEvents.get(leadId) ?? [];
      },
      replaceProfileEvents(leadId, events) {
        const kept = (scoreEvents.get(leadId) ?? []).filter(
          (event) => !['purchase_now', 'purchase_1_3_months', 'cash', 'mortgage_approved'].includes(event.eventType),
        );
        scoreEvents.set(
          leadId,
          kept.concat(events.map((event) => ({ ...event, id: id(), leadId }))),
        );
      },
    },
    agents: {
      list: () => [...agents.values()],
      getById: (agentId) => agents.get(agentId),
      pickForAssignment: () => defaultAgent,
    },
    viewings: {
      create(params) {
        const viewing: ViewingDetails = {
          ...params,
          id: id(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          history: [],
        };
        viewing.history.push({
          id: id(),
          viewingId: viewing.id,
          fromStatus: null,
          toStatus: viewing.status,
          note: 'created',
          createdAt: nowIso(),
        });
        viewings.set(viewing.id, viewing);
        return viewing;
      },
      getById(viewingId) {
        return viewings.get(viewingId);
      },
      list(filters) {
        return [...viewings.values()].filter((item) => {
          if (filters?.status && item.status !== filters.status) return false;
          if (filters?.customerId && item.customerId !== filters.customerId) return false;
          if (filters?.propertyId && item.propertyId !== filters.propertyId) return false;
          return true;
        });
      },
      listByCustomer(customerId) {
        return [...viewings.values()].filter((item) => item.customerId === customerId);
      },
      updateStatus(viewingId, status, note) {
        const current = viewings.get(viewingId);
        if (!current) throw new Error('Viewing not found');
        current.history.push({
          id: id(),
          viewingId,
          fromStatus: current.status,
          toStatus: status,
          note: note ?? null,
          createdAt: nowIso(),
        });
        const updated = { ...current, status, updatedAt: nowIso() };
        viewings.set(viewingId, updated);
        return updated;
      },
      occupiedSlots(propertyId, date) {
        return [...viewings.values()]
          .filter(
            (item) =>
              item.propertyId === propertyId &&
              item.scheduledAt.startsWith(date) &&
              (item.status === 'scheduled' || item.status === 'confirmed'),
          )
          .map((item) => item.scheduledAt);
      },
    },
    sellerLeads: {
      create(params) {
        const lead: SellerLead = { ...params, id: id(), createdAt: nowIso() };
        sellerLeads.set(lead.id, lead);
        return lead;
      },
      list(filters) {
        return [...sellerLeads.values()].filter((item) => !filters?.status || item.status === filters.status);
      },
      getById(sellerId) {
        return sellerLeads.get(sellerId);
      },
      updateStatus(sellerId, status) {
        const current = sellerLeads.get(sellerId);
        if (!current) throw new Error('Seller lead not found');
        const updated = { ...current, status };
        sellerLeads.set(sellerId, updated);
        return updated;
      },
    },
    interactions: {
      add(params) {
        const event: InteractionEvent = { ...params, id: id() };
        interactions.push(event);
        return event;
      },
      listByCustomer(customerId, limit = 100) {
        return interactions.filter((item) => item.customerId === customerId).slice(0, limit);
      },
      listAll(limit = 500) {
        return interactions.slice(0, limit);
      },
      hasEvent(customerId, eventType, entityType, entityId) {
        return interactions.some(
          (item) =>
            item.customerId === customerId &&
            item.eventType === eventType &&
            (entityType == null || item.entityType === entityType) &&
            (entityId == null || item.entityId === entityId),
        );
      },
      countByType() {
        const counts: Record<string, number> = {};
        for (const event of interactions) {
          counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
        }
        return counts;
      },
      uniqueCustomersByType() {
        const sets: Record<string, Set<number>> = {};
        for (const event of interactions) {
          sets[event.eventType] ??= new Set();
          sets[event.eventType].add(event.customerId);
        }
        return Object.fromEntries(Object.entries(sets).map(([key, value]) => [key, value.size]));
      },
    },
    idempotency: {
      get(key, scope) {
        return idempotency.get(`${scope}:${key}`);
      },
      put(record) {
        const stored = { ...record, createdAt: nowIso() };
        idempotency.set(`${record.scope}:${record.key}`, stored);
        return stored;
      },
    },
  };
}
