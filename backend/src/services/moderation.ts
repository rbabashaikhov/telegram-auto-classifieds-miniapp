import type { AutomotiveProviders, ListingStatus } from '../automotive.js';
import { AppError } from '../errors.js';

function pending(data: AutomotiveProviders, id: number) {
  const listing = data.catalog.get(id, false);
  if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
  if (listing.status !== 'pending_moderation') throw new AppError('Listing is not pending moderation', 409, 'INVALID_LISTING_STATUS');
  return listing;
}

export function adminListingDetails(data: AutomotiveProviders, id: number) {
  const listing = data.catalog.get(id, false);
  if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
  const owner = listing.userId ? data.customers.getById(listing.userId) : undefined;
  return {
    ...listing,
    owner: owner ? { id: owner.id, name: owner.name, username: owner.username } : null,
    moderationHistory: data.moderation.list(id),
  };
}

function transition(data: AutomotiveProviders, id: number, status: ListingStatus, action: 'approved' | 'rejected', reason: string | null) {
  pending(data, id);
  const listing = data.sellerListings.setStatus(id, status);
  data.moderation.add(id, action, reason, 'admin');
  return listing;
}

export const approveListing = (data: AutomotiveProviders, id: number) => transition(data, id, 'published', 'approved', null);
export const rejectListing = (data: AutomotiveProviders, id: number, reason: string) => transition(data, id, 'rejected', 'rejected', reason);
