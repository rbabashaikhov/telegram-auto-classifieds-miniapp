import type { AutomotiveProviders, Listing, ListingStatus, ListingWriteInput } from '../automotive.js';
import { AppError } from '../errors.js';
import type { FileStorage, FileUpload } from '../providers/fileStorage.js';
import { MAX_LISTING_PHOTOS } from '../providers/local/fileStorage.js';
import type { PaymentRepository } from '../payments.js';

function ownListing(data: AutomotiveProviders, customerId: number, id: number): Listing {
  const listing = data.sellerListings.getByOwner(id, customerId);
  if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
  return listing;
}

function validateVehicle(data: AutomotiveProviders, input: ListingWriteInput): void {
  const brand = data.catalog.brands().find((item) => item.id === input.brandId);
  const model = data.catalog.models().find((item) => item.id === input.modelId);
  if (!brand || !model || model.brandId !== brand.id) throw new AppError('Invalid brand or model', 400, 'INVALID_VEHICLE');
}

export function sellerListingDetails(data: AutomotiveProviders, customerId: number, id: number) {
  const listing = ownListing(data, customerId, id);
  return { ...listing, moderationHistory: data.moderation.list(id) };
}

export function createSellerListing(data: AutomotiveProviders, customerId: number, input: ListingWriteInput) {
  validateVehicle(data, input);
  return data.sellerListings.create(customerId, input);
}

export function updateSellerListing(data: AutomotiveProviders, customerId: number, id: number, input: ListingWriteInput) {
  const listing = ownListing(data, customerId, id);
  if (!(['draft', 'rejected', 'published'] as ListingStatus[]).includes(listing.status)) {
    throw new AppError('Listing cannot be edited in its current status', 409, 'INVALID_LISTING_STATUS');
  }
  validateVehicle(data, input);
  const nextStatus: ListingStatus = listing.status === 'published' ? 'pending_moderation' : listing.status === 'rejected' ? 'draft' : 'draft';
  const updated = data.sellerListings.update(id, input, nextStatus);
  if (listing.status === 'published') data.moderation.add(id, 'submitted');
  if (listing.status === 'rejected') data.moderation.add(id, 'reopened');
  return updated;
}

export function submitSellerListing(data: AutomotiveProviders, payments: PaymentRepository, customerId: number, id: number) {
  const listing = ownListing(data, customerId, id);
  if (!(['draft', 'rejected'] as ListingStatus[]).includes(listing.status)) {
    throw new AppError('Only draft or rejected listings can be submitted', 409, 'INVALID_LISTING_STATUS');
  }
  if (data.sellerListings.photoCount(id) < 1) throw new AppError('At least one photo is required', 400, 'PHOTO_REQUIRED');
  if (!payments.paidForListing(id)) throw new AppError('Payment is required before moderation', 402, 'PAYMENT_REQUIRED');
  const updated = data.sellerListings.setStatus(id, 'pending_moderation');
  data.moderation.add(id, 'submitted');
  return updated;
}

export function archiveSellerListing(data: AutomotiveProviders, customerId: number, id: number) {
  const listing = ownListing(data, customerId, id);
  if (!(['draft', 'rejected', 'published'] as ListingStatus[]).includes(listing.status)) {
    throw new AppError('Listing cannot be archived in its current status', 409, 'INVALID_LISTING_STATUS');
  }
  const updated = data.sellerListings.setStatus(id, 'archived');
  data.moderation.add(id, 'archived');
  return updated;
}

export async function addSellerPhotos(data: AutomotiveProviders, storage: FileStorage, customerId: number, id: number, files: FileUpload[]) {
  const listing = ownListing(data, customerId, id);
  if (!(['draft', 'rejected'] as ListingStatus[]).includes(listing.status)) throw new AppError('Photos cannot be changed in this status', 409, 'INVALID_LISTING_STATUS');
  const existing = data.sellerListings.photoCount(id);
  if (!files.length) throw new AppError('No images uploaded', 400, 'IMAGE_REQUIRED');
  if (existing + files.length > MAX_LISTING_PHOTOS) throw new AppError(`Maximum ${MAX_LISTING_PHOTOS} photos`, 400, 'TOO_MANY_IMAGES');
  const saved = [];
  try {
    for (const file of files) {
      const stored = await storage.save(file);
      saved.push(stored);
    }
    return saved.map((photo) => data.sellerListings.addPhoto(id, { url: photo.url, storageKey: photo.key, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes }));
  } catch (error) {
    await Promise.all(saved.map((file) => storage.delete(file.key).catch(() => undefined)));
    throw error;
  }
}

export async function removeSellerPhoto(data: AutomotiveProviders, storage: FileStorage, customerId: number, listingId: number, photoId: number) {
  const listing = ownListing(data, customerId, listingId);
  if (!(['draft', 'rejected'] as ListingStatus[]).includes(listing.status)) throw new AppError('Photos cannot be changed in this status', 409, 'INVALID_LISTING_STATUS');
  const photo = data.sellerListings.getPhoto(photoId);
  if (!photo || photo.listingId !== listing.id) throw new AppError('Photo not found', 404, 'NOT_FOUND');
  data.sellerListings.removePhoto(photoId);
  if (photo.storageKey) await storage.delete(photo.storageKey);
  return { removed: true };
}
