/**
 * Centralized GridFS Service
 *
 * File storage operations integrated with DatabaseService architecture.
 * Provides clean, consistent API for file upload, download, and management.
 */

import { GridFSBucket, ObjectId, Db } from "mongodb";
import { Readable, Writable } from "stream";
import crypto from "crypto";
import { DatabaseService } from "./DatabaseService";
import {
  GridFSFileMetadata,
  GridFSUploadOptions,
  GridFSDownloadOptions,
  GridFSFileInfo,
} from "./types";
import {
  validateFile,
  calculateFileChecksum,
  generateUniqueFileName,
  getFileExtension,
  getMimeType,
  isSafeFileName,
  FileValidationResult,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZES,
} from "../../utils/file-uploads";
import {
  sanitizeString,
  sanitizeFileName,
} from "../../utils/request-validation";
import {
  DatabaseError,
  ValidationError,
  NotFoundError,
} from "../../utils/error-handling";
import { log } from "@/lib/logging";
import { formatDate, getCurrentTimestamp } from "../../utils/date-time";
import { maskSensitiveData, cleanText } from "../../utils/string-helpers";

// ===== GRIDFS SERVICE =====

export class GridFSService {
  private static bucket: GridFSBucket | null = null;
  private static bucketName = "documents";

  /**
   * Get GridFS bucket instance
   */
  private static async getBucket(): Promise<GridFSBucket> {
    if (!this.bucket) {
      // Ensure connection is established before getting it
      await DatabaseService.connect();

      const connection = DatabaseService.getConnection();
      if (!connection) {
        throw new DatabaseError("No active database connection for GridFS");
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
    options: GridFSUploadOptions = {},
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const bucket = await this.getBucket();

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedFilename = sanitizeFileName(filename);
      const gridFSFilename = this.generateUniqueFilename(
        sanitizedFilename,
        metadata,
        timestamp,
      );

      // Validate file
      const validation = this.validateFileBuffer(
        buffer,
        metadata.mimeType,
        metadata.size,
      );
      if (!validation.isValid) {
        throw new ValidationError(
          validation.errors?.[0] || "File validation failed",
        );
      }

      // Create upload stream
      const uploadStream = bucket.openUploadStream(gridFSFilename, {
        metadata: {
          ...metadata,
          gridFSFilename,
          uploadedAt: new Date(),
          checksum: this.calculateChecksum(buffer),
        },
        chunkSizeBytes: options.chunkSizeBytes || 261120, // 255KB default
        // bucketName is set when creating the bucket, not in options
        aliases: options.aliases || [],
        contentType: options.contentType || metadata.mimeType,
      });

      // Write buffer to stream
      uploadStream.write(buffer);
      uploadStream.end();

      // Wait for upload to complete
      const fileId = await new Promise<string>((resolve, reject) => {
        uploadStream.on("finish", () => {
          console.log(
            `📄 GridFS: File uploaded successfully - ${gridFSFilename}, ID: ${uploadStream.id}`,
          );
          resolve(uploadStream.id.toString());
        });

        uploadStream.on("error", (error) => {
          console.error("❌ GridFS: Upload failed:", error);
          reject(error);
        });
      });

      const executionTime = Date.now() - startTime;
      console.log(`📊 GridFS: Upload completed in ${executionTime}ms`);

      return fileId;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ GridFS: Upload error after ${executionTime}ms:`, error);
      log.error("GridFS upload error", error, {
        operation: "gridfs_upload",
        filename: maskSensitiveData(filename),
        metadata: {
          documentType: metadata.documentType,
          userId: metadata.userId,
          size: metadata.size,
        },
        executionTime,
      });
      throw transformGridFSError(error);
    }
  }

  /**
   * Download file from GridFS
   */
  static async downloadFile(
    fileId: string,
    options: GridFSDownloadOptions = {},
  ): Promise<{
    buffer: Buffer;
    metadata: GridFSFileMetadata;
    filename: string;
  }> {
    const startTime = Date.now();

    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);

      // Get file metadata
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError("File not found");
      }

      const fileInfo = files[0];

      // Create download stream with conditional options
      const downloadOptions: { start?: number; end?: number } = {};
      if (options.start !== undefined) {
        downloadOptions.start = options.start;
      }
      if (options.end !== undefined) {
        downloadOptions.end = options.end;
      }

      const downloadStream = bucket.openDownloadStream(
        objectId,
        Object.keys(downloadOptions).length > 0 ? downloadOptions : undefined,
      );

      // Collect chunks into buffer
      const chunks: Buffer[] = [];

      const result = await new Promise<{
        buffer: Buffer;
        metadata: GridFSFileMetadata;
        filename: string;
      }>((resolve, reject) => {
        downloadStream.on("data", (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on("end", () => {
          const buffer = Buffer.concat(chunks);
          console.log(
            `📄 GridFS: File downloaded successfully - ${fileInfo.filename}`,
          );
          resolve({
            buffer,
            metadata: fileInfo.metadata as GridFSFileMetadata,
            filename: fileInfo.filename,
          });
        });

        downloadStream.on("error", (error) => {
          console.error("❌ GridFS: Download failed:", error);
          reject(error);
        });
      });

      const executionTime = Date.now() - startTime;
      console.log(`📊 GridFS: Download completed in ${executionTime}ms`);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(
        `❌ GridFS: Download error after ${executionTime}ms:`,
        error,
      );
      log.error("GridFS download error", error, {
        operation: "gridfs_download",
        fileId: maskSensitiveData(fileId),
        executionTime,
      });
      throw transformGridFSError(error);
    }
  }

  /**
   * Stream file from GridFS
   */
  static async streamFile(
    fileId: string,
    options: GridFSDownloadOptions = {},
  ): Promise<Readable> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);

      // Verify file exists
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError("File not found");
      }

      return bucket.openDownloadStream(objectId, {
        start: options.start,
        end: options.end,
      });
    } catch (error) {
      log.error("GridFS stream error", error, {
        operation: "gridfs_stream",
        fileId: maskSensitiveData(fileId),
      });
      throw transformGridFSError(error);
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
      console.log(`🗑️ GridFS: File deleted successfully - ID: ${fileId}`);

      const executionTime = Date.now() - startTime;
      console.log(`📊 GridFS: Delete completed in ${executionTime}ms`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ GridFS: Delete error after ${executionTime}ms:`, error);
      log.error("GridFS delete error", error, {
        operation: "gridfs_delete",
        fileId: maskSensitiveData(fileId),
        executionTime,
      });
      throw transformGridFSError(error);
    }
  }

