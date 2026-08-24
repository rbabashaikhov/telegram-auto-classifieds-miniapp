import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../../errors.js';
import type { FileStorage, FileUpload, StoredFile } from '../fileStorage.js';

const FORMATS = {
  'image/jpeg': { extension: '.jpg', valid: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { extension: '.png', valid: (b: Buffer) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/webp': { extension: '.webp', valid: (b: Buffer) => b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  'image/gif': { extension: '.gif', valid: (b: Buffer) => b.length >= 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString()) },
} as const;

export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(FORMATS);
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_LISTING_PHOTOS = 10;

export class LocalFileStorage implements FileStorage {
  constructor(private readonly root: string, private readonly publicPrefix = '/uploads/listings') {}

  async save(file: FileUpload): Promise<StoredFile> {
    const format = FORMATS[file.mimeType as keyof typeof FORMATS];
    if (!format || !format.valid(file.buffer)) throw new AppError('Invalid image file', 400, 'INVALID_IMAGE');
    if (file.buffer.length === 0 || file.buffer.length > MAX_IMAGE_SIZE_BYTES) throw new AppError('Image is too large', 400, 'IMAGE_TOO_LARGE');
    await fs.mkdir(this.root, { recursive: true });
    const key = `${randomUUID()}${format.extension}`;
    await fs.writeFile(path.join(this.root, key), file.buffer, { flag: 'wx' });
    return { key, url: `${this.publicPrefix}/${key}`, mimeType: file.mimeType, sizeBytes: file.buffer.length };
  }

  async delete(key: string): Promise<void> {
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(key) || path.basename(key) !== key) {
      throw new AppError('Invalid storage key', 400, 'INVALID_STORAGE_KEY');
    }
    await fs.unlink(path.join(this.root, key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
