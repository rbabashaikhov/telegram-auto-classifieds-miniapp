import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFileStorage } from './fileStorage.js';

const directories: string[] = [];
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0]);

afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

describe('LocalFileStorage', () => {
  it('uses a server-generated key and validates file contents', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'automarket-upload-')); directories.push(root);
    const storage = new LocalFileStorage(root);
    const saved = await storage.save({ buffer: png, mimeType: 'image/png' });
    expect(saved.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(await fs.readFile(path.join(root, saved.key))).toEqual(png);
    await expect(storage.save({ buffer: Buffer.from('fake'), mimeType: 'image/png' })).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
  });

  it('rejects path traversal keys', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'automarket-upload-')); directories.push(root);
    await expect(new LocalFileStorage(root).delete('../outside.png')).rejects.toMatchObject({ code: 'INVALID_STORAGE_KEY' });
  });
});