  /**
   * Get file metadata from GridFS
   */
  static async getFileMetadata(
    fileId: string,
  ): Promise<GridFSFileMetadata | null> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);

      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        return null;
      }

      return files[0].metadata as GridFSFileMetadata;
    } catch (error) {
      log.error("GridFS get metadata error", error, {
        operation: "gridfs_get_metadata",
        fileId: maskSensitiveData(fileId),
      });
      throw transformGridFSError(error);
    }
  }

  /**
   * Update file metadata
   */
  static async updateFileMetadata(
    fileId: string,
    updates: Partial<GridFSFileMetadata>,
  ): Promise<void> {
    try {
      const bucket = await this.getBucket();
      const objectId = new ObjectId(fileId);

      // Get current file info
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        throw new NotFoundError("File not found");
      }

      const currentFile = files[0];
      const updatedMetadata = { ...currentFile.metadata, ...updates };

      // Update the metadata in the files collection
      // Ensure connection is established (getBucket already does this, but being explicit)
      await DatabaseService.connect();

      const connection = DatabaseService.getConnection();
      if (!connection) {
        throw new DatabaseError("No active database connection");
      }

      const db = connection.db as unknown as Db;
      await db
        .collection(`${this.bucketName}.files`)
        .updateOne({ _id: objectId }, { $set: { metadata: updatedMetadata } });

      console.log(`✅ GridFS: Metadata updated for file ${fileId}`);
    } catch (error) {
      log.error("GridFS update metadata error", error, {
        operation: "gridfs_update_metadata",
        fileId: maskSensitiveData(fileId),
        updates: maskSensitiveData(JSON.stringify(updates)),
      });
      throw transformGridFSError(error);
    }
  }

  /**
   * List files for a user
   */
  static async listUserFiles(userId: string): Promise<GridFSFileInfo[]> {
    try {
      const bucket = await this.getBucket();

      const files = await bucket
        .find({
          "metadata.userId": userId,
        })
        .toArray();

      return files.map((file) => ({
        _id: file._id.toString(),
        filename: file.filename,
        length: file.length,
        chunkSize: file.chunkSize,
        uploadDate: file.uploadDate,
        contentType: file.contentType,
        aliases: file.aliases,
        metadata: file.metadata as GridFSFileMetadata,
      }));
    } catch (error) {
      log.error("GridFS list files error", error, {
        operation: "gridfs_list_files",
        userId: maskSensitiveData(userId),
      });
      throw transformGridFSError(error);
    }
  }

  /**
   * Search files by metadata
   */
  static async searchFiles(
    query: Partial<GridFSFileMetadata>,
    limit: number = 50,
  ): Promise<GridFSFileInfo[]> {
    try {
      const bucket = await this.getBucket();

      const mongoQuery: any = {};
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          mongoQuery[`metadata.${key}`] = value;
        }
      });

      const files = await bucket
        .find(mongoQuery)
        .limit(limit)
        .sort({ uploadDate: -1 })
        .toArray();

      return files.map((file) => ({
        _id: file._id.toString(),
        filename: file.filename,
        length: file.length,
        chunkSize: file.chunkSize,
        uploadDate: file.uploadDate,
        contentType: file.contentType,
        aliases: file.aliases,
        metadata: file.metadata as GridFSFileMetadata,
      }));
    } catch (error) {
      log.error("GridFS search files error", error, {
        operation: "gridfs_search_files",
        query: maskSensitiveData(JSON.stringify(query)),
      });
      throw transformGridFSError(error);
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
        averageFileSize: 0,
      };

      files.forEach((file) => {
        const documentType = file.metadata?.documentType || "unknown";
        stats.filesByType[documentType] =
          (stats.filesByType[documentType] || 0) + 1;
        stats.sizeByType[documentType] =
          (stats.sizeByType[documentType] || 0) + file.length;
      });

      stats.averageFileSize =
        stats.totalFiles > 0 ? stats.totalSize / stats.totalFiles : 0;

      return stats;
    } catch (error) {
      log.error("GridFS get stats error", error, {
        operation: "gridfs_get_stats",
      });
      throw transformGridFSError(error);
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
      const expiredFiles = await bucket
        .find({
          "metadata.expiresAt": { $lt: now },
        })
        .toArray();

      let deletedCount = 0;

      for (const file of expiredFiles) {
        try {
          await bucket.delete(file._id);
          deletedCount++;
          console.log(`🗑️ GridFS: Deleted expired file ${file.filename}`);
        } catch (error) {
          console.error(
            `❌ GridFS: Failed to delete expired file ${file.filename}:`,
            error,
          );
        }
      }

      console.log(
        `📊 GridFS: Cleanup completed - deleted ${deletedCount} expired files`,
      );
      return { deletedCount };
    } catch (error) {
      log.error("GridFS cleanup expired error", error, {
        operation: "gridfs_cleanup_expired",
      });
      throw transformGridFSError(error);
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate file checksum
   */
  static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Validate file buffer
   */
  static validateFileBuffer(
    buffer: Buffer,
    mimeType: string,
    size: number,
  ): FileValidationResult {
    // Check file size
    const maxSizeBytes =
      MAX_FILE_SIZES[mimeType as keyof typeof MAX_FILE_SIZES] ||
      MAX_FILE_SIZES.default;
    if (size > maxSizeBytes) {
      return {
        isValid: false,
        errors: [
          `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`,
        ],
        warnings: [],
      };
    }

    // Check MIME type
    if (!ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        errors: [
          `File type not allowed. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`,
        ],
        warnings: [],
      };
    }

    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(
    filename: string,
    metadata: GridFSFileMetadata,
    timestamp: number = Date.now(),
  ): string {
    const sanitizedFilename = sanitizeFileName(filename);
    const extension = getFileExtension(sanitizedFilename);
    const baseName = sanitizedFilename.replace(extension, "");

    return `${metadata.documentType}_${metadata.userId}_${timestamp}_${baseName}${extension}`;
  }

  /**
   * Validate file for upload
   */
  static validateFile(
    file: File,
    allowedTypes: string[] = ALLOWED_DOCUMENT_TYPES,
    maxSizeMB: number = 10,
  ): Promise<FileValidationResult> {
    return validateFile(file, { allowedTypes, maxSize: maxSizeMB });
  }

  /**
   * Get file info from buffer
   */
  static getFileInfo(
    buffer: Buffer,
    filename: string,
  ): {
    size: number;
    mimeType: string;
    checksum: string;
    extension: string;
  } {
    return {
      size: buffer.length,
      mimeType: getMimeType(filename),
      checksum: this.calculateChecksum(buffer),
      extension: getFileExtension(filename),
    };
  }

  /**
   * Check if filename is safe
   */
  static isSafeFilename(filename: string): boolean {
    return isSafeFileName(filename);
  }

  /**
   * Generate upload metadata
   */
  static createUploadMetadata(
    userId: string,
    documentType: "cv" | "opiqPermit" | "rcr",
    originalName: string,
    mimeType: string,
    size: number,
    additionalMetadata: Partial<GridFSFileMetadata> = {},
  ): GridFSFileMetadata {
    return {
      userId,
      documentType,
      originalName: sanitizeString(originalName),
      mimeType,
      size,
      checksum: "", // Will be calculated during upload
      uploadedAt: new Date(),
      tags: [],
      description: "",
      isPublic: false,
      ...additionalMetadata,
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Transform GridFS error
   */
  private static transformGridFSError(error: any): Error {
    if (error.name === "FileNotFound") {
      return new NotFoundError("File not found");
    }

    if (error.name === "ValidationError") {
      return new ValidationError(error.message);
    }

    if (error.name === "MongoError" || error.name === "MongoServerError") {
      return new DatabaseError(error.message, {
        code: error.code,
        codeName: error.codeName,
        originalError: error,
      });
    }

    return new DatabaseError(error.message || "GridFS operation failed", {
      originalError: error,
    });
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Transform GridFS error to standardized format
 */
function transformGridFSError(error: any): Error {
  if (error.name === "FileNotFound") {
    return new NotFoundError("File not found");
  }

  if (error.name === "ValidationError") {
    return new ValidationError(error.message);
  }

  if (error.name === "MongoError" || error.name === "MongoServerError") {
    return new DatabaseError(error.message, {
      code: error.code,
      codeName: error.codeName,
      originalError: error,
    });
  }

  return new DatabaseError(error.message || "GridFS operation failed", {
    originalError: error,
  });
}
