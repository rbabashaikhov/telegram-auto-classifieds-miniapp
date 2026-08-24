export interface AppConfig {
  businessName: string;
  businessType: string;
  businessVertical: string;
  appTitle: string;
  appDescription: string;
  timezone: string;
  demoMode: boolean;
  paymentProvider: 'demo' | 'external';
  demoPaymentsEnabled: boolean;
  adminProtected: boolean;
  currency: string;
  currencySymbol: string;
  branding: { accent: string; logoUrl: string | null };
  mortgage: {
    defaultRate: number;
    defaultTermYears: number;
    defaultDownPercent: number;
  };
  features: { demoTour: boolean; demoAdminPreview: boolean };
}

export interface VehicleBrand { id: number; name: string; slug: string }
export interface VehicleModel { id: number; brandId: number; name: string; slug: string }
export type ListingStatus = 'draft' | 'pending_moderation' | 'published' | 'rejected' | 'archived';
export interface Listing {
  id: number;
  userId: number | null;
  brand: VehicleBrand;
  model: VehicleModel;
  year: number;
  price: number;
  mileage: number;
  bodyType: string;
  transmission: string;
  driveType: string;
  engineType: string;
  engineVolume: number;
  color: string;
  city: string;
  description: string;
  status: ListingStatus;
  photos: Array<{ id: number; listingId: number; url: string; position: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationEvent { id: number; listingId: number; action: string; reason: string | null; adminIdentifier: string | null; createdAt: string }
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export interface Tariff { id: number; code: string; name: string; description: string; priceMinor: number; currency: string; durationDays: number; active: boolean; displayOrder: number; createdAt: string; updatedAt: string }
export interface PaymentEvent { id: number; paymentId: number; provider: string; providerEventId: string; status: PaymentStatus; metadata: Record<string, unknown> | null; createdAt: string }
export interface Payment { id: number; customerId: number; listingId: number; tariffId: number; provider: string; providerPaymentId: string | null; amountMinor: number; currency: string; status: PaymentStatus; confirmationUrl: string | null; idempotencyKey: string; createdAt: string; updatedAt: string; paidAt: string | null; failedAt: string | null; cancelledAt: string | null; tariff: Tariff; events: PaymentEvent[] }
export interface SellerListing extends Listing { moderationHistory: ModerationEvent[]; payment: Payment | null }
export interface AdminListing extends Listing { owner: { id: number; name: string; username: string | null } | null; moderationHistory: ModerationEvent[] }
export interface AdminPayment extends Payment { listing: { id: number; title: string } | null; customer: { id: number; name: string; username: string | null } | null }
export interface ListingInput {
  brandId: number; modelId: number; year: number; price: number; mileage: number; bodyType: string;
  transmission: string; driveType: string; engineType: string; engineVolume: number; color: string;
  city: string; description: string;
}

export interface ListingFilters {
  brand?: string; model?: string; priceMin?: string; priceMax?: string; yearMin?: string; yearMax?: string;
  mileageMax?: string; bodyType?: string; transmission?: string; driveType?: string; engineType?: string;
  city?: string; sort?: 'newest' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc';
}

export interface MatchReason {
  code: string;
  label: string;
  kind: 'match' | 'partial' | 'mismatch';
  weight: number;
  points: number;
}

export interface PropertyCard {
  id: number;
  unitNumber: string;
  rooms: string;
  roomsCount: number;
  area: number;
  floor: number;
  floorsTotal: number;
  price: number;
  finish: string;
  status: string;
  completionDate: string;
  gallery: string[];
  description: string;
  features: Array<{ code: string; label: string }>;
  project: {
    id: number;
    slug: string;
    name: string;
    district: string;
    districtLabel: string;
    address: string;
    description: string;
    propertyType: string;
    completionDate: string;
    imageUrl: string;
    features: string[];
  };
  match: { score: number; reasons: MatchReason[] } | null;
  favorited?: boolean;
}

export interface BuyerProfile {
  id: number;
  goal: string;
  propertyType: string;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: string;
  purchaseTiming: string;
  payment: string;
  mortgageStatus: string | null;
  preferences: string[];
  areaMin: number | null;
  areaMax: number | null;
}

export interface LeadSummary {
  id: number;
  customerId: number;
  score: number;
  temperature: 'HOT' | 'WARM' | 'COLD';
  status: string;
  customer?: { id: number; name: string; phone?: string | null } | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  purchaseTiming?: string | null;
  payment?: string | null;
  matches?: number;
  favorites?: number;
  latestActivity?: { eventType: string; timestamp: string } | null;
  agent?: { id: number; name: string } | null;
  scoreBreakdown?: {
    score: number;
    temperature: string;
    profileScore: number;
    behaviorScore: number;
    events: Array<{ eventType: string; delta: number; reason: string; scoreAfter: number; createdAt: string }>;
  };
}

export interface DashboardKpis {
  newLeads: number;
  hotLeads: number;
  qualificationsCompleted: number;
  viewingRequests: number;
}

export interface FunnelAnalytics {
  funnel: Array<{ key: string; event: string; customers: number }>;
  conversions: Array<{ from: string | null; to: string; rate: number }>;
  temperature: { HOT: number; WARM: number; COLD: number };
  mostViewed: Array<{ propertyId: number; name: string; count: number }>;
  mostFavorited: Array<{ propertyId: number; name: string; count: number }>;
  propertyViewingConversion: Array<{
    propertyId: number;
    name: string;
    views: number;
    viewingRequests: number;
    conversion: number;
  }>;
  averageMatchesPerQualifiedLead: number;
  leadsByUtmSource: Record<string, number>;
  leadsByUtmCampaign: Record<string, number>;
  viewingRequestsByProject: Array<{ projectId: number; name: string; count: number }>;
}

export interface MortgageResult {
  price: number;
  downPayment: number;
  loanAmount: number;
  annualRatePercent: number;
  termYears: number;
  monthlyPayment: number;
  totalPayment: number;
  overpayment: number;
}

export interface QualificationDraft {
  goal: string;
  propertyType: string;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: string;
  purchaseTiming: string;
  payment: string;
  mortgageStatus: string | null;
  preferences: string[];
  areaMin: number | null;
  areaMax: number | null;
}
