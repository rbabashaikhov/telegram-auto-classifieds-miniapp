export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthContext {
  telegramUser: TelegramUser;
  isDemo: boolean;
}

export interface UtmSource {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

export const PURCHASE_GOALS = ['own_use', 'investment', 'relocation'] as const;
export type PurchaseGoal = (typeof PURCHASE_GOALS)[number];

export const PROPERTY_TYPES = ['new_build', 'secondary', 'apartments'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const ROOM_OPTIONS = ['studio', '1', '2', '3plus'] as const;
export type RoomOption = (typeof ROOM_OPTIONS)[number];

export const PURCHASE_TIMINGS = ['now', '1_3_months', '3_6_months', 'exploring'] as const;
export type PurchaseTiming = (typeof PURCHASE_TIMINGS)[number];

export const PAYMENT_METHODS = ['cash', 'mortgage', 'sell_and_buy', 'undecided'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MORTGAGE_STATUSES = ['approved', 'application_in_progress', 'not_applied'] as const;
export type MortgageStatus = (typeof MORTGAGE_STATUSES)[number];

export const FINISH_OPTIONS = ['finished', 'white_box', 'unfinished'] as const;
export type FinishOption = (typeof FINISH_OPTIONS)[number];

export const PROPERTY_STATUSES = ['available', 'reserved', 'sold'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const FEATURE_CODES = [
  'finished',
  'parking',
  'balcony',
  'near_metro',
  'school_nearby',
  'high_floor',
  'quiet_area',
] as const;
export type FeatureCode = (typeof FEATURE_CODES)[number];

export const DISTRICTS = [
  'primorsky',
  'moskovsky',
  'central',
  'vyborgsky',
  'vasileostrovsky',
] as const;
export type District = (typeof DISTRICTS)[number];

export const VIEWING_TYPES = ['on_site', 'office', 'online'] as const;
export type ViewingType = (typeof VIEWING_TYPES)[number];

export const VIEWING_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type ViewingStatus = (typeof VIEWING_STATUSES)[number];

export const LEAD_TEMPERATURES = ['COLD', 'WARM', 'HOT'] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const LEAD_STATUSES = ['new', 'qualified', 'viewing', 'handoff'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SELLER_CONDITIONS = ['excellent', 'good', 'needs_renovation', 'unfinished'] as const;
export type SellerCondition = (typeof SELLER_CONDITIONS)[number];

export const SELLER_TIMINGS = ['now', '1_3_months', '3_6_months', 'exploring'] as const;
export type SellerTiming = (typeof SELLER_TIMINGS)[number];

export const SELLER_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'closed'] as const;
export type SellerLeadStatus = (typeof SELLER_LEAD_STATUSES)[number];

export const INTERACTION_EVENTS = [
  'app_opened',
  'qualification_started',
  'qualification_completed',
  'matches_opened',
  'property_viewed',
  'property_revisited',
  'property_favorited',
  'property_unfavorited',
  'payment_calculated',
  'viewing_started',
  'viewing_requested',
  'manager_contact_requested',
] as const;
export type InteractionEventType = (typeof INTERACTION_EVENTS)[number];

export const OUTBOUND_EVENTS = [
  'lead.created',
  'lead.qualified',
  'lead.became_hot',
  'favorite.added',
  'viewing.requested',
  'viewing.completed',
  'seller_lead.created',
] as const;
export type OutboundEventName = (typeof OUTBOUND_EVENTS)[number];

export const MATCH_REASON_KINDS = ['match', 'partial', 'mismatch'] as const;
export type MatchReasonKind = (typeof MATCH_REASON_KINDS)[number];

export interface Customer {
  id: number;
  telegramUserId: number;
  name: string;
  username: string | null;
  phone: string | null;
  consentAt: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchPreference {
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: RoomOption;
  propertyType: PropertyType;
  preferences: FeatureCode[];
  areaMin: number | null;
  areaMax: number | null;
}

export interface BuyerProfile {
  id: number;
  customerId: number;
  goal: PurchaseGoal;
  propertyType: PropertyType;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: RoomOption;
  purchaseTiming: PurchaseTiming;
  payment: PaymentMethod;
  mortgageStatus: MortgageStatus | null;
  preferences: FeatureCode[];
  areaMin: number | null;
  areaMax: number | null;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SellerLead {
  id: number;
  customerId: number;
  location: string;
  propertyType: PropertyType;
  rooms: RoomOption;
  area: number;
  condition: SellerCondition;
  desiredPrice: number;
  saleTiming: SellerTiming;
  comment: string | null;
  contact: string | null;
  status: SellerLeadStatus;
  createdAt: string;
}

export interface PropertyProject {
  id: number;
  slug: string;
  name: string;
  district: District;
  address: string;
  description: string;
  propertyType: PropertyType;
  completionDate: string;
  imageUrl: string;
  gallery: string[];
  features: FeatureCode[];
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFeature {
  id: number;
  propertyId: number;
  code: FeatureCode;
  label: string;
}

export interface Property {
  id: number;
  projectId: number;
  unitNumber: string;
  rooms: RoomOption;
  roomsCount: number;
  area: number;
  floor: number;
  floorsTotal: number;
  price: number;
  finish: FinishOption;
  status: PropertyStatus;
  completionDate: string;
  gallery: string[];
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDetails extends Property {
  project: PropertyProject;
  features: PropertyFeature[];
}

export interface Favorite {
  id: number;
  customerId: number;
  propertyId: number;
  createdAt: string;
}

export interface MatchReason {
  code: string;
  label: string;
  kind: MatchReasonKind;
  weight: number;
  points: number;
}

export interface PropertyMatch {
  id?: number;
  propertyId: number;
  buyerProfileId: number | null;
  score: number;
  reasons: MatchReason[];
}

export interface Agent {
  id: number;
  name: string;
  phone: string;
  email: string;
  title: string;
  specialization: string;
  avatarUrl: string | null;
  active: boolean;
}

export interface Lead {
  id: number;
  customerId: number;
  buyerProfileId: number | null;
  agentId: number | null;
  score: number;
  temperature: LeadTemperature;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScore {
  score: number;
  temperature: LeadTemperature;
  profileScore: number;
  behaviorScore: number;
}

export interface LeadScoreEvent {
  id: number;
  leadId: number;
  eventType: string;
  delta: number;
  reason: string;
  scoreAfter: number;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Viewing {
  id: number;
  customerId: number;
  propertyId: number;
  agentId: number | null;
  scheduledAt: string;
  type: ViewingType;
  status: ViewingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ViewingHistory {
  id: number;
  viewingId: number;
  fromStatus: ViewingStatus | null;
  toStatus: ViewingStatus;
  note: string | null;
  createdAt: string;
}

export interface ViewingDetails extends Viewing {
  history: ViewingHistory[];
}

export interface InteractionEvent {
  id: number;
  customerId: number;
  eventType: InteractionEventType;
  entityType: string | null;
  entityId: number | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

export interface BusinessEvent {
  id: number;
  name: OutboundEventName;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface IdempotencyRecord {
  key: string;
  scope: string;
  status: number;
  body: string;
  createdAt: string;
}

export interface CrmHandoffPayload {
  customer: Customer;
  buyerProfile: BuyerProfile | null;
  lead: Lead | null;
  leadScore: LeadScore | null;
  scoreEvents: LeadScoreEvent[];
  topMatches: Array<PropertyMatch & { property?: PropertyDetails }>;
  favorites: Favorite[];
  viewings: Viewing[];
  source: UtmSource;
  recentInteractionEvents: InteractionEvent[];
}

export const FEATURE_LABELS: Record<FeatureCode, string> = {
  finished: 'Готовая отделка',
  parking: 'Паркинг',
  balcony: 'Балкон',
  near_metro: 'Рядом метро',
  school_nearby: 'Школа рядом',
  high_floor: 'Высокий этаж',
  quiet_area: 'Тихий район',
};

export const DISTRICT_LABELS: Record<District, string> = {
  primorsky: 'Приморский',
  moskovsky: 'Московский',
  central: 'Центральный',
  vyborgsky: 'Выборгский',
  vasileostrovsky: 'Василеостровский',
};
