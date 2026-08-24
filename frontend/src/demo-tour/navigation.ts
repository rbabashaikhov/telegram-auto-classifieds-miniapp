import type { Listing, SellerListing } from '../types';
import type { TourAction } from './types';

export interface AutomotiveTourReader {
  getListings(): Promise<Listing[]>;
  getMyListings(): Promise<SellerListing[]>;
}

function guidedListing(items: SellerListing[]): SellerListing | undefined {
  return items.find((item) => item.status === 'draft' && item.photos.length)
    ?? items.find((item) => item.status === 'rejected' && item.photos.length)
    ?? items.find((item) => item.photos.length);
}

export async function resolveTourPath(action: TourAction, reader: AutomotiveTourReader): Promise<string> {
  if (action === 'open-listing') {
    const listings = await reader.getListings();
    return listings[0] ? `/listings/${listings[0].id}` : '/';
  }
  if (action === 'open-seller-cabinet' || action === 'open-moderation') return '/my/listings';
  if (action === 'open-demo-admin') return '/demo/admin';

  const listing = guidedListing(await reader.getMyListings());
  if (!listing) return '/my/listings';
  const guidedStep = action === 'open-editor-preview' ? 'preview' : action === 'open-editor-payment' ? 'payment' : 'details';
  return `/my/listings/${listing.id}/edit?tourStep=${guidedStep}`;
}
