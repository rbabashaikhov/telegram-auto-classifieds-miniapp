import type {
  BuyerProfile,
  InteractionEventType,
  LeadScore,
  LeadTemperature,
  PaymentMethod,
  PurchaseTiming,
} from '../types.js';

export interface ScoringWeights {
  purchaseNow: number;
  purchase1To3Months: number;
  cash: number;
  mortgageApproved: number;
  propertyViewed: number;
  propertyRevisited: number;
  favoriteAdded: number;
  paymentCalculated: number;
  viewingRequested: number;
  managerContactRequested: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  purchaseNow: 25,
  purchase1To3Months: 15,
  cash: 20,
  mortgageApproved: 15,
  propertyViewed: 2,
  propertyRevisited: 4,
  favoriteAdded: 7,
  paymentCalculated: 5,
  viewingRequested: 25,
  managerContactRequested: 30,
};

export const TEMPERATURE_THRESHOLDS = {
  warm: 40,
  hot: 70,
} as const;

export function clampLeadScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function temperatureFromScore(score: number): LeadTemperature {
  if (score >= TEMPERATURE_THRESHOLDS.hot) return 'HOT';
  if (score >= TEMPERATURE_THRESHOLDS.warm) return 'WARM';
  return 'COLD';
}

export interface ProfileScoreBreakdown {
  points: number;
  events: Array<{ eventType: string; delta: number; reason: string }>;
}

export function profileScoreFromBuyer(
  profile: Pick<BuyerProfile, 'purchaseTiming' | 'payment' | 'mortgageStatus'>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ProfileScoreBreakdown {
  const events: ProfileScoreBreakdown['events'] = [];

  const timingPoints: Partial<Record<PurchaseTiming, { delta: number; reason: string; eventType: string }>> =
    {
      now: {
        delta: weights.purchaseNow,
        reason: 'Покупка сейчас',
        eventType: 'purchase_now',
      },
      '1_3_months': {
        delta: weights.purchase1To3Months,
        reason: 'Покупка в ближайшие 1–3 месяца',
        eventType: 'purchase_1_3_months',
      },
    };
  const timing = timingPoints[profile.purchaseTiming];
  if (timing) events.push(timing);

  const paymentPoints: Partial<Record<PaymentMethod, { delta: number; reason: string; eventType: string }>> = {
    cash: { delta: weights.cash, reason: 'Оплата наличными', eventType: 'cash' },
  };
  const payment = paymentPoints[profile.payment];
  if (payment) events.push(payment);

  if (profile.payment === 'mortgage' && profile.mortgageStatus === 'approved') {
    events.push({
      eventType: 'mortgage_approved',
      delta: weights.mortgageApproved,
      reason: 'Ипотека одобрена',
    });
  }

  const points = events.reduce((sum, event) => sum + event.delta, 0);
  return { points, events };
}

const BEHAVIOR_MAP: Partial<
  Record<InteractionEventType, { key: keyof ScoringWeights; reason: string }>
> = {
  property_viewed: { key: 'propertyViewed', reason: 'Просмотр объекта' },
  property_revisited: { key: 'propertyRevisited', reason: 'Повторный просмотр объекта' },
  property_favorited: { key: 'favoriteAdded', reason: 'Добавлен в избранное' },
  payment_calculated: { key: 'paymentCalculated', reason: 'Расчёт платежа' },
  viewing_requested: { key: 'viewingRequested', reason: 'Запрошен просмотр' },
  manager_contact_requested: { key: 'managerContactRequested', reason: 'Запрошен контакт менеджера' },
};

export function behaviorDelta(
  eventType: InteractionEventType,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): { delta: number; reason: string } | null {
  const mapped = BEHAVIOR_MAP[eventType];
  if (!mapped) return null;
  return { delta: weights[mapped.key], reason: mapped.reason };
}

export function composeLeadScore(profileScore: number, behaviorScore: number): LeadScore {
  const score = clampLeadScore(profileScore + behaviorScore);
  return {
    score,
    temperature: temperatureFromScore(score),
    profileScore: clampLeadScore(profileScore),
    behaviorScore: clampLeadScore(behaviorScore),
  };
}
