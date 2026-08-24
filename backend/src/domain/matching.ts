import type {
  BuyerProfile,
  FeatureCode,
  MatchReason,
  Property,
  PropertyMatch,
  PropertyProject,
  PurchaseTiming,
  RoomOption,
} from '../types.js';

export interface MatchingWeights {
  budget: number;
  location: number;
  rooms: number;
  propertyType: number;
  moveIn: number;
  features: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  budget: 30,
  location: 20,
  rooms: 15,
  propertyType: 10,
  moveIn: 10,
  features: 15,
};

export interface MatchableProperty {
  property: Property;
  project: PropertyProject;
  featureCodes: FeatureCode[];
}

export interface MatchableProfile {
  propertyType: BuyerProfile['propertyType'];
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: RoomOption;
  purchaseTiming: PurchaseTiming;
  preferences: FeatureCode[];
  areaMin: number | null;
  areaMax: number | null;
}

const ROOM_NEIGHBORS: Record<RoomOption, RoomOption[]> = {
  studio: ['1'],
  '1': ['studio', '2'],
  '2': ['1', '3plus'],
  '3plus': ['2'],
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function budgetReason(
  profile: MatchableProfile,
  price: number,
  weight: number,
): MatchReason {
  if (price >= profile.budgetMin && price <= profile.budgetMax) {
    return {
      code: 'budget',
      label: 'входит в бюджет',
      kind: 'match',
      weight,
      points: weight,
    };
  }

  const span = Math.max(profile.budgetMax - profile.budgetMin, 1);
  if (price > profile.budgetMax && price <= profile.budgetMax * 1.1) {
    return {
      code: 'budget',
      label: 'цена чуть выше бюджета',
      kind: 'partial',
      weight,
      points: Math.round(weight * 0.5),
    };
  }
  if (price < profile.budgetMin && price >= profile.budgetMin * 0.9) {
    return {
      code: 'budget',
      label: 'цена чуть ниже желаемого диапазона',
      kind: 'partial',
      weight,
      points: Math.round(weight * 0.7),
    };
  }
  if (price > profile.budgetMax && price - profile.budgetMax <= span) {
    return {
      code: 'budget',
      label: 'выше бюджета',
      kind: 'mismatch',
      weight,
      points: Math.round(weight * 0.15),
    };
  }
  return {
    code: 'budget',
    label: 'не входит в бюджет',
    kind: 'mismatch',
    weight,
    points: 0,
  };
}

function locationReason(
  profile: MatchableProfile,
  project: PropertyProject,
  weight: number,
): MatchReason {
  const wanted = new Set(profile.locations);
  if (wanted.has(project.district) || wanted.has(project.slug)) {
    return {
      code: 'location',
      label: 'нужный район',
      kind: 'match',
      weight,
      points: weight,
    };
  }
  if (wanted.size === 0) {
    return {
      code: 'location',
      label: 'район не задан — объект подходит по остальным параметрам',
      kind: 'partial',
      weight,
      points: Math.round(weight * 0.5),
    };
  }
  return {
    code: 'location',
    label: 'другой район',
    kind: 'mismatch',
    weight,
    points: 0,
  };
}

function roomsReason(profile: MatchableProfile, rooms: RoomOption, weight: number): MatchReason {
  const labels: Record<RoomOption, string> = {
    studio: 'студия',
    '1': '1 комната',
    '2': '2 комнаты',
    '3plus': '3 и более комнат',
  };
  if (profile.rooms === rooms) {
    return {
      code: 'rooms',
      label: labels[rooms],
      kind: 'match',
      weight,
      points: weight,
    };
  }
  if (ROOM_NEIGHBORS[profile.rooms].includes(rooms)) {
    return {
      code: 'rooms',
      label: `близко к запросу: ${labels[rooms]}`,
      kind: 'partial',
      weight,
      points: Math.round(weight * 0.55),
    };
  }
  return {
    code: 'rooms',
    label: `другое число комнат: ${labels[rooms]}`,
    kind: 'mismatch',
    weight,
    points: 0,
  };
}

function propertyTypeReason(
  profile: MatchableProfile,
  projectType: PropertyProject['propertyType'],
  weight: number,
): MatchReason {
  if (profile.propertyType === projectType) {
    return {
      code: 'property_type',
      label: 'нужный тип объекта',
      kind: 'match',
      weight,
      points: weight,
    };
  }
  if (profile.propertyType === 'apartments' || projectType === 'apartments') {
    return {
      code: 'property_type',
      label: 'смежный тип жилья',
      kind: 'partial',
      weight,
      points: Math.round(weight * 0.5),
    };
  }
  return {
    code: 'property_type',
    label: 'другой тип объекта',
    kind: 'mismatch',
    weight,
    points: 0,
  };
}

function monthsUntil(completionDate: string, now: Date): number {
  const target = new Date(completionDate);
  const diff = target.getTime() - now.getTime();
  return diff / (1000 * 60 * 60 * 24 * 30);
}

function moveInReason(
  timing: PurchaseTiming,
  completionDate: string,
  weight: number,
  now: Date,
): MatchReason {
  const months = monthsUntil(completionDate, now);
  const ready = months <= 0;
  const soon = months <= 3;
  const mid = months <= 6;

  if (timing === 'exploring') {
    return {
      code: 'move_in',
      label: ready ? 'уже сдан' : 'срок сдачи подходит для изучения рынка',
      kind: 'match',
      weight,
      points: weight,
    };
  }
  if (timing === 'now') {
    if (ready) {
      return {
        code: 'move_in',
        label: 'можно въезжать',
        kind: 'match',
        weight,
        points: weight,
      };
    }
    if (soon) {
      return {
        code: 'move_in',
        label: 'сдача в ближайшие месяцы',
        kind: 'partial',
        weight,
        points: Math.round(weight * 0.6),
      };
    }
    return {
      code: 'move_in',
      label: 'срок сдачи позже, чем нужно',
      kind: 'mismatch',
      weight,
      points: 0,
    };
  }
  if (timing === '1_3_months') {
    if (ready || soon) {
      return {
        code: 'move_in',
        label: ready ? 'уже сдан' : 'сдача в горизонте 1–3 месяца',
        kind: 'match',
        weight,
        points: weight,
      };
    }
    if (mid) {
      return {
        code: 'move_in',
        label: 'сдача чуть позже желаемого срока',
        kind: 'partial',
        weight,
        points: Math.round(weight * 0.5),
      };
    }
    return {
      code: 'move_in',
      label: 'срок сдачи позже, чем нужно',
      kind: 'mismatch',
      weight,
      points: 0,
    };
  }
  if (ready || months <= 12) {
    return {
      code: 'move_in',
      label: ready ? 'уже сдан' : 'срок сдачи в комфортном горизонте',
      kind: 'match',
      weight,
      points: weight,
    };
  }
  return {
    code: 'move_in',
    label: 'далёкий срок сдачи',
    kind: 'partial',
    weight,
    points: Math.round(weight * 0.4),
  };
}

function featuresReason(
  wanted: FeatureCode[],
  actual: FeatureCode[],
  finish: Property['finish'],
  weight: number,
): MatchReason[] {
  if (wanted.length === 0) {
    return [
      {
        code: 'features',
        label: 'дополнительные пожелания не заданы',
        kind: 'partial',
        weight,
        points: Math.round(weight * 0.5),
      },
    ];
  }

  const present = new Set(actual);
  if (finish === 'finished') present.add('finished');

  const matched = wanted.filter((code) => present.has(code));
  const missing = wanted.filter((code) => !present.has(code));
  const ratio = matched.length / wanted.length;
  const points = Math.round(weight * ratio);
  const reasons: MatchReason[] = [];

  for (const code of matched) {
    const labels: Record<FeatureCode, string> = {
      finished: 'готовая отделка',
      parking: 'есть паркинг',
      balcony: 'есть балкон',
      near_metro: 'рядом метро',
      school_nearby: 'школа рядом',
      high_floor: 'высокий этаж',
      quiet_area: 'тихий район',
    };
    reasons.push({
      code: `feature_${code}`,
      label: labels[code],
      kind: 'match',
      weight: 0,
      points: 0,
    });
  }

  if (missing.length > 0) {
    const labels: Record<FeatureCode, string> = {
      finished: 'без готовой отделки',
      parking: 'без паркинга',
      balcony: 'без балкона',
      near_metro: 'метро дальше, чем хотелось бы',
      school_nearby: 'школа не рядом',
      high_floor: 'этаж ниже желаемого',
      quiet_area: 'район шумнее предпочтения',
    };
    for (const code of missing) {
      reasons.push({
        code: `feature_${code}`,
        label: labels[code],
        kind: 'partial',
        weight: 0,
        points: 0,
      });
    }
  }

  reasons.push({
    code: 'features',
    label: `${matched.length} из ${wanted.length} пожеланий`,
    kind: ratio === 1 ? 'match' : ratio > 0 ? 'partial' : 'mismatch',
    weight,
    points,
  });

  return reasons;
}

function areaReason(profile: MatchableProfile, area: number): MatchReason | null {
  if (profile.areaMin == null && profile.areaMax == null) return null;
  if (profile.areaMin != null && area < profile.areaMin) {
    const close = area >= profile.areaMin * 0.9;
    return {
      code: 'area',
      label: close ? 'площадь немного меньше желаемой' : 'площадь меньше желаемой',
      kind: close ? 'partial' : 'mismatch',
      weight: 0,
      points: 0,
    };
  }
  if (profile.areaMax != null && area > profile.areaMax) {
    return {
      code: 'area',
      label: 'площадь больше желаемой',
      kind: 'partial',
      weight: 0,
      points: 0,
    };
  }
  return {
    code: 'area',
    label: 'площадь в желаемом диапазоне',
    kind: 'match',
    weight: 0,
    points: 0,
  };
}

export function matchProperty(
  profile: MatchableProfile,
  item: MatchableProperty,
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS,
  now = new Date(),
  buyerProfileId: number | null = null,
): PropertyMatch {
  const reasons: MatchReason[] = [];

  const budget = budgetReason(profile, item.property.price, weights.budget);
  const location = locationReason(profile, item.project, weights.location);
  const rooms = roomsReason(profile, item.property.rooms, weights.rooms);
  const type = propertyTypeReason(profile, item.project.propertyType, weights.propertyType);
  const moveIn = moveInReason(profile.purchaseTiming, item.property.completionDate, weights.moveIn, now);
  const features = featuresReason(
    profile.preferences,
    item.featureCodes,
    item.property.finish,
    weights.features,
  );
  const area = areaReason(profile, item.property.area);

  reasons.push(budget, location, rooms, type, moveIn, ...features);
  if (area) reasons.push(area);

  const score = clampScore(
    budget.points +
      location.points +
      rooms.points +
      type.points +
      moveIn.points +
      (features.find((reason) => reason.code === 'features')?.points ?? 0),
  );

  return {
    propertyId: item.property.id,
    buyerProfileId,
    score,
    reasons,
  };
}

export function rankMatches(
  profile: MatchableProfile,
  catalog: MatchableProperty[],
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS,
  now = new Date(),
  buyerProfileId: number | null = null,
): PropertyMatch[] {
  return catalog
    .filter((item) => item.property.active && item.property.status === 'available')
    .map((item) => matchProperty(profile, item, weights, now, buyerProfileId))
    .sort((a, b) => b.score - a.score || a.propertyId - b.propertyId);
}
