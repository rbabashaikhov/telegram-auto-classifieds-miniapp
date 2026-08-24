import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { AutomotiveProviders } from '../automotive.js';
import { AppError } from '../errors.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import type { FileStorage } from '../providers/fileStorage.js';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES, MAX_LISTING_PHOTOS } from '../providers/local/fileStorage.js';
import { addSellerPhotos, archiveSellerListing, createSellerListing, removeSellerPhoto, sellerListingDetails, submitSellerListing, updateSellerListing } from '../services/sellerListings.js';
import { asyncHandler, mountErrorHandler, ok, parseId } from './helpers.js';

export const listingInputSchema = z.object({
  brandId: z.number().int().positive(), modelId: z.number().int().positive(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  price: z.number().int().positive().max(1_000_000_000), mileage: z.number().int().nonnegative().max(5_000_000),
  bodyType: z.enum(['sedan', 'suv', 'hatchback', 'liftback', 'wagon', 'coupe', 'minivan', 'pickup']),
  transmission: z.enum(['automatic', 'manual', 'robot', 'variator']), driveType: z.enum(['front', 'rear', 'all']),
  engineType: z.enum(['petrol', 'diesel', 'hybrid', 'electric']), engineVolume: z.number().positive().max(10),
  color: z.string().trim().min(2).max(40), city: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(5000),
});

const upload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_LISTING_PHOTOS },
  fileFilter: (_req, file, callback) => callback(null, ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)),
});

function uploadImages(req: Request, res: Response, next: NextFunction): void {
  upload.array('photos', MAX_LISTING_PHOTOS)(req, res, (error) => {
    if (error) { next(new AppError(error.message, 400, 'INVALID_IMAGE_UPLOAD')); return; }
    next();
  });
}

function customerId(req: Request, data: AutomotiveProviders): number {
  return data.customers.upsert(requireAuth(req).telegramUser).customer.id;
}

export function createSellerListingsRouter(data: AutomotiveProviders, storage: FileStorage, authenticate: RequestHandler = authMiddleware): Router {
  const router = Router();
  router.use('/me/listings', authenticate);
  router.get('/me/listings', (req, res) => ok(res, data.sellerListings.listByOwner(customerId(req, data))));
  router.get('/me/listings/:id', (req, res) => ok(res, sellerListingDetails(data, customerId(req, data), parseId(req.params.id))));
  router.post('/me/listings', (req, res) => ok(res, createSellerListing(data, customerId(req, data), listingInputSchema.parse(req.body)), 201));
  router.patch('/me/listings/:id', (req, res) => ok(res, updateSellerListing(data, customerId(req, data), parseId(req.params.id), listingInputSchema.parse(req.body))));
  router.post('/me/listings/:id/submit', (req, res) => ok(res, submitSellerListing(data, customerId(req, data), parseId(req.params.id))));
  router.post('/me/listings/:id/archive', (req, res) => ok(res, archiveSellerListing(data, customerId(req, data), parseId(req.params.id))));
  router.post('/me/listings/:id/photos', uploadImages, asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    ok(res, await addSellerPhotos(data, storage, customerId(req, data), parseId(req.params.id), files.map((file) => ({ buffer: file.buffer, mimeType: file.mimetype }))), 201);
  }));
  router.delete('/me/listings/:id/photos/:photoId', asyncHandler(async (req, res) => {
    ok(res, await removeSellerPhoto(data, storage, customerId(req, data), parseId(req.params.id), parseId(req.params.photoId)));
  }));
  mountErrorHandler(router);
  return router;
}
