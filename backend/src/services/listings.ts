import { AppError } from '../errors.js';
import type { AutomotiveProviders, ListingFilters } from '../automotive.js';

export function listPublishedListings(data: AutomotiveProviders, filters: ListingFilters) {
  return data.catalog.list(filters, true);
}

export function getPublishedListing(data: AutomotiveProviders, id: number) {
  const listing = data.catalog.get(id, true);
  if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
  return listing;
}

export function addListingFavorite(data: AutomotiveProviders, customerId: number, listingId: number) {
  getPublishedListing(data, listingId);
  return data.favorites.add(customerId, listingId);
}
