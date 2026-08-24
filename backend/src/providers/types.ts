import type {
  Agent,
  BuyerProfile,
  BusinessEvent,
  Customer,
  Favorite,
  FeatureCode,
  IdempotencyRecord,
  InteractionEvent,
  InteractionEventType,
  Lead,
  LeadScoreEvent,
  LeadStatus,
  LeadTemperature,
  OutboundEventName,
  Property,
  PropertyDetails,
  PropertyFeature,
  PropertyMatch,
  PropertyProject,
  SellerLead,
  SellerLeadStatus,
  TelegramUser,
  UtmSource,
  Viewing,
  ViewingDetails,
  ViewingHistory,
  ViewingStatus,
} from '../types.js';

export interface CustomerUpsertExtras extends Partial<UtmSource> {
  name?: string;
  phone?: string;
  consentAt?: string | null;
}

export interface CustomerProvider {
  upsert(user: TelegramUser, extras?: CustomerUpsertExtras): { customer: Customer; created: boolean };
  getById(id: number): Customer | undefined;
  getByTelegramUserId(telegramUserId: number): Customer | undefined;
  listAll(): Customer[];
  update(
    id: number,
    patch: Partial<Pick<Customer, 'name' | 'phone' | 'consentAt'> & UtmSource>,
  ): Customer;
  deleteById(id: number): void;
}

export interface BuyerProfileInput {
  customerId: number;
  goal: BuyerProfile['goal'];
  propertyType: BuyerProfile['propertyType'];
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: BuyerProfile['rooms'];
  purchaseTiming: BuyerProfile['purchaseTiming'];
  payment: BuyerProfile['payment'];
  mortgageStatus: BuyerProfile['mortgageStatus'];
  preferences: FeatureCode[];
  areaMin: number | null;
  areaMax: number | null;
  consentAt: string;
}

export interface BuyerProfileProvider {
  upsert(input: BuyerProfileInput): BuyerProfile;
  getByCustomerId(customerId: number): BuyerProfile | undefined;
  getById(id: number): BuyerProfile | undefined;
  listAll(): BuyerProfile[];
}

export interface PropertyWriteInput {
  projectId: number;
  unitNumber: string;
  rooms: Property['rooms'];
  roomsCount: number;
  area: number;
  floor: number;
  floorsTotal: number;
  price: number;
  finish: Property['finish'];
  status: Property['status'];
  completionDate: string;
  gallery: string[];
  description: string;
  active: boolean;
  features: Array<{ code: FeatureCode; label: string }>;
}

export interface ProjectWriteInput {
  slug: string;
  name: string;
  district: PropertyProject['district'];
  address: string;
  description: string;
  propertyType: PropertyProject['propertyType'];
  completionDate: string;
  imageUrl: string;
  gallery: string[];
  features: FeatureCode[];
  active: boolean;
  displayOrder: number;
}

export interface PropertyCatalogProvider {
  listProjects(activeOnly?: boolean): PropertyProject[];
  getProject(id: number): PropertyProject | undefined;
  getProjectBySlug(slug: string): PropertyProject | undefined;
  createProject(input: ProjectWriteInput): PropertyProject;
  updateProject(id: number, patch: Partial<ProjectWriteInput>): PropertyProject;
  listProperties(filters?: { projectId?: number; activeOnly?: boolean; status?: Property['status'] }): PropertyDetails[];
  getProperty(id: number): PropertyDetails | undefined;
  createProperty(input: PropertyWriteInput): PropertyDetails;
  updateProperty(id: number, patch: Partial<PropertyWriteInput>): PropertyDetails;
}

export interface FavoriteProvider {
  add(customerId: number, propertyId: number): { favorite: Favorite; created: boolean };
  remove(customerId: number, propertyId: number): boolean;
  listByCustomer(customerId: number): Favorite[];
  has(customerId: number, propertyId: number): boolean;
}

export interface MatchStoreProvider {
  replaceForProfile(buyerProfileId: number, matches: PropertyMatch[]): PropertyMatch[];
  listByProfile(buyerProfileId: number): PropertyMatch[];
}

export interface LeadListFilters {
  temperature?: LeadTemperature;
  purchaseTiming?: BuyerProfile['purchaseTiming'];
  budgetMin?: number;
  budgetMax?: number;
  agentId?: number;
}

export interface LeadProvider {
  upsertForCustomer(params: {
    customerId: number;
    buyerProfileId: number | null;
    agentId: number | null;
    score: number;
    temperature: LeadTemperature;
    status: LeadStatus;
  }): Lead;
  getById(id: number): Lead | undefined;
  getByCustomerId(customerId: number): Lead | undefined;
  list(filters?: LeadListFilters): Lead[];
  update(id: number, patch: Partial<Pick<Lead, 'score' | 'temperature' | 'status' | 'agentId'>>): Lead;
}

export interface LeadScoreEventProvider {
  add(params: Omit<LeadScoreEvent, 'id'>): LeadScoreEvent;
  listByLead(leadId: number): LeadScoreEvent[];
  replaceProfileEvents(leadId: number, events: Array<Omit<LeadScoreEvent, 'id' | 'leadId'>>): void;
}

export interface AgentProvider {
  list(): Agent[];
  getById(id: number): Agent | undefined;
  pickForAssignment(): Agent | undefined;
}

export interface ViewingProvider {
  create(params: Omit<Viewing, 'id' | 'createdAt' | 'updatedAt'>): Viewing;
  getById(id: number): ViewingDetails | undefined;
  list(filters?: { status?: ViewingStatus; customerId?: number; propertyId?: number }): ViewingDetails[];
  listByCustomer(customerId: number): ViewingDetails[];
  updateStatus(id: number, status: ViewingStatus, note?: string | null): ViewingDetails;
  occupiedSlots(propertyId: number, date: string): string[];
}

export interface SellerLeadProvider {
  create(params: Omit<SellerLead, 'id' | 'createdAt'>): SellerLead;
  list(filters?: { status?: SellerLeadStatus }): SellerLead[];
  getById(id: number): SellerLead | undefined;
  updateStatus(id: number, status: SellerLeadStatus): SellerLead;
}

export interface InteractionProvider {
  add(params: Omit<InteractionEvent, 'id'>): InteractionEvent;
  listByCustomer(customerId: number, limit?: number): InteractionEvent[];
  listAll(limit?: number): InteractionEvent[];
  hasEvent(customerId: number, eventType: InteractionEventType, entityType?: string | null, entityId?: number | null): boolean;
  countByType(): Record<string, number>;
  uniqueCustomersByType(): Record<string, number>;
}

export interface EventProvider {
  publish(name: OutboundEventName, payload: Record<string, unknown>): BusinessEvent;
  list(limit?: number): BusinessEvent[];
}

export interface IdempotencyProvider {
  get(key: string, scope: string): IdempotencyRecord | undefined;
  put(record: Omit<IdempotencyRecord, 'createdAt'>): IdempotencyRecord;
}

export interface Providers {
  customers: CustomerProvider;
  profiles: BuyerProfileProvider;
  properties: PropertyCatalogProvider;
  favorites: FavoriteProvider;
  matches: MatchStoreProvider;
  leads: LeadProvider;
  scoreEvents: LeadScoreEventProvider;
  agents: AgentProvider;
  viewings: ViewingProvider;
  sellerLeads: SellerLeadProvider;
  interactions: InteractionProvider;
  events: EventProvider;
  idempotency: IdempotencyProvider;
  transaction<T>(fn: () => T): T;
}
