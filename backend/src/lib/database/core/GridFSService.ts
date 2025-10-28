/**
 * Centralized GridFS Service
 * 
 * File storage operations integrated with DatabaseService architecture.
 * Provides clean, consistent API for file upload, download, and management.
 */

import { GridFSBucket, ObjectId, Db } from 'mongodb';
import { Readable } from 'stream';
import crypto from 'crypto';
import { DatabaseService } from './DatabaseService';
import { log } from '../../logging';
import { 
  GridFSFileMetadata, 
  GridFSUploadOptions, 
  GridFSDownloadOptions, 
  GridFSFileInfo,
  GridFSListOptions,
  GridFSListResult
} from './types';
import { 
  DatabaseError, 
  ValidationError, 
  NotFoundError,
  GridFSError,
  DatabaseErrorCode
} from '../../../types/database';
import { GRIDFS_CONFIG } from './constants';

/**
 * GridFS Service Class
 */
export class GridFSService {
  private static bucket: GridFSBucket | null = null;
  private static bucketName = GRIDFS_CONFIG.BUCKET_NAME;

  /**
   * Get GridFS bucket instance
   */
  private static async getBucket(): Promise<GridFSBucket> {
    if (!this.bucket) {
      const connection = DatabaseService.getConnection();
      if (!connection) {
        throw new GridFSError('No active database connection for GridFS', 'getBucket');
      }
      
      const db = connection.db as unknown as Db;
      this.bucket = new GridFSBucket(db, { bucketName: this.bucketName });
    }
    
    return this.bucket;
  }

