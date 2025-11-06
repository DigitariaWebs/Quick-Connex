/**
 * GridFS Types
 * 
 * GridFS file handling and storage types.
 */

export interface GridFSFileMetadata {
  userId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr' | 'other';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
  tags?: string[];
  description?: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

export interface GridFSUploadOptions {
  metadata?: Partial<GridFSFileMetadata>;
  chunkSizeBytes?: number;
  bucketName?: string;
  aliases?: string[];
  contentType?: string;
}

export interface GridFSDownloadOptions {
  start?: number;
  end?: number;
  bucketName?: string;
}

export interface GridFSFileInfo {
  _id: string;
  filename: string;
  length: number;
  chunkSize: number;
  uploadDate: Date;
  contentType?: string;
  aliases?: string[];
  metadata?: GridFSFileMetadata;
}

export interface GridFSUploadResult {
  fileId: string;
  filename: string;
  size: number;
  contentType: string;
  uploadDate: Date;
  metadata: GridFSFileMetadata;
}

export interface GridFSDeleteResult {
  success: boolean;
  fileId: string;
  error?: string;
}

export interface GridFSListOptions {
  bucketName?: string;
  filter?: any;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

export interface GridFSListResult {
  files: GridFSFileInfo[];
  total: number;
  hasMore: boolean;
}
