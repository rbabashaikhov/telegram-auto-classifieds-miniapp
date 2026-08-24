import type Database from 'better-sqlite3';
import { FEATURE_LABELS, type FeatureCode, type InteractionEventType } from '../types.js';
import { rankMatches } from '../domain/matching.js';
import { composeLeadScore, profileScoreFromBuyer } from '../domain/scoring.js';
import { createLocalProviders } from '../providers/local/sqlite.js';

function iso(base: Date, hoursAgo: number): string {
  return new Date(base.getTime() - hoursAgo * 3600_000).toISOString();
}

function roomsCount(rooms: 'studio' | '1' | '2' | '3plus'): number {
  if (rooms === 'studio') return 0;
  if (rooms === '3plus') return 3;
  return Number(rooms);
}

function featureList(codes: FeatureCode[]): Array<{ code: FeatureCode; label: string }> {
  return codes.map((code) => ({ code, label: FEATURE_LABELS[code] }));
}

export function seed(database: Database.Database, now = new Date('2026-08-18T12:00:00')): void {
  const existing = database.prepare('SELECT COUNT(*) AS count FROM property_projects').get() as { count: number };
  if (existing.count > 0) return;

  const data = createLocalProviders(database);

  const harbor = data.properties.createProject({
    slug: 'severnaya-gavan',
    name: 'Северная Гавань',
    district: 'primorsky',
    address: 'Приморский проспект, 18',
    description:
      'Тихий намыв с видом на залив. Закрытый двор, собственная набережная и выход к станции «Беговая» за 8 минут.',
    propertyType: 'new_build',
    completionDate: '2026-11-01',
    imageUrl: '/images/projects/harbor.svg',
    gallery: ['/images/projects/harbor.svg', '/images/interiors/harbor-1.svg'],
    features: ['near_metro', 'parking', 'balcony'],
    active: true,
    displayOrder: 1,
  });

  const grove = data.properties.createProject({
    slug: 'yasny-bor',
    name: 'Ясный Бор',
    district: 'moskovsky',
    address: 'Московский проспект, 164',
    description:
      'Семейный квартал у парка. Школа во дворе, низкая этажность и уже сданные корпуса с отделкой.',
    propertyType: 'new_build',
    completionDate: '2025-06-01',
    imageUrl: '/images/projects/grove.svg',
    gallery: ['/images/projects/grove.svg', '/images/interiors/grove-1.svg'],
    features: ['school_nearby', 'quiet_area', 'parking'],
    active: true,
    displayOrder: 2,
  });

  const atlas = data.properties.createProject({
    slug: 'atlas-towers',
    name: 'Атлас Тауэрс',
    district: 'central',
    address: 'Литейный проспект, 41',
    description:
      'Две башни в центре. Высокие потолки, панорамный свет и инфраструктура для жизни без пригорода.',
    propertyType: 'apartments',
    completionDate: '2027-03-01',
    imageUrl: '/images/projects/atlas.svg',
    gallery: ['/images/projects/atlas.svg', '/images/interiors/atlas-1.svg'],
    features: ['high_floor', 'parking', 'near_metro'],
    active: true,
    displayOrder: 3,
  });

  const units: Array<{
    projectId: number;
    unitNumber: string;
    rooms: 'studio' | '1' | '2' | '3plus';
    area: number;
    floor: number;
    floorsTotal: number;
    price: number;
    finish: 'finished' | 'white_box' | 'unfinished';
    completionDate: string;
    gallery: string[];
    description: string;
    features: FeatureCode[];
  }> = [
    {
      projectId: harbor.id,
      unitNumber: 'A-214',
      rooms: 'studio',
      area: 32,
      floor: 4,
      floorsTotal: 16,
      price: 7_900_000,
      finish: 'unfinished',
      completionDate: '2026-11-01',
      gallery: ['/images/interiors/studio.svg', '/images/projects/harbor.svg'],
      description: 'Компактная студия для старта или сдачи. Кухня-ниша, большой витраж во двор.',
      features: ['near_metro', 'parking'],
    },
    {
      projectId: harbor.id,
      unitNumber: 'A-508',
      rooms: '1',
      area: 45,
      floor: 8,
      floorsTotal: 16,
      price: 12_400_000,
      finish: 'white_box',
      completionDate: '2026-11-01',
      gallery: ['/images/interiors/one.svg', '/images/projects/harbor.svg'],
      description: 'Евродвушка с предчистовой отделкой. Можно быстро собрать под себя.',
      features: ['near_metro', 'parking', 'balcony'],
    },
    {
      projectId: harbor.id,
      unitNumber: 'B-1402',
      rooms: '2',
      area: 68,
      floor: 14,
      floorsTotal: 16,
      price: 18_900_000,
      finish: 'finished',
      completionDate: '2026-11-01',
      gallery: ['/images/interiors/two.svg', '/images/views/bay.svg', '/images/projects/harbor.svg'],
      description: 'Готовая двушка с видом на залив. Кухня-гостиная, мастер-спальня, гардероб.',
      features: ['near_metro', 'parking', 'balcony', 'high_floor', 'finished'],
    },
    {
      projectId: harbor.id,
      unitNumber: 'B-612',
      rooms: '2',
      area: 74,
      floor: 6,
      floorsTotal: 16,
      price: 21_200_000,
      finish: 'finished',
      completionDate: '2026-11-01',
      gallery: ['/images/interiors/two-b.svg', '/images/projects/harbor.svg'],
      description: 'Увеличенная планировка с кабинетом. Тихий двор, подземный паркинг включён.',
      features: ['near_metro', 'parking', 'balcony', 'finished'],
    },
    {
      projectId: harbor.id,
      unitNumber: 'C-1501',
      rooms: '3plus',
      area: 98,
      floor: 15,
      floorsTotal: 16,
      price: 28_600_000,
      finish: 'finished',
      completionDate: '2026-11-01',
      gallery: ['/images/interiors/three.svg', '/images/views/bay.svg'],
      description: 'Семейные 3 комнаты с мастер-блоком и постирочной. Высокий этаж, вид на воду.',
      features: ['near_metro', 'parking', 'balcony', 'high_floor', 'finished'],
    },
    {
      projectId: grove.id,
      unitNumber: '1-12',
      rooms: '1',
      area: 41,
      floor: 3,
      floorsTotal: 9,
      price: 9_800_000,
      finish: 'finished',
      completionDate: '2025-06-01',
      gallery: ['/images/interiors/grove-one.svg', '/images/projects/grove.svg'],
      description: 'Сданная однушка у школы. Можно въезжать сразу после сделки.',
      features: ['school_nearby', 'quiet_area', 'finished'],
    },
    {
      projectId: grove.id,
      unitNumber: '2-45',
      rooms: '2',
      area: 62,
      floor: 5,
      floorsTotal: 9,
      price: 14_700_000,
      finish: 'finished',
      completionDate: '2025-06-01',
      gallery: ['/images/interiors/grove-two.svg', '/images/projects/grove.svg'],
      description: 'Семейная двушка во двор. Балкон, паркинг, школа в 4 минутах.',
      features: ['school_nearby', 'quiet_area', 'parking', 'balcony', 'finished'],
    },
    {
      projectId: grove.id,
      unitNumber: '2-08',
      rooms: '2',
      area: 71,
      floor: 2,
      floorsTotal: 9,
      price: 16_400_000,
      finish: 'finished',
      completionDate: '2025-06-01',
      gallery: ['/images/interiors/grove-two-b.svg', '/images/projects/grove.svg'],
      description: 'Просторная кухня-гостиная и две изолированные спальни. Тихий корпус.',
      features: ['school_nearby', 'quiet_area', 'parking', 'finished'],
    },
    {
      projectId: grove.id,
      unitNumber: '3-71',
      rooms: '3plus',
      area: 89,
      floor: 7,
      floorsTotal: 9,
      price: 19_900_000,
      finish: 'finished',
      completionDate: '2025-06-01',
      gallery: ['/images/interiors/grove-three.svg', '/images/projects/grove.svg'],
      description: 'Три комнаты для большой семьи. Кладовая, балкон, двор без машин.',
      features: ['school_nearby', 'quiet_area', 'parking', 'balcony', 'finished'],
    },
    {
      projectId: grove.id,
      unitNumber: 'S-03',
      rooms: 'studio',
      area: 28,
      floor: 1,
      floorsTotal: 9,
      price: 7_200_000,
      finish: 'unfinished',
      completionDate: '2025-06-01',
      gallery: ['/images/interiors/studio.svg', '/images/projects/grove.svg'],
      description: 'Студия в сданном доме. Для инвестиции с отделкой под аренду.',
      features: ['quiet_area', 'school_nearby'],
    },
    {
      projectId: atlas.id,
      unitNumber: 'T1-2204',
      rooms: '1',
      area: 52,
      floor: 22,
      floorsTotal: 28,
      price: 22_800_000,
      finish: 'white_box',
      completionDate: '2027-03-01',
      gallery: ['/images/interiors/atlas-one.svg', '/images/projects/atlas.svg'],
      description: 'Светлая евродвушка на высоком этаже. Метро «Маяковская» в 6 минутах.',
      features: ['high_floor', 'parking', 'near_metro'],
    },
    {
      projectId: atlas.id,
      unitNumber: 'T1-1808',
      rooms: '2',
      area: 78,
      floor: 18,
      floorsTotal: 28,
      price: 31_500_000,
      finish: 'finished',
      completionDate: '2027-03-01',
      gallery: ['/images/interiors/atlas-two.svg', '/images/views/city.svg'],
      description: 'Готовые апартаменты с видом на центр. Мебель можно оставить по договору.',
      features: ['high_floor', 'parking', 'balcony', 'near_metro', 'finished'],
    },
    {
      projectId: atlas.id,
      unitNumber: 'T2-0912',
      rooms: '2',
      area: 86,
      floor: 9,
      floorsTotal: 28,
      price: 34_900_000,
      finish: 'finished',
      completionDate: '2027-03-01',
      gallery: ['/images/interiors/atlas-two-b.svg', '/images/projects/atlas.svg'],
      description: 'Широкая гостиная и кабинет. Для тех, кто живёт и работает в центре.',
      features: ['parking', 'balcony', 'near_metro', 'finished'],
    },
    {
      projectId: atlas.id,
      unitNumber: 'T2-2501',
      rooms: '3plus',
      area: 124,
      floor: 25,
      floorsTotal: 28,
      price: 44_800_000,
      finish: 'finished',
      completionDate: '2027-03-01',
      gallery: ['/images/interiors/atlas-three.svg', '/images/views/city.svg'],
      description: 'Пентхаус-формат без общего коридора. Две ванные, гардероб, панорама.',
      features: ['high_floor', 'parking', 'balcony', 'near_metro', 'finished'],
    },
    {
      projectId: atlas.id,
      unitNumber: 'T1-1215',
      rooms: 'studio',
      area: 38,
      floor: 12,
      floorsTotal: 28,
      price: 16_200_000,
      finish: 'white_box',
      completionDate: '2027-03-01',
      gallery: ['/images/interiors/atlas-studio.svg', '/images/projects/atlas.svg'],
      description: 'Инвестиционная студия в центре. Ликвидный формат у метро.',
      features: ['parking', 'near_metro'],
    },
  ];

  const createdUnits = units.map((unit) =>
    data.properties.createProperty({
      projectId: unit.projectId,
      unitNumber: unit.unitNumber,
      rooms: unit.rooms,
      roomsCount: roomsCount(unit.rooms),
      area: unit.area,
      floor: unit.floor,
      floorsTotal: unit.floorsTotal,
      price: unit.price,
      finish: unit.finish,
      status: 'available',
      completionDate: unit.completionDate,
      gallery: unit.gallery,
      description: unit.description,
      active: true,
      features: featureList(unit.features),
    }),
  );

  const anna = database
    .prepare(
      `INSERT INTO agents (name, phone, email, title, specialization, avatar_url, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      'Анна Волкова',
      '+7 921 450-18-22',
      'anna@nordestate.demo',
      'Старший брокер',
      'Новостройки у воды',
      '/images/agents/anna.svg',
    );
  const dmitry = database
    .prepare(
      `INSERT INTO agents (name, phone, email, title, specialization, avatar_url, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      'Дмитрий Орлов',
      '+7 921 611-04-90',
      'dmitry@nordestate.demo',
      'Семейный брокер',
      'Сданные кварталы',
      '/images/agents/dmitry.svg',
    );
  const elena = database
    .prepare(
      `INSERT INTO agents (name, phone, email, title, specialization, avatar_url, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      'Елена Савельева',
      '+7 911 320-77-14',
      'elena@nordestate.demo',
      'Инвестиционный брокер',
      'Центр и апартаменты',
      '/images/agents/elena.svg',
    );

  const annaId = Number(anna.lastInsertRowid);
  const dmitryId = Number(dmitry.lastInsertRowid);
  const elenaId = Number(elena.lastInsertRowid);

  data.customers.upsert(
    { id: 999000001, username: 'demo_client', first_name: 'Иван', last_name: 'Петров' },
    { utmSource: 'telegram', utmMedium: 'demo', utmCampaign: 'sales_tour' },
  );

  const catalog = createdUnits.map((unit) => ({
    property: unit,
    project: unit.project,
    featureCodes: unit.features.map((feature) => feature.code),
  }));

  function qualify(params: {
    telegramId: number;
    username: string;
    first: string;
    last: string;
    phone?: string;
    utm: { source: string; medium: string; campaign: string; content?: string };
    profile: {
      goal: 'own_use' | 'investment' | 'relocation';
      propertyType: 'new_build' | 'secondary' | 'apartments';
      locations: string[];
      budgetMin: number;
      budgetMax: number;
      rooms: 'studio' | '1' | '2' | '3plus';
      purchaseTiming: 'now' | '1_3_months' | '3_6_months' | 'exploring';
      payment: 'cash' | 'mortgage' | 'sell_and_buy' | 'undecided';
      mortgageStatus: 'approved' | 'application_in_progress' | 'not_applied' | null;
      preferences: FeatureCode[];
      areaMin: number | null;
      areaMax: number | null;
    };
    agentId: number;
    hoursAgo: number;
    extras?: Array<{ type: InteractionEventType; entityId?: number; hoursAgo: number }>;
    favoriteIds?: number[];
    viewing?: { propertyId: number; hoursAhead: number; status: 'scheduled' | 'confirmed' | 'completed' };
  }) {
    const { customer } = data.customers.upsert(
      { id: params.telegramId, username: params.username, first_name: params.first, last_name: params.last },
      {
        phone: params.phone,
        consentAt: iso(now, params.hoursAgo),
        utmSource: params.utm.source,
        utmMedium: params.utm.medium,
        utmCampaign: params.utm.campaign,
        utmContent: params.utm.content ?? null,
      },
    );
    const profile = data.profiles.upsert({
      customerId: customer.id,
      ...params.profile,
      consentAt: iso(now, params.hoursAgo),
    });
    const ranked = rankMatches(profile, catalog, undefined, now, profile.id);
    data.matches.replaceForProfile(profile.id, ranked);
    const profileScore = profileScoreFromBuyer(profile);
    let behavior = 0;
    const composed = composeLeadScore(profileScore.points, behavior);
    const lead = data.leads.upsertForCustomer({
      customerId: customer.id,
      buyerProfileId: profile.id,
      agentId: params.agentId,
      score: composed.score,
      temperature: composed.temperature,
      status: 'qualified',
    });
    for (const event of profileScore.events) {
      behavior = behavior;
      data.scoreEvents.add({
        leadId: lead.id,
        eventType: event.eventType,
        delta: event.delta,
        reason: event.reason,
        scoreAfter: 0,
        entityType: 'buyer_profile',
        entityId: profile.id,
        metadata: null,
        createdAt: iso(now, params.hoursAgo - 0.1),
      });
    }

    const track = (type: InteractionEventType, hoursAgo: number, entityType: string | null = null, entityId: number | null = null) => {
      data.interactions.add({
        customerId: customer.id,
        eventType: type,
        entityType,
        entityId,
        timestamp: iso(now, hoursAgo),
        metadata: null,
        utmSource: params.utm.source,
        utmMedium: params.utm.medium,
        utmCampaign: params.utm.campaign,
        utmContent: params.utm.content ?? null,
      });
    };

    track('app_opened', params.hoursAgo + 1);
    track('qualification_started', params.hoursAgo + 0.5);
    track('qualification_completed', params.hoursAgo, 'buyer_profile', profile.id);
    track('matches_opened', params.hoursAgo - 0.2);

    for (const extra of params.extras ?? []) {
      track(extra.type, extra.hoursAgo, extra.entityId ? 'property' : null, extra.entityId ?? null);
    }
    for (const propertyId of params.favoriteIds ?? []) {
      data.favorites.add(customer.id, propertyId);
      track('property_favorited', params.hoursAgo - 0.6, 'property', propertyId);
    }
    if (params.viewing) {
      const scheduled = new Date(now.getTime() + params.viewing.hoursAhead * 3600_000).toISOString();
      const viewing = data.viewings.create({
        customerId: customer.id,
        propertyId: params.viewing.propertyId,
        agentId: params.agentId,
        scheduledAt: scheduled,
        type: 'on_site',
        status: params.viewing.status,
      });
      track('viewing_requested', params.hoursAgo - 1, 'property', params.viewing.propertyId);
      void viewing;
    }

    const events = data.scoreEvents.listByLead(lead.id);
    const extrasForScore = params.extras ?? [];
    const behaviorEvents = [
      ...extrasForScore.map((item) => item.type),
      ...(params.favoriteIds ?? []).map(() => 'property_favorited' as const),
      ...(params.viewing ? (['viewing_requested'] as const) : []),
    ];
    const { behaviorDelta } = { behaviorDelta: (awaited: InteractionEventType) => {
      const map: Partial<Record<InteractionEventType, number>> = {
        property_viewed: 2,
        property_revisited: 4,
        property_favorited: 7,
        payment_calculated: 5,
        viewing_requested: 25,
        manager_contact_requested: 30,
      };
      return map[awaited] ?? 0;
    } };
    let running = events.reduce((sum, event) => sum + event.delta, 0);
    database.prepare('DELETE FROM lead_score_events WHERE lead_id = ?').run(lead.id);
    running = 0;
    for (const event of profileScore.events) {
      running += event.delta;
      data.scoreEvents.add({
        leadId: lead.id,
        eventType: event.eventType,
        delta: event.delta,
        reason: event.reason,
        scoreAfter: Math.min(100, running),
        entityType: 'buyer_profile',
        entityId: profile.id,
        metadata: null,
        createdAt: iso(now, params.hoursAgo - 0.1),
      });
    }
    for (const extra of behaviorEvents) {
      const delta = behaviorDelta(extra);
      if (!delta) continue;
      running += delta;
      data.scoreEvents.add({
        leadId: lead.id,
        eventType: extra,
        delta,
        reason: extra,
        scoreAfter: Math.min(100, running),
        entityType: extra.includes('viewing') ? 'viewing' : 'property',
        entityId: null,
        metadata: null,
        createdAt: iso(now, params.hoursAgo - 0.8),
      });
    }
    const finalScore = composeLeadScore(profileScore.points, running - profileScore.points);
    data.leads.update(lead.id, {
      score: finalScore.score,
      temperature: finalScore.temperature,
      status: params.viewing ? 'viewing' : 'qualified',
    });
    data.events.publish('lead.created', { leadId: lead.id, customerId: customer.id, score: finalScore.score });
    data.events.publish('lead.qualified', { leadId: lead.id, customerId: customer.id, score: finalScore.score });
    if (finalScore.temperature === 'HOT') {
      data.events.publish('lead.became_hot', { leadId: lead.id, customerId: customer.id, score: finalScore.score });
    }
    return customer;
  }

  const twoHarbor = createdUnits.find((unit) => unit.unitNumber === 'B-1402')!;
  const twoGrove = createdUnits.find((unit) => unit.unitNumber === '2-45')!;
  const atlasTwo = createdUnits.find((unit) => unit.unitNumber === 'T1-1808')!;
  const groveThree = createdUnits.find((unit) => unit.unitNumber === '3-71')!;

  qualify({
    telegramId: 10001,
    username: 'maria_sokolova',
    first: 'Мария',
    last: 'Соколова',
    phone: '+7 921 555-10-18',
    utm: { source: 'telegram_ads', medium: 'cpc', campaign: 'primorsky_2br', content: 'carousel' },
    profile: {
      goal: 'own_use',
      propertyType: 'new_build',
      locations: ['primorsky'],
      budgetMin: 16_000_000,
      budgetMax: 23_000_000,
      rooms: '2',
      purchaseTiming: 'now',
      payment: 'cash',
      mortgageStatus: null,
      preferences: ['finished', 'parking', 'near_metro', 'balcony'],
      areaMin: 60,
      areaMax: 80,
    },
    agentId: annaId,
    hoursAgo: 6,
    extras: [
      { type: 'property_viewed', entityId: twoHarbor.id, hoursAgo: 5.5 },
      { type: 'property_revisited', entityId: twoHarbor.id, hoursAgo: 5.2 },
      { type: 'payment_calculated', entityId: twoHarbor.id, hoursAgo: 5.0 },
      { type: 'manager_contact_requested', hoursAgo: 4.6 },
    ],
    favoriteIds: [twoHarbor.id],
    viewing: { propertyId: twoHarbor.id, hoursAhead: 28, status: 'confirmed' },
  });

  qualify({
    telegramId: 10002,
    username: 'pavel_krylov',
    first: 'Павел',
    last: 'Крылов',
    phone: '+7 911 220-44-09',
    utm: { source: 'vk', medium: 'social', campaign: 'family_quarter' },
    profile: {
      goal: 'own_use',
      propertyType: 'new_build',
      locations: ['moskovsky'],
      budgetMin: 12_000_000,
      budgetMax: 17_000_000,
      rooms: '2',
      purchaseTiming: '1_3_months',
      payment: 'mortgage',
      mortgageStatus: 'approved',
      preferences: ['school_nearby', 'quiet_area', 'parking'],
      areaMin: 55,
      areaMax: 75,
    },
    agentId: dmitryId,
    hoursAgo: 20,
    extras: [
      { type: 'property_viewed', entityId: twoGrove.id, hoursAgo: 19 },
      { type: 'payment_calculated', entityId: twoGrove.id, hoursAgo: 18.5 },
    ],
    favoriteIds: [twoGrove.id],
  });

  qualify({
    telegramId: 10003,
    username: 'olga_belova',
    first: 'Ольга',
    last: 'Белова',
    utm: { source: 'organic', medium: 'telegram', campaign: 'bot_start' },
    profile: {
      goal: 'investment',
      propertyType: 'apartments',
      locations: ['central'],
      budgetMin: 12_000_000,
      budgetMax: 18_000_000,
      rooms: 'studio',
      purchaseTiming: 'exploring',
      payment: 'undecided',
      mortgageStatus: null,
      preferences: ['near_metro'],
      areaMin: null,
      areaMax: null,
    },
    agentId: elenaId,
    hoursAgo: 48,
    extras: [{ type: 'property_viewed', entityId: atlasTwo.id, hoursAgo: 47 }],
  });

  qualify({
    telegramId: 10004,
    username: 'igor_nazarov',
    first: 'Игорь',
    last: 'Назаров',
    phone: '+7 921 700-12-45',
    utm: { source: 'telegram_ads', medium: 'cpc', campaign: 'sell_and_buy' },
    profile: {
      goal: 'relocation',
      propertyType: 'new_build',
      locations: ['moskovsky', 'primorsky'],
      budgetMin: 17_000_000,
      budgetMax: 22_000_000,
      rooms: '3plus',
      purchaseTiming: '3_6_months',
      payment: 'sell_and_buy',
      mortgageStatus: null,
      preferences: ['school_nearby', 'quiet_area', 'parking'],
      areaMin: 80,
      areaMax: 110,
    },
    agentId: dmitryId,
    hoursAgo: 30,
    extras: [
      { type: 'property_viewed', entityId: groveThree.id, hoursAgo: 29 },
      { type: 'property_viewed', entityId: twoGrove.id, hoursAgo: 28.5 },
    ],
    favoriteIds: [groveThree.id],
  });

  qualify({
    telegramId: 10005,
    username: 'svetlana_yudina',
    first: 'Светлана',
    last: 'Юдина',
    phone: '+7 999 145-88-21',
    utm: { source: 'telegram_ads', medium: 'cpc', campaign: 'primorsky_2br', content: 'stories' },
    profile: {
      goal: 'own_use',
      propertyType: 'new_build',
      locations: ['primorsky', 'vasileostrovsky'],
      budgetMin: 18_000_000,
      budgetMax: 26_000_000,
      rooms: '2',
      purchaseTiming: 'now',
      payment: 'mortgage',
      mortgageStatus: 'approved',
      preferences: ['finished', 'parking', 'high_floor'],
      areaMin: 65,
      areaMax: 90,
    },
    agentId: annaId,
    hoursAgo: 10,
    extras: [
      { type: 'property_viewed', entityId: twoHarbor.id, hoursAgo: 9.5 },
      { type: 'property_revisited', entityId: twoHarbor.id, hoursAgo: 9.1 },
      { type: 'payment_calculated', entityId: twoHarbor.id, hoursAgo: 8.8 },
    ],
    favoriteIds: [twoHarbor.id],
    viewing: { propertyId: twoHarbor.id, hoursAhead: 50, status: 'scheduled' },
  });

  const sellerA = data.customers.upsert({
    id: 20001,
    username: 'owner_gavan',
    first_name: 'Кирилл',
    last_name: 'Лапин',
  });
  data.sellerLeads.create({
    customerId: sellerA.customer.id,
    location: 'primorsky',
    propertyType: 'new_build',
    rooms: '2',
    area: 64,
    condition: 'good',
    desiredPrice: 19_500_000,
    saleTiming: '1_3_months',
    comment: 'Хотим продать до конца осени, торг уместен.',
    contact: '+7 921 333-09-17',
    status: 'new',
  });
  data.events.publish('seller_lead.created', { customerId: sellerA.customer.id });

  const sellerB = data.customers.upsert({
    id: 20002,
    username: 'owner_bor',
    first_name: 'Наталья',
    last_name: 'Ефимова',
  });
  data.sellerLeads.create({
    customerId: sellerB.customer.id,
    location: 'moskovsky',
    propertyType: 'secondary',
    rooms: '3plus',
    area: 92,
    condition: 'excellent',
    desiredPrice: 18_200_000,
    saleTiming: 'now',
    comment: 'Квартира после ремонта, можно смотреть в будни после 18:00.',
    contact: '+7 911 404-55-02',
    status: 'contacted',
  });

  const extraOpens = [
    { id: 30001, name: ['Артём', 'Шилов'], source: 'telegram_ads', campaign: 'primorsky_2br' },
    { id: 30002, name: ['Дарья', 'Котова'], source: 'organic', campaign: 'bot_start' },
    { id: 30003, name: ['Никита', 'Фролов'], source: 'vk', campaign: 'family_quarter' },
  ];
  for (const person of extraOpens) {
    const created = data.customers.upsert({
      id: person.id,
      username: `guest_${person.id}`,
      first_name: person.name[0],
      last_name: person.name[1],
    });
    data.interactions.add({
      customerId: created.customer.id,
      eventType: 'app_opened',
      entityType: null,
      entityId: null,
      timestamp: iso(now, 12),
      metadata: null,
      utmSource: person.source,
      utmMedium: person.source === 'organic' ? 'telegram' : 'cpc',
      utmCampaign: person.campaign,
      utmContent: null,
    });
    data.interactions.add({
      customerId: created.customer.id,
      eventType: 'qualification_started',
      entityType: null,
      entityId: null,
      timestamp: iso(now, 11.5),
      metadata: null,
      utmSource: person.source,
      utmMedium: person.source === 'organic' ? 'telegram' : 'cpc',
      utmCampaign: person.campaign,
      utmContent: null,
    });
  }
}
