export interface FileUpload {
  buffer: Buffer;
  mimeType: string;
}

export interface StoredFile {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FileStorage {
  save(file: FileUpload): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}
