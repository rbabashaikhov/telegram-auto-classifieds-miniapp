import type {
  AppConfig,
  BuyerProfile,
  DashboardKpis,
  FunnelAnalytics,
  LeadSummary,
  MortgageResult,
  PropertyCard,
  QualificationDraft,
  Listing,
  ListingFilters,
  VehicleBrand,
  VehicleModel,
  ListingInput,
  SellerListing,
  AdminListing,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let initData = '';
let adminToken = '';

if (typeof sessionStorage !== 'undefined') {
  adminToken = sessionStorage.getItem('admin_token') || '';
}

export function setTelegramInitData(value: string): void {
  initData = value;
}

export function setAdminToken(value: string): void {
  adminToken = value;
  if (typeof sessionStorage !== 'undefined') {
    if (value) sessionStorage.setItem('admin_token', value);
    else sessionStorage.removeItem('admin_token');
  }
}

export function getAdminToken(): string {
  return adminToken;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (initData) headers.set('x-telegram-init-data', initData);
  if (adminToken && path.startsWith('/api/admin')) headers.set('x-admin-token', adminToken);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || `Request failed (${response.status})`,
      response.status,
      payload.error?.code || 'ERROR',
    );
  }
  return (payload.data ?? payload) as T;
}

export const api = {
  getListings: (filters: ListingFilters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, value); });
    return request<Listing[]>(`/api/listings${query.size ? `?${query}` : ''}`);
  },
  getListing: (id: number) => request<Listing>(`/api/listings/${id}`),
  getVehicleBrands: () => request<VehicleBrand[]>('/api/vehicle-brands'),
  getVehicleModels: (brand = '') => request<VehicleModel[]>(`/api/vehicle-models${brand ? `?brand=${encodeURIComponent(brand)}` : ''}`),
  getListingFavorites: () => request<Listing[]>('/api/me/favorites'),
  addListingFavorite: (id: number) => request<{ created: boolean }>(`/api/listings/${id}/favorite`, { method: 'POST', body: '{}' }),
  removeListingFavorite: (id: number) => request<{ removed: boolean }>(`/api/listings/${id}/favorite`, { method: 'DELETE' }),
  getMyListings: () => request<Listing[]>('/api/me/listings'),
  getMyListing: (id: number) => request<SellerListing>(`/api/me/listings/${id}`),
  createMyListing: (body: ListingInput) => request<Listing>('/api/me/listings', { method: 'POST', body: JSON.stringify(body) }),
  updateMyListing: (id: number, body: ListingInput) => request<Listing>(`/api/me/listings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  submitMyListing: (id: number) => request<Listing>(`/api/me/listings/${id}/submit`, { method: 'POST', body: '{}' }),
  archiveMyListing: (id: number) => request<Listing>(`/api/me/listings/${id}/archive`, { method: 'POST', body: '{}' }),
  uploadListingPhotos: (id: number, files: File[]) => { const body = new FormData(); files.forEach((file) => body.append('photos', file)); return request<Listing['photos']>(`/api/me/listings/${id}/photos`, { method: 'POST', body }); },
  removeListingPhoto: (listingId: number, photoId: number) => request<{ removed: boolean }>(`/api/me/listings/${listingId}/photos/${photoId}`, { method: 'DELETE' }),
  getAdminListings: (demo = false, status = '') => request<Listing[]>(`/api/${demo ? 'demo-admin' : 'admin'}/listings${status ? `?status=${status}` : ''}`),
  getAdminListing: (id: number, demo = false) => request<AdminListing>(`/api/${demo ? 'demo-admin' : 'admin'}/listings/${id}`),
  approveAdminListing: (id: number) => request<Listing>(`/api/admin/listings/${id}/approve`, { method: 'POST', body: '{}' }),
  rejectAdminListing: (id: number, reason: string) => request<Listing>(`/api/admin/listings/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getConfig: () => request<AppConfig>('/api/config'),
  getCatalog: () => request<{ projects: unknown[]; properties: PropertyCard[] }>('/api/catalog'),
  getProperty: (id: number) => request<PropertyCard>(`/api/properties/${id}`),
  viewProperty: (id: number) => request<{ eventType: string }>(`/api/properties/${id}/view`, { method: 'POST', body: '{}' }),
  track: (body: Record<string, unknown>) => request('/api/events', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () =>
    request<{
      customer: { id: number; name: string };
      profile: BuyerProfile | null;
      lead: LeadSummary | null;
      favorites: Array<{ propertyId: number; property: PropertyCard }>;
      viewings: Array<{ id: number; propertyId: number; scheduledAt: string; type: string; status: string }>;
      matches: Array<{ score: number; property: PropertyCard }>;
    }>('/api/me'),
  resetMe: () => request('/api/me/reset', { method: 'POST', body: '{}' }),
  qualify: (body: QualificationDraft & { consent: true }) =>
    request<{ profile: BuyerProfile; lead: LeadSummary; matches: Array<{ score: number; reasons: unknown; property: PropertyCard }> }>(
      '/api/qualification',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  previewMatches: (body: Partial<QualificationDraft>) =>
    request<Array<{ score: number; reasons: NonNullable<PropertyCard['match']>['reasons']; property: PropertyCard }>>(
      '/api/matches/preview',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getMatches: () => request<Array<{ score: number; reasons: unknown; property: PropertyCard }>>('/api/matches'),
  addFavorite: (propertyId: number) => request(`/api/favorites/${propertyId}`, { method: 'POST', body: '{}' }),
  removeFavorite: (propertyId: number) => request(`/api/favorites/${propertyId}`, { method: 'DELETE' }),
  mortgage: (body: Record<string, unknown>) => request<MortgageResult>('/api/mortgage', { method: 'POST', body: JSON.stringify(body) }),
  getSlots: (propertyId: number, date: string) => request<string[]>(`/api/properties/${propertyId}/slots?date=${date}`),
  createViewing: (body: Record<string, unknown>) => request('/api/viewings', { method: 'POST', body: JSON.stringify(body) }),
  cancelViewing: (id: number) => request(`/api/viewings/${id}/cancel`, { method: 'POST', body: '{}' }),
  contactManager: () => request('/api/contact-manager', { method: 'POST', body: '{}' }),
  createSellerLead: (body: Record<string, unknown>) => request('/api/seller-leads', { method: 'POST', body: JSON.stringify(body) }),
  getAdminDashboard: () => request<DashboardKpis>('/api/admin/dashboard'),
  getAdminAnalytics: () => request<FunnelAnalytics>('/api/admin/analytics'),
  getAdminLeads: (query = '') => request<LeadSummary[]>(`/api/admin/leads${query}`),
  getAdminLead: (id: number) => request<Record<string, unknown>>(`/api/admin/leads/${id}`),
  getAdminProperties: () => request<{ projects: Array<{ id: number; name: string }>; properties: PropertyCard[] }>('/api/admin/properties'),
  patchProperty: (id: number, body: Record<string, unknown>) =>
    request(`/api/admin/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAdminViewings: () => request<Array<Record<string, unknown>>>('/api/admin/viewings'),
  patchViewingStatus: (id: number, status: string) =>
    request(`/api/admin/viewings/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  getAdminSellers: () => request<Array<Record<string, unknown>>>('/api/admin/seller-leads'),
  getAdminAgents: () => request<Array<{ id: number; name: string }>>('/api/admin/agents'),
  getDemoDashboard: () => request<DashboardKpis>('/api/demo-admin/dashboard'),
  getDemoAnalytics: () => request<FunnelAnalytics>('/api/demo-admin/analytics'),
  getDemoLeads: () => request<LeadSummary[]>('/api/demo-admin/leads'),
  getDemoLead: (id: number) => request<Record<string, unknown>>(`/api/demo-admin/leads/${id}`),
};
