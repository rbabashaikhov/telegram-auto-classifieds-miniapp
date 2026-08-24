import type Database from 'better-sqlite3';
import { FEATURE_LABELS } from '../../types.js';
import type {
  Agent,
  BuyerProfile,
  BusinessEvent,
  Customer,
  Favorite,
  FeatureCode,
  IdempotencyRecord,
  InteractionEvent,
  Lead,
  LeadScoreEvent,
  OutboundEventName,
  Property,
  PropertyDetails,
  PropertyFeature,
  PropertyMatch,
  PropertyProject,
  SellerLead,
  TelegramUser,
  Viewing,
  ViewingDetails,
  ViewingHistory,
} from '../../types.js';
import type {
  AgentProvider,
  BuyerProfileProvider,
  CustomerProvider,
  EventProvider,
  FavoriteProvider,
  IdempotencyProvider,
  InteractionProvider,
  LeadProvider,
  LeadScoreEventProvider,
  MatchStoreProvider,
  PropertyCatalogProvider,
  Providers,
  SellerLeadProvider,
  ViewingProvider,
} from '../types.js';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: Number(row.id),
    telegramUserId: Number(row.telegram_user_id),
    name: String(row.name),
    username: (row.username as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    consentAt: (row.consent_at as string | null) ?? null,
    utmSource: (row.utm_source as string | null) ?? null,
    utmMedium: (row.utm_medium as string | null) ?? null,
    utmCampaign: (row.utm_campaign as string | null) ?? null,
    utmContent: (row.utm_content as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProfile(row: Record<string, unknown>): BuyerProfile {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    goal: row.goal as BuyerProfile['goal'],
    propertyType: row.property_type as BuyerProfile['propertyType'],
    locations: parseJson<string[]>(String(row.locations), []),
    budgetMin: Number(row.budget_min),
    budgetMax: Number(row.budget_max),
    rooms: row.rooms as BuyerProfile['rooms'],
    purchaseTiming: row.purchase_timing as BuyerProfile['purchaseTiming'],
    payment: row.payment as BuyerProfile['payment'],
    mortgageStatus: (row.mortgage_status as BuyerProfile['mortgageStatus']) ?? null,
    preferences: parseJson<FeatureCode[]>(String(row.preferences), []),
    areaMin: row.area_min == null ? null : Number(row.area_min),
    areaMax: row.area_max == null ? null : Number(row.area_max),
    consentAt: String(row.consent_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProject(row: Record<string, unknown>): PropertyProject {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    district: row.district as PropertyProject['district'],
    address: String(row.address),
    description: String(row.description),
    propertyType: row.property_type as PropertyProject['propertyType'],
    completionDate: String(row.completion_date),
    imageUrl: String(row.image_url),
    gallery: parseJson<string[]>(String(row.gallery), []),
    features: parseJson<FeatureCode[]>(String(row.features), []),
    active: Boolean(row.active),
    displayOrder: Number(row.display_order),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProperty(row: Record<string, unknown>): Property {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    unitNumber: String(row.unit_number),
    rooms: row.rooms as Property['rooms'],
    roomsCount: Number(row.rooms_count),
    area: Number(row.area),
    floor: Number(row.floor),
    floorsTotal: Number(row.floors_total),
    price: Number(row.price),
    finish: row.finish as Property['finish'],
    status: row.status as Property['status'],
    completionDate: String(row.completion_date),
    gallery: parseJson<string[]>(String(row.gallery), []),
    description: String(row.description),
    active: Boolean(row.active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapFeature(row: Record<string, unknown>): PropertyFeature {
  return {
    id: Number(row.id),
    propertyId: Number(row.property_id),
    code: row.code as FeatureCode,
    label: String(row.label),
  };
}

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    buyerProfileId: row.buyer_profile_id == null ? null : Number(row.buyer_profile_id),
    agentId: row.agent_id == null ? null : Number(row.agent_id),
    score: Number(row.score),
    temperature: row.temperature as Lead['temperature'],
    status: row.status as Lead['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapScoreEvent(row: Record<string, unknown>): LeadScoreEvent {
  return {
    id: Number(row.id),
    leadId: Number(row.lead_id),
    eventType: String(row.event_type),
    delta: Number(row.delta),
    reason: String(row.reason),
    scoreAfter: Number(row.score_after),
    entityType: (row.entity_type as string | null) ?? null,
    entityId: row.entity_id == null ? null : Number(row.entity_id),
    metadata: parseJson<Record<string, unknown> | null>(row.metadata as string | null, null),
    createdAt: String(row.created_at),
  };
}

function mapAgent(row: Record<string, unknown>): Agent {
  return {
    id: Number(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    title: String(row.title),
    specialization: String(row.specialization),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    active: Boolean(row.active),
  };
}

function mapViewing(row: Record<string, unknown>): Viewing {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    propertyId: Number(row.property_id),
    agentId: row.agent_id == null ? null : Number(row.agent_id),
    scheduledAt: String(row.scheduled_at),
    type: row.type as Viewing['type'],
    status: row.status as Viewing['status'],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSeller(row: Record<string, unknown>): SellerLead {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    location: String(row.location),
    propertyType: row.property_type as SellerLead['propertyType'],
    rooms: row.rooms as SellerLead['rooms'],
    area: Number(row.area),
    condition: row.condition as SellerLead['condition'],
    desiredPrice: Number(row.desired_price),
    saleTiming: row.sale_timing as SellerLead['saleTiming'],
    comment: (row.comment as string | null) ?? null,
    contact: (row.contact as string | null) ?? null,
    status: row.status as SellerLead['status'],
    createdAt: String(row.created_at),
  };
}

function mapInteraction(row: Record<string, unknown>): InteractionEvent {
  return {
    id: Number(row.id),
    customerId: Number(row.customer_id),
    eventType: row.event_type as InteractionEvent['eventType'],
    entityType: (row.entity_type as string | null) ?? null,
    entityId: row.entity_id == null ? null : Number(row.entity_id),
    timestamp: String(row.timestamp),
    metadata: parseJson<Record<string, unknown> | null>(row.metadata as string | null, null),
    utmSource: (row.utm_source as string | null) ?? null,
    utmMedium: (row.utm_medium as string | null) ?? null,
    utmCampaign: (row.utm_campaign as string | null) ?? null,
    utmContent: (row.utm_content as string | null) ?? null,
  };
}

export function createLocalProviders(database: Database.Database): Providers {
  const customerGet = database.prepare('SELECT * FROM customers WHERE id = ?');
  const customerByTg = database.prepare('SELECT * FROM customers WHERE telegram_user_id = ?');

  const customers: CustomerProvider = {
    upsert(user: TelegramUser, extras) {
      const existing = customerByTg.get(user.id) as Record<string, unknown> | undefined;
      const name =
        extras?.name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.username ||
        'Клиент';
      if (existing) {
        const updated = database
          .prepare(
            `UPDATE customers SET
              name = COALESCE(?, name),
              username = COALESCE(?, username),
              phone = COALESCE(?, phone),
              consent_at = COALESCE(?, consent_at),
              utm_source = COALESCE(?, utm_source),
              utm_medium = COALESCE(?, utm_medium),
              utm_campaign = COALESCE(?, utm_campaign),
              utm_content = COALESCE(?, utm_content),
              updated_at = ?
            WHERE id = ?`,
          )
          .run(
            extras?.name ?? name,
            user.username ?? null,
            extras?.phone ?? null,
            extras?.consentAt ?? null,
            extras?.utmSource ?? null,
            extras?.utmMedium ?? null,
            extras?.utmCampaign ?? null,
            extras?.utmContent ?? null,
            nowIso(),
            existing.id,
          );
        void updated;
        return { customer: mapCustomer(customerGet.get(existing.id) as Record<string, unknown>), created: false };
      }
      const result = database
        .prepare(
          `INSERT INTO customers (
            telegram_user_id, name, username, phone, consent_at,
            utm_source, utm_medium, utm_campaign, utm_content, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          user.id,
          name,
          user.username ?? null,
          extras?.phone ?? null,
          extras?.consentAt ?? null,
          extras?.utmSource ?? null,
          extras?.utmMedium ?? null,
          extras?.utmCampaign ?? null,
          extras?.utmContent ?? null,
          nowIso(),
          nowIso(),
        );
      return {
        customer: mapCustomer(customerGet.get(Number(result.lastInsertRowid)) as Record<string, unknown>),
        created: true,
      };
    },
    getById(id) {
      const row = customerGet.get(id) as Record<string, unknown> | undefined;
      return row ? mapCustomer(row) : undefined;
    },
    getByTelegramUserId(telegramUserId) {
      const row = customerByTg.get(telegramUserId) as Record<string, unknown> | undefined;
      return row ? mapCustomer(row) : undefined;
    },
    listAll() {
      return (database.prepare('SELECT * FROM customers ORDER BY created_at DESC').all() as Record<string, unknown>[]).map(
        mapCustomer,
      );
    },
    update(id, patch) {
      const current = customers.getById(id);
      if (!current) throw new Error(`Customer ${id} not found`);
      database
        .prepare(
          `UPDATE customers SET name = ?, phone = ?, consent_at = ?,
            utm_source = ?, utm_medium = ?, utm_campaign = ?, utm_content = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          patch.name ?? current.name,
          patch.phone === undefined ? current.phone : patch.phone,
          patch.consentAt === undefined ? current.consentAt : patch.consentAt,
          patch.utmSource === undefined ? current.utmSource : patch.utmSource,
          patch.utmMedium === undefined ? current.utmMedium : patch.utmMedium,
          patch.utmCampaign === undefined ? current.utmCampaign : patch.utmCampaign,
          patch.utmContent === undefined ? current.utmContent : patch.utmContent,
          nowIso(),
          id,
        );
      return customers.getById(id)!;
    },
    deleteById(id) {
      database.prepare('DELETE FROM customers WHERE id = ?').run(id);
    },
  };

  const profiles: BuyerProfileProvider = {
    upsert(input) {
      const existing = database
        .prepare('SELECT id FROM buyer_profiles WHERE customer_id = ?')
        .get(input.customerId) as { id: number } | undefined;
      const payload = [
        input.goal,
        input.propertyType,
        JSON.stringify(input.locations),
        input.budgetMin,
        input.budgetMax,
        input.rooms,
        input.purchaseTiming,
        input.payment,
        input.mortgageStatus,
        JSON.stringify(input.preferences),
        input.areaMin,
        input.areaMax,
        input.consentAt,
        nowIso(),
      ];
      if (existing) {
        database
          .prepare(
            `UPDATE buyer_profiles SET
              goal = ?, property_type = ?, locations = ?, budget_min = ?, budget_max = ?,
              rooms = ?, purchase_timing = ?, payment = ?, mortgage_status = ?, preferences = ?,
              area_min = ?, area_max = ?, consent_at = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(...payload, existing.id);
        return profiles.getById(existing.id)!;
      }
      const result = database
        .prepare(
          `INSERT INTO buyer_profiles (
            customer_id, goal, property_type, locations, budget_min, budget_max, rooms,
            purchase_timing, payment, mortgage_status, preferences, area_min, area_max, consent_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(input.customerId, ...payload, nowIso());
      return profiles.getById(Number(result.lastInsertRowid))!;
    },
    getByCustomerId(customerId) {
      const row = database
        .prepare('SELECT * FROM buyer_profiles WHERE customer_id = ?')
        .get(customerId) as Record<string, unknown> | undefined;
      return row ? mapProfile(row) : undefined;
    },
    getById(id) {
      const row = database.prepare('SELECT * FROM buyer_profiles WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined;
      return row ? mapProfile(row) : undefined;
    },
    listAll() {
      return (database.prepare('SELECT * FROM buyer_profiles').all() as Record<string, unknown>[]).map(mapProfile);
    },
  };

  function featuresFor(propertyId: number): PropertyFeature[] {
    return (
      database.prepare('SELECT * FROM property_features WHERE property_id = ?').all(propertyId) as Record<
        string,
        unknown
      >[]
    ).map(mapFeature);
  }

  function hydrateProperty(row: Record<string, unknown>): PropertyDetails {
    const property = mapProperty(row);
    const projectRow = database
      .prepare('SELECT * FROM property_projects WHERE id = ?')
      .get(property.projectId) as Record<string, unknown>;
    return {
      ...property,
      project: mapProject(projectRow),
      features: featuresFor(property.id),
    };
  }

  function replaceFeatures(propertyId: number, features: Array<{ code: FeatureCode; label: string }>): void {
    database.prepare('DELETE FROM property_features WHERE property_id = ?').run(propertyId);
    const insert = database.prepare(
      'INSERT INTO property_features (property_id, code, label) VALUES (?, ?, ?)',
    );
    for (const feature of features) {
      insert.run(propertyId, feature.code, feature.label || FEATURE_LABELS[feature.code]);
    }
  }

  const properties: PropertyCatalogProvider = {
    listProjects(activeOnly = false) {
      const sql = activeOnly
        ? 'SELECT * FROM property_projects WHERE active = 1 ORDER BY display_order, id'
        : 'SELECT * FROM property_projects ORDER BY display_order, id';
      return (database.prepare(sql).all() as Record<string, unknown>[]).map(mapProject);
    },
    getProject(id) {
      const row = database.prepare('SELECT * FROM property_projects WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined;
      return row ? mapProject(row) : undefined;
    },
    getProjectBySlug(slug) {
      const row = database.prepare('SELECT * FROM property_projects WHERE slug = ?').get(slug) as
        | Record<string, unknown>
        | undefined;
      return row ? mapProject(row) : undefined;
    },
    createProject(input) {
      const result = database
        .prepare(
          `INSERT INTO property_projects (
            slug, name, district, address, description, property_type, completion_date,
            image_url, gallery, features, active, display_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.slug,
          input.name,
          input.district,
          input.address,
          input.description,
          input.propertyType,
          input.completionDate,
          input.imageUrl,
          JSON.stringify(input.gallery),
          JSON.stringify(input.features),
          input.active ? 1 : 0,
          input.displayOrder,
          nowIso(),
          nowIso(),
        );
      return properties.getProject(Number(result.lastInsertRowid))!;
    },
    updateProject(id, patch) {
      const current = properties.getProject(id);
      if (!current) throw new Error(`Project ${id} not found`);
      database
        .prepare(
          `UPDATE property_projects SET
            slug = ?, name = ?, district = ?, address = ?, description = ?, property_type = ?,
            completion_date = ?, image_url = ?, gallery = ?, features = ?, active = ?, display_order = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          patch.slug ?? current.slug,
          patch.name ?? current.name,
          patch.district ?? current.district,
          patch.address ?? current.address,
          patch.description ?? current.description,
          patch.propertyType ?? current.propertyType,
          patch.completionDate ?? current.completionDate,
          patch.imageUrl ?? current.imageUrl,
          JSON.stringify(patch.gallery ?? current.gallery),
          JSON.stringify(patch.features ?? current.features),
          (patch.active ?? current.active) ? 1 : 0,
          patch.displayOrder ?? current.displayOrder,
          nowIso(),
          id,
        );
      return properties.getProject(id)!;
    },
    listProperties(filters) {
      let sql = 'SELECT * FROM properties WHERE 1=1';
      const params: unknown[] = [];
      if (filters?.projectId) {
        sql += ' AND project_id = ?';
        params.push(filters.projectId);
      }
      if (filters?.activeOnly) sql += ' AND active = 1';
      if (filters?.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      sql += ' ORDER BY price';
      return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(hydrateProperty);
    },
    getProperty(id) {
      const row = database.prepare('SELECT * FROM properties WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined;
      return row ? hydrateProperty(row) : undefined;
    },
    createProperty(input) {
      const result = database
        .prepare(
          `INSERT INTO properties (
            project_id, unit_number, rooms, rooms_count, area, floor, floors_total, price,
            finish, status, completion_date, gallery, description, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.projectId,
          input.unitNumber,
          input.rooms,
          input.roomsCount,
          input.area,
          input.floor,
          input.floorsTotal,
          input.price,
          input.finish,
          input.status,
          input.completionDate,
          JSON.stringify(input.gallery),
          input.description,
          input.active ? 1 : 0,
          nowIso(),
          nowIso(),
        );
      const id = Number(result.lastInsertRowid);
      replaceFeatures(id, input.features);
      return properties.getProperty(id)!;
    },
    updateProperty(id, patch) {
      const current = properties.getProperty(id);
      if (!current) throw new Error(`Property ${id} not found`);
      database
        .prepare(
          `UPDATE properties SET
            project_id = ?, unit_number = ?, rooms = ?, rooms_count = ?, area = ?, floor = ?,
            floors_total = ?, price = ?, finish = ?, status = ?, completion_date = ?, gallery = ?,
            description = ?, active = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          patch.projectId ?? current.projectId,
          patch.unitNumber ?? current.unitNumber,
          patch.rooms ?? current.rooms,
          patch.roomsCount ?? current.roomsCount,
          patch.area ?? current.area,
          patch.floor ?? current.floor,
          patch.floorsTotal ?? current.floorsTotal,
          patch.price ?? current.price,
          patch.finish ?? current.finish,
          patch.status ?? current.status,
          patch.completionDate ?? current.completionDate,
          JSON.stringify(patch.gallery ?? current.gallery),
          patch.description ?? current.description,
          (patch.active ?? current.active) ? 1 : 0,
          nowIso(),
          id,
        );
      if (patch.features) replaceFeatures(id, patch.features);
      return properties.getProperty(id)!;
    },
  };

  const favorites: FavoriteProvider = {
    add(customerId, propertyId) {
      const existing = database
        .prepare('SELECT * FROM favorites WHERE customer_id = ? AND property_id = ?')
        .get(customerId, propertyId) as Record<string, unknown> | undefined;
      if (existing) {
        return {
          favorite: {
            id: Number(existing.id),
            customerId,
            propertyId,
            createdAt: String(existing.created_at),
          },
          created: false,
        };
      }
      const result = database
        .prepare('INSERT INTO favorites (customer_id, property_id, created_at) VALUES (?, ?, ?)')
        .run(customerId, propertyId, nowIso());
      return {
        favorite: {
          id: Number(result.lastInsertRowid),
          customerId,
          propertyId,
          createdAt: nowIso(),
        },
        created: true,
      };
    },
    remove(customerId, propertyId) {
      const result = database
        .prepare('DELETE FROM favorites WHERE customer_id = ? AND property_id = ?')
        .run(customerId, propertyId);
      return result.changes > 0;
    },
    listByCustomer(customerId) {
      return (
        database
          .prepare('SELECT * FROM favorites WHERE customer_id = ? ORDER BY created_at DESC')
          .all(customerId) as Record<string, unknown>[]
      ).map((row) => ({
        id: Number(row.id),
        customerId: Number(row.customer_id),
        propertyId: Number(row.property_id),
        createdAt: String(row.created_at),
      }));
    },
    has(customerId, propertyId) {
      const row = database
        .prepare('SELECT 1 FROM favorites WHERE customer_id = ? AND property_id = ?')
        .get(customerId, propertyId);
      return Boolean(row);
    },
  };

  const matches: MatchStoreProvider = {
    replaceForProfile(buyerProfileId, items) {
      database.prepare('DELETE FROM property_matches WHERE buyer_profile_id = ?').run(buyerProfileId);
      const insert = database.prepare(
        'INSERT INTO property_matches (buyer_profile_id, property_id, score, reasons, created_at) VALUES (?, ?, ?, ?, ?)',
      );
      for (const item of items) {
        insert.run(buyerProfileId, item.propertyId, item.score, JSON.stringify(item.reasons), nowIso());
      }
      return matches.listByProfile(buyerProfileId);
    },
    listByProfile(buyerProfileId) {
      return (
        database
          .prepare('SELECT * FROM property_matches WHERE buyer_profile_id = ? ORDER BY score DESC, property_id')
          .all(buyerProfileId) as Record<string, unknown>[]
      ).map((row) => ({
        id: Number(row.id),
        buyerProfileId,
        propertyId: Number(row.property_id),
        score: Number(row.score),
        reasons: parseJson<PropertyMatch['reasons']>(String(row.reasons), []),
      }));
    },
  };

  const leads: LeadProvider = {
    upsertForCustomer(params) {
      const existing = database
        .prepare('SELECT * FROM leads WHERE customer_id = ?')
        .get(params.customerId) as Record<string, unknown> | undefined;
      if (existing) {
        database
          .prepare(
            `UPDATE leads SET buyer_profile_id = ?, agent_id = COALESCE(?, agent_id),
              score = ?, temperature = ?, status = ?, updated_at = ? WHERE id = ?`,
          )
          .run(
            params.buyerProfileId,
            params.agentId,
            params.score,
            params.temperature,
            params.status,
            nowIso(),
            existing.id,
          );
        return leads.getById(Number(existing.id))!;
      }
      const result = database
        .prepare(
          `INSERT INTO leads (customer_id, buyer_profile_id, agent_id, score, temperature, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.customerId,
          params.buyerProfileId,
          params.agentId,
          params.score,
          params.temperature,
          params.status,
          nowIso(),
          nowIso(),
        );
      return leads.getById(Number(result.lastInsertRowid))!;
    },
    getById(id) {
      const row = database.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return row ? mapLead(row) : undefined;
    },
    getByCustomerId(customerId) {
      const row = database.prepare('SELECT * FROM leads WHERE customer_id = ?').get(customerId) as
        | Record<string, unknown>
        | undefined;
      return row ? mapLead(row) : undefined;
    },
    list(filters) {
      let sql = `SELECT leads.* FROM leads
        LEFT JOIN buyer_profiles ON buyer_profiles.id = leads.buyer_profile_id
        WHERE 1=1`;
      const params: unknown[] = [];
      if (filters?.temperature) {
        sql += ' AND leads.temperature = ?';
        params.push(filters.temperature);
      }
      if (filters?.purchaseTiming) {
        sql += ' AND buyer_profiles.purchase_timing = ?';
        params.push(filters.purchaseTiming);
      }
      if (filters?.agentId) {
        sql += ' AND leads.agent_id = ?';
        params.push(filters.agentId);
      }
      if (filters?.budgetMin != null) {
        sql += ' AND buyer_profiles.budget_max >= ?';
        params.push(filters.budgetMin);
      }
      if (filters?.budgetMax != null) {
        sql += ' AND buyer_profiles.budget_min <= ?';
        params.push(filters.budgetMax);
      }
      sql += ` ORDER BY CASE leads.temperature WHEN 'HOT' THEN 0 WHEN 'WARM' THEN 1 ELSE 2 END, leads.score DESC, leads.updated_at DESC`;
      return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(mapLead);
    },
    update(id, patch) {
      const current = leads.getById(id);
      if (!current) throw new Error(`Lead ${id} not found`);
      database
        .prepare(
          'UPDATE leads SET score = ?, temperature = ?, status = ?, agent_id = ?, updated_at = ? WHERE id = ?',
        )
        .run(
          patch.score ?? current.score,
          patch.temperature ?? current.temperature,
          patch.status ?? current.status,
          patch.agentId === undefined ? current.agentId : patch.agentId,
          nowIso(),
          id,
        );
      return leads.getById(id)!;
    },
  };

  const scoreEvents: LeadScoreEventProvider = {
    add(params) {
      const result = database
        .prepare(
          `INSERT INTO lead_score_events (
            lead_id, event_type, delta, reason, score_after, entity_type, entity_id, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.leadId,
          params.eventType,
          params.delta,
          params.reason,
          params.scoreAfter,
          params.entityType,
          params.entityId,
          params.metadata ? JSON.stringify(params.metadata) : null,
          params.createdAt,
        );
      return mapScoreEvent(
        database.prepare('SELECT * FROM lead_score_events WHERE id = ?').get(Number(result.lastInsertRowid)) as Record<
          string,
          unknown
        >,
      );
    },
    listByLead(leadId) {
      return (
        database
          .prepare('SELECT * FROM lead_score_events WHERE lead_id = ? ORDER BY created_at, id')
          .all(leadId) as Record<string, unknown>[]
      ).map(mapScoreEvent);
    },
    replaceProfileEvents(leadId, events) {
      database
        .prepare(
          `DELETE FROM lead_score_events WHERE lead_id = ? AND event_type IN (
            'purchase_now', 'purchase_1_3_months', 'cash', 'mortgage_approved'
          )`,
        )
        .run(leadId);
      for (const event of events) {
        scoreEvents.add({ ...event, leadId });
      }
    },
  };

  const agents: AgentProvider = {
    list() {
      return (database.prepare('SELECT * FROM agents WHERE active = 1 ORDER BY id').all() as Record<string, unknown>[]).map(
        mapAgent,
      );
    },
    getById(id) {
      const row = database.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return row ? mapAgent(row) : undefined;
    },
    pickForAssignment() {
      const counts = database
        .prepare(
          `SELECT agents.id, COUNT(leads.id) AS assigned
           FROM agents
           LEFT JOIN leads ON leads.agent_id = agents.id
           WHERE agents.active = 1
           GROUP BY agents.id
           ORDER BY assigned ASC, agents.id ASC`,
        )
        .get() as { id: number } | undefined;
      return counts ? agents.getById(counts.id) : undefined;
    },
  };

  function viewingHistory(viewingId: number): ViewingHistory[] {
    return (
      database
        .prepare('SELECT * FROM viewing_history WHERE viewing_id = ? ORDER BY created_at, id')
        .all(viewingId) as Record<string, unknown>[]
    ).map((row) => ({
      id: Number(row.id),
      viewingId,
      fromStatus: (row.from_status as ViewingHistory['fromStatus']) ?? null,
      toStatus: row.to_status as ViewingHistory['toStatus'],
      note: (row.note as string | null) ?? null,
      createdAt: String(row.created_at),
    }));
  }

  function hydrateViewing(row: Record<string, unknown>): ViewingDetails {
    const viewing = mapViewing(row);
    return { ...viewing, history: viewingHistory(viewing.id) };
  }

  const viewings: ViewingProvider = {
    create(params) {
      const result = database
        .prepare(
          `INSERT INTO viewings (customer_id, property_id, agent_id, scheduled_at, type, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.customerId,
          params.propertyId,
          params.agentId,
          params.scheduledAt,
          params.type,
          params.status,
          nowIso(),
          nowIso(),
        );
      const id = Number(result.lastInsertRowid);
      database
        .prepare(
          'INSERT INTO viewing_history (viewing_id, from_status, to_status, note, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(id, null, params.status, 'created', nowIso());
      return mapViewing(database.prepare('SELECT * FROM viewings WHERE id = ?').get(id) as Record<string, unknown>);
    },
    getById(id) {
      const row = database.prepare('SELECT * FROM viewings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return row ? hydrateViewing(row) : undefined;
    },
    list(filters) {
      let sql = 'SELECT * FROM viewings WHERE 1=1';
      const params: unknown[] = [];
      if (filters?.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters?.customerId) {
        sql += ' AND customer_id = ?';
        params.push(filters.customerId);
      }
      if (filters?.propertyId) {
        sql += ' AND property_id = ?';
        params.push(filters.propertyId);
      }
      sql += ' ORDER BY scheduled_at DESC';
      return (database.prepare(sql).all(...params) as Record<string, unknown>[]).map(hydrateViewing);
    },
    listByCustomer(customerId) {
      return viewings.list({ customerId });
    },
    updateStatus(id, status, note) {
      const current = viewings.getById(id);
      if (!current) throw new Error(`Viewing ${id} not found`);
      database
        .prepare('UPDATE viewings SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, nowIso(), id);
      database
        .prepare(
          'INSERT INTO viewing_history (viewing_id, from_status, to_status, note, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(id, current.status, status, note ?? null, nowIso());
      return viewings.getById(id)!;
    },
    occupiedSlots(propertyId, date) {
      const rows = database
        .prepare(
          `SELECT scheduled_at FROM viewings
           WHERE property_id = ? AND date(scheduled_at) = date(?) AND status IN ('scheduled', 'confirmed')`,
        )
        .all(propertyId, date) as Array<{ scheduled_at: string }>;
      return rows.map((row) => row.scheduled_at);
    },
  };

  const sellerLeads: SellerLeadProvider = {
    create(params) {
      const result = database
        .prepare(
          `INSERT INTO seller_leads (
            customer_id, location, property_type, rooms, area, condition, desired_price,
            sale_timing, comment, contact, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.customerId,
          params.location,
          params.propertyType,
          params.rooms,
          params.area,
          params.condition,
          params.desiredPrice,
          params.saleTiming,
          params.comment,
          params.contact,
          params.status,
          nowIso(),
        );
      return sellerLeads.getById(Number(result.lastInsertRowid))!;
    },
    list(filters) {
      const sql = filters?.status
        ? 'SELECT * FROM seller_leads WHERE status = ? ORDER BY created_at DESC'
        : 'SELECT * FROM seller_leads ORDER BY created_at DESC';
      const rows = filters?.status
        ? (database.prepare(sql).all(filters.status) as Record<string, unknown>[])
        : (database.prepare(sql).all() as Record<string, unknown>[]);
      return rows.map(mapSeller);
    },
    getById(id) {
      const row = database.prepare('SELECT * FROM seller_leads WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined;
      return row ? mapSeller(row) : undefined;
    },
    updateStatus(id, status) {
      database.prepare('UPDATE seller_leads SET status = ? WHERE id = ?').run(status, id);
      return sellerLeads.getById(id)!;
    },
  };

  const interactions: InteractionProvider = {
    add(params) {
      const result = database
        .prepare(
          `INSERT INTO interaction_events (
            customer_id, event_type, entity_type, entity_id, timestamp, metadata,
            utm_source, utm_medium, utm_campaign, utm_content
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          params.customerId,
          params.eventType,
          params.entityType,
          params.entityId,
          params.timestamp,
          params.metadata ? JSON.stringify(params.metadata) : null,
          params.utmSource,
          params.utmMedium,
          params.utmCampaign,
          params.utmContent,
        );
      return mapInteraction(
        database.prepare('SELECT * FROM interaction_events WHERE id = ?').get(Number(result.lastInsertRowid)) as Record<
          string,
          unknown
        >,
      );
    },
    listByCustomer(customerId, limit = 100) {
      return (
        database
          .prepare(
            'SELECT * FROM interaction_events WHERE customer_id = ? ORDER BY timestamp DESC, id DESC LIMIT ?',
          )
          .all(customerId, limit) as Record<string, unknown>[]
      ).map(mapInteraction);
    },
    listAll(limit = 500) {
      return (
        database
          .prepare('SELECT * FROM interaction_events ORDER BY timestamp DESC, id DESC LIMIT ?')
          .all(limit) as Record<string, unknown>[]
      ).map(mapInteraction);
    },
    hasEvent(customerId, eventType, entityType, entityId) {
      let sql = 'SELECT 1 FROM interaction_events WHERE customer_id = ? AND event_type = ?';
      const params: unknown[] = [customerId, eventType];
      if (entityType) {
        sql += ' AND entity_type = ?';
        params.push(entityType);
      }
      if (entityId != null) {
        sql += ' AND entity_id = ?';
        params.push(entityId);
      }
      return Boolean(database.prepare(sql).get(...params));
    },
    countByType() {
      const rows = database
        .prepare('SELECT event_type, COUNT(*) AS count FROM interaction_events GROUP BY event_type')
        .all() as Array<{ event_type: string; count: number }>;
      return Object.fromEntries(rows.map((row) => [row.event_type, row.count]));
    },
    uniqueCustomersByType() {
      const rows = database
        .prepare(
          'SELECT event_type, COUNT(DISTINCT customer_id) AS count FROM interaction_events GROUP BY event_type',
        )
        .all() as Array<{ event_type: string; count: number }>;
      return Object.fromEntries(rows.map((row) => [row.event_type, row.count]));
    },
  };

  const events: EventProvider = {
    publish(name: OutboundEventName, payload) {
      const createdAt = nowIso();
      const result = database
        .prepare('INSERT INTO outbound_events (name, payload, created_at) VALUES (?, ?, ?)')
        .run(name, JSON.stringify(payload), createdAt);
      return {
        id: Number(result.lastInsertRowid),
        name,
        payload,
        createdAt,
      };
    },
    list(limit = 50) {
      return (
        database.prepare('SELECT * FROM outbound_events ORDER BY id DESC LIMIT ?').all(limit) as Record<
          string,
          unknown
        >[]
      ).map((row) => ({
        id: Number(row.id),
        name: row.name as BusinessEvent['name'],
        payload: parseJson<Record<string, unknown>>(String(row.payload), {}),
        createdAt: String(row.created_at),
      }));
    },
  };

  const idempotency: IdempotencyProvider = {
    get(key, scope) {
      const row = database
        .prepare('SELECT * FROM idempotency_keys WHERE key = ? AND scope = ?')
        .get(key, scope) as Record<string, unknown> | undefined;
      if (!row) return undefined;
      return {
        key: String(row.key),
        scope: String(row.scope),
        status: Number(row.status),
        body: String(row.body),
        createdAt: String(row.created_at),
      };
    },
    put(record) {
      const createdAt = nowIso();
      database
        .prepare(
          'INSERT OR REPLACE INTO idempotency_keys (key, scope, status, body, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(record.key, record.scope, record.status, record.body, createdAt);
      return { ...record, createdAt };
    },
  };

  return {
    customers,
    profiles,
    properties,
    favorites,
    matches,
    leads,
    scoreEvents,
    agents,
    viewings,
    sellerLeads,
    interactions,
    events,
    idempotency,
    transaction<T>(fn: () => T): T {
      return database.transaction(fn)();
    },
  };
}