  /**
   * Upload file to GridFS
   */
  static async uploadFile(
    buffer: Buffer,
    filename: string,
    metadata: GridFSFileMetadata,
    options: GridFSUploadOptions = {}
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      const bucket = await this.getBucket();
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(filename);
      const gridFSFilename = this.generateUniqueFilename(sanitizedFilename, metadata, timestamp);
      
      // Validate file
      const validation = this.validateFileBuffer(buffer, metadata.mimeType, metadata.size);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors?.[0] || 'File validation failed');
      }
      
      // Create upload stream
      const uploadStream = bucket.openUploadStream(gridFSFilename, {
        metadata: {
          ...metadata,
          gridFSFilename,
          uploadedAt: new Date(),
          checksum: this.calculateChecksum(buffer)
        },
        chunkSizeBytes: options.chunkSizeBytes || GRIDFS_CONFIG.CHUNK_SIZE,
        aliases: options.aliases || [],
        contentType: options.contentType || metadata.mimeType
      });
      
      // Write buffer to stream
      uploadStream.write(buffer);
      uploadStream.end();
      
      // Wait for upload to complete
      const fileId = await new Promise<string>((resolve, reject) => {
        uploadStream.on('finish', () => {
          log.database(`File uploaded successfully - ${gridFSFilename}, ID: ${uploadStream.id}`);
          resolve(uploadStream.id.toString());
        });
        
        uploadStream.on('error', (error) => {
          log.error('Upload failed', error);
          reject(error);
        });
      });
      
      const executionTime = Date.now() - startTime;
      log.database(`Upload completed in ${executionTime}ms`, { duration: executionTime });
      
      return fileId;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error(`Upload error after ${executionTime}ms`, error, { duration: executionTime });
      throw this.transformGridFSError(error, 'uploadFile');
    }
  }

  /**
   * Download file from GridFS
   */
  static async downloadFile(
    fileId: string, 
    options: GridFSDownloadOptions = {}
  ): Promise<{ buffer: Buffer; metadata: GridFSFileMetadata; filename: string }> {
    const startTime = Date.now();
    
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      
      // Get file metadata
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError('File not found');
      }
      
      const fileInfo = files[0];
      
      // Create download stream
      const downloadStream = bucket.openDownloadStream(objectId, {
        ...(options.start !== undefined && { start: options.start }),
        ...(options.end !== undefined && { end: options.end })
      });
      
      // Collect chunks into buffer
      const chunks: Buffer[] = [];
      
      const result = await new Promise<{ buffer: Buffer; metadata: GridFSFileMetadata; filename: string }>((resolve, reject) => {
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          log.database(`File downloaded successfully - ${fileInfo?.filename || 'unknown'}`);
          resolve({
            buffer,
            metadata: fileInfo?.metadata as GridFSFileMetadata || {},
            filename: fileInfo?.filename || 'unknown'
          });
        });
        
        downloadStream.on('error', (error) => {
          log.error('Download failed', error);
          reject(error);
        });
      });
      
      const executionTime = Date.now() - startTime;
      log.database(`Download completed in ${executionTime}ms`, { duration: executionTime });
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error(`Download error after ${executionTime}ms`, error, { duration: executionTime });
      throw this.transformGridFSError(error, 'downloadFile');
    }
  }

  /**
   * Stream file from GridFS
   */
  static async streamFile(
    fileId: string, 
    options: GridFSDownloadOptions = {}
  ): Promise<Readable> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      
      // Verify file exists
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError('File not found');
      }
      
      return bucket.openDownloadStream(objectId, {
        ...(options.start !== undefined && { start: options.start }),
        ...(options.end !== undefined && { end: options.end })
      });
    } catch (error) {
      throw this.transformGridFSError(error, 'streamFile');
    }
  }

  /**
   * Delete file from GridFS
   */
  static async deleteFile(fileId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      
      await bucket.delete(objectId);
      log.database(`File deleted successfully - ID: ${fileId}`);
      
      const executionTime = Date.now() - startTime;
      log.database(`Delete completed in ${executionTime}ms`, { duration: executionTime });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error(`Delete error after ${executionTime}ms`, error, { duration: executionTime });
      throw this.transformGridFSError(error, 'deleteFile');
    }
  }

  /**
   * Get file metadata from GridFS
   */
  static async getFileMetadata(fileId: string): Promise<GridFSFileMetadata | null> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        return null;
      }
      
      const file = files[0];
      if (!file) {
        return null;
      }
      
      return file.metadata as GridFSFileMetadata;
    } catch (error) {
      throw this.transformGridFSError(error, 'getFileMetadata');
    }
  }

  /**
   * Update file metadata
   */
  static async updateFileMetadata(
    fileId: string, 
    updates: Partial<GridFSFileMetadata>
  ): Promise<void> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      
      // Get current file info
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError('File not found');
      }
      
      const currentFile = files[0];
      if (!currentFile) {
        throw new NotFoundError('File not found');
      }
      const updatedMetadata = { ...currentFile.metadata, ...updates };
      
      // Update the metadata in the files collection
      const connection = DatabaseService.getConnection();
      if (!connection) {
        throw new DatabaseError(DatabaseErrorCode.CONNECTION_ERROR, 'No active database connection');
      }
      
      const db = connection.db as unknown as Db;
      await db.collection(`${this.bucketName}.files`).updateOne(
        { _id: objectId },
        { $set: { metadata: updatedMetadata } }
      );
      
      log.database(`Metadata updated for file ${fileId}`);
    } catch (error) {
      throw this.transformGridFSError(error, 'updateFileMetadata');
    }
  }

  /**
   * List files for a user
   */
  static async listUserFiles(userId: string): Promise<GridFSFileInfo[]> {
    try {
      const bucket = await this.getBucket();
      
      const files = await bucket.find({ 
        'metadata.userId': userId 
      }).toArray();
      
      return files.map(file => ({
        _id: file._id.toString(),
        filename: file.filename,
        length: file.length,
        chunkSize: file.chunkSize,
        uploadDate: file.uploadDate,
        ...(file.contentType && { contentType: file.contentType }),
        ...(file.aliases && { aliases: file.aliases }),
        metadata: file.metadata as GridFSFileMetadata
      }));
    } catch (error) {
      throw this.transformGridFSError(error, 'listUserFiles');
    }
  }

  /**
   * Search files by metadata
   */
  static async searchFiles(
    query: Partial<GridFSFileMetadata>,
    limit: number = 50
  ): Promise<GridFSFileInfo[]> {
    try {
      const bucket = await this.getBucket();
      
      const mongoQuery: any = {};
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          mongoQuery[`metadata.${key}`] = value;
        }
      });
      
      const files = await bucket.find(mongoQuery)
        .limit(limit)
        .sort({ uploadDate: -1 })
        .toArray();
      
      return files.map(file => ({
        _id: file._id.toString(),
        filename: file.filename,
        length: file.length,
        chunkSize: file.chunkSize,
        uploadDate: file.uploadDate,
        ...(file.contentType && { contentType: file.contentType }),
        ...(file.aliases && { aliases: file.aliases }),
        metadata: file.metadata as GridFSFileMetadata
      }));
    } catch (error) {
      throw this.transformGridFSError(error, 'searchFiles');
    }
  }

  /**
   * List files with options
   */
  static async listFiles(options: GridFSListOptions = {}): Promise<GridFSListResult> {
    try {
      const bucket = await this.getBucket();
      
      const query = options.filter || {};
      const limit = options.limit || 50;
      const skip = options.skip || 0;
      const sort = options.sort || { uploadDate: -1 };
      
      const [files, total] = await Promise.all([
        bucket.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        bucket.find(query).count()
      ]);
      
      return {
        files: files.map(file => ({
          _id: file._id.toString(),
          filename: file.filename,
          length: file.length,
          chunkSize: file.chunkSize,
          uploadDate: file.uploadDate,
          ...(file.contentType && { contentType: file.contentType }),
          ...(file.aliases && { aliases: file.aliases }),
          metadata: file.metadata as GridFSFileMetadata
        })),
        total,
        hasMore: skip + limit < total
      };
    } catch (error) {
      throw this.transformGridFSError(error, 'listFiles');
    }
  }

  /**
   * Get file statistics
   */
  static async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    sizeByType: Record<string, number>;
    averageFileSize: number;
  }> {
    try {
      const bucket = await this.getBucket();
      
      const files = await bucket.find({}).toArray();
      
      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.length, 0),
        filesByType: {} as Record<string, number>,
        sizeByType: {} as Record<string, number>,
        averageFileSize: 0
      };
      
      files.forEach(file => {
        const documentType = file.metadata?.['documentType'] || 'unknown';
        stats.filesByType[documentType] = (stats.filesByType[documentType] || 0) + 1;
        stats.sizeByType[documentType] = (stats.sizeByType[documentType] || 0) + file.length;
      });
      
      stats.averageFileSize = stats.totalFiles > 0 ? stats.totalSize / stats.totalFiles : 0;
      
      return stats;
    } catch (error) {
      throw this.transformGridFSError(error, 'getFileStats');
    }
  }

  /**
   * Clean up expired files
   */
  static async cleanupExpiredFiles(): Promise<{ deletedCount: number }> {
    try {
      const bucket = await this.getBucket();
      const now = new Date();
      
      // Find files with expiration dates that have passed
      const expiredFiles = await bucket.find({
        'metadata.expiresAt': { $lt: now }
      }).toArray();
      
      let deletedCount = 0;
      
      for (const file of expiredFiles) {
        try {
          await bucket.delete(file._id);
          deletedCount++;
          log.database(`Deleted expired file ${file.filename}`);
        } catch (error) {
          log.error(`Failed to delete expired file ${file.filename}`, error);
        }
      }
      
      log.database(`Cleanup completed - deleted ${deletedCount} expired files`);
      return { deletedCount };
    } catch (error) {
      throw this.transformGridFSError(error, 'cleanupExpiredFiles');
    }
  }

  /**
   * Verify file integrity
   */
  static async verifyFileIntegrity(fileId: string): Promise<{
    isValid: boolean;
    expectedChecksum?: string;
    actualChecksum?: string;
  }> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);
      
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError('File not found');
      }
      
      const fileInfo = files[0];
      const expectedChecksum = fileInfo?.metadata?.['checksum'];
      
      if (!expectedChecksum) {
        return { isValid: false };
      }
      
      // Download file and calculate checksum
      const { buffer } = await this.downloadFile(fileId);
      const actualChecksum = this.calculateChecksum(buffer);
      
      return {
        isValid: actualChecksum === expectedChecksum,
        expectedChecksum,
        actualChecksum
      };
    } catch (error) {
      throw this.transformGridFSError(error, 'verifyFileIntegrity');
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate file checksum
   */
  static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Validate file buffer
   */
  static validateFileBuffer(
    buffer: Buffer, 
    mimeType: string, 
    size: number
  ): { isValid: boolean; errors?: string[]; warnings?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check file size
    const maxSizeBytes = GRIDFS_CONFIG.MAX_FILE_SIZE;
    if (size > maxSizeBytes) {
      errors.push(`File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
    }
    
    // Check MIME type
    if (!GRIDFS_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      errors.push(`File type not allowed. Allowed types: ${GRIDFS_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`);
    }
    
    // Check buffer size matches reported size
    if (buffer.length !== size) {
      warnings.push('Buffer size does not match reported file size');
    }
    
    return { 
      isValid: errors.length === 0, 
      ...(errors.length > 0 && { errors }),
      ...(warnings.length > 0 && { warnings })
    };
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(
    filename: string, 
    metadata: GridFSFileMetadata, 
    timestamp: number = Date.now()
  ): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const extension = this.getFileExtension(sanitizedFilename);
    const baseName = sanitizedFilename.replace(extension, '');
    
    return `${metadata['documentType']}_${metadata.userId}_${timestamp}_${baseName}${extension}`;
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Get MIME type from filename
   */
  static getMimeType(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.zip': 'application/zip'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 255);
  }

  /**
   * Check if filename is safe
   */
  static isSafeFilename(filename: string): boolean {
    const unsafeChars = /[<>:"/\\|?*\x00-\x1f]/;
    return !unsafeChars.test(filename) && filename.length > 0 && filename.length <= 255;
  }

  /**
   * Generate upload metadata
   */
  static createUploadMetadata(
    userId: string,
    documentType: 'cv' | 'opiqPermit' | 'rcr' | 'other',
    originalName: string,
    mimeType: string,
    size: number,
    additionalMetadata: Partial<GridFSFileMetadata> = {}
  ): GridFSFileMetadata {
    return {
      userId,
      documentType,
      originalName: this.sanitizeFilename(originalName),
      mimeType,
      size,
      checksum: '', // Will be calculated during upload
      uploadedAt: new Date(),
      tags: [],
      description: '',
      isPublic: false,
      ...additionalMetadata
    };
  }

  /**
   * Get file info from buffer
   */
  static getFileInfo(buffer: Buffer, filename: string): {
    size: number;
    mimeType: string;
    checksum: string;
    extension: string;
  } {
    return {
      size: buffer.length,
      mimeType: this.getMimeType(filename),
      checksum: this.calculateChecksum(buffer),
      extension: this.getFileExtension(filename)
    };
  }

  /**
   * Transform GridFS error
   */
  private static transformGridFSError(error: any, operation: string): Error {
    if (error.name === 'FileNotFound') {
      return new NotFoundError('File not found');
    }
    
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message);
    }
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return new DatabaseError(
        'DATABASE_ERROR' as any,
        error.message,
        500,
        {
          code: error.code,
          codeName: error.codeName,
          originalError: error
        },
        operation
      );
    }
    
    return new GridFSError(
      error.message || 'GridFS operation failed',
      operation,
      { originalError: error }
    );
  }
}
