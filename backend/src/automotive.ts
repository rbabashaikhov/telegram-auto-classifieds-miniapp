import type { Customer, TelegramUser } from './types.js';

export const LISTING_STATUSES = ['draft', 'pending_moderation', 'published', 'rejected', 'archived'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export const LISTING_SORTS = ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export interface VehicleBrand { id: number; name: string; slug: string }
export interface VehicleModel { id: number; brandId: number; name: string; slug: string }
export interface ListingPhoto { id: number; listingId: number; url: string; position: number }
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
  photos: ListingPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface ListingFilters {
  brand?: string;
  model?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  bodyType?: string;
  transmission?: string;
  driveType?: string;
  engineType?: string;
  city?: string;
  sort?: ListingSort;
}

export interface AutomotiveProviders {
  customers: {
    upsert(user: TelegramUser): { customer: Customer; created: boolean };
  };
  catalog: {
    list(filters?: ListingFilters, publishedOnly?: boolean): Listing[];
    get(id: number, publishedOnly?: boolean): Listing | undefined;
    brands(): VehicleBrand[];
    models(brand?: string): VehicleModel[];
  };
  favorites: {
    add(customerId: number, listingId: number): { created: boolean };
    remove(customerId: number, listingId: number): boolean;
    list(customerId: number): Listing[];
  };
}
