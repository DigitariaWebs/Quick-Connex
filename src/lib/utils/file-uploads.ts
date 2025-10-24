import { createHash } from 'crypto';
import { extname, basename } from 'path';

/**
 * File Upload Utilities
 * 
 * File handling, validation, and security utilities for file uploads.
 * Provides comprehensive file validation and sanitization.
 */

// ===== TYPES =====

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileInfo {
  originalName: string;
  sanitizedName: string;
  extension: string;
  mimeType: string;
  size: number;
  checksum: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// ===== CONSTANTS =====

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

/**
 * Allowed document MIME types
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

/**
 * Maximum file sizes (in bytes)
 */
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  audio: 20 * 1024 * 1024, // 20MB
  default: 5 * 1024 * 1024 // 5MB
};

/**
 * Dangerous file extensions
 */
export const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1'
];

/**
 * MIME type mappings
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv'
};

// ===== FILE VALIDATION =====

/**
 * Validate file type against allowed types
 */
export function validateFileType(
  file: File,
  allowedTypes: string[] = ALLOWED_IMAGE_TYPES
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file.type) {
    errors.push('File type could not be determined');
    return { isValid: false, errors, warnings };
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check for dangerous extensions
  const extension = getFileExtension(file.name);
  if (DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
    errors.push(`File extension ${extension} is not allowed for security reasons`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSize: number = MAX_FILE_SIZES.default
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (file.size > maxSize) {
    errors.push(`File size ${formatFileSize(file.size)} exceeds maximum allowed size ${formatFileSize(maxSize)}`);
  }

  // Warning for large files
  if (file.size > maxSize * 0.8) {
    warnings.push('File is close to size limit');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  maxWidth: number = 4000,
  maxHeight: number = 4000
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { isValid: true, errors, warnings };
  }

  try {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width > maxWidth) {
      errors.push(`Image width ${dimensions.width}px exceeds maximum ${maxWidth}px`);
    }
    
    if (dimensions.height > maxHeight) {
      errors.push(`Image height ${dimensions.height}px exceeds maximum ${maxHeight}px`);
    }

    // Warning for large images
    if (dimensions.width > maxWidth * 0.8 || dimensions.height > maxHeight * 0.8) {
      warnings.push('Image dimensions are close to limits');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    errors.push('Could not validate image dimensions');
    return { isValid: false, errors, warnings };
  }
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    maxWidth?: number;
    maxHeight?: number;
    requireImage?: boolean;
  } = {}
): Promise<FileValidationResult> {
  const {
    allowedTypes = ALLOWED_IMAGE_TYPES,
    maxSize = MAX_FILE_SIZES.default,
    maxWidth = 4000,
    maxHeight = 4000,
    requireImage = false
  } = options;

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate file type
  const typeValidation = validateFileType(file, allowedTypes);
  allErrors.push(...typeValidation.errors);
  allWarnings.push(...typeValidation.warnings);

  // Validate file size
  const sizeValidation = validateFileSize(file, maxSize);
  allErrors.push(...sizeValidation.errors);
  allWarnings.push(...sizeValidation.warnings);

  // Validate image dimensions if it's an image
  if (ALLOWED_IMAGE_TYPES.includes(file.type) || requireImage) {
    const dimensionValidation = await validateImageDimensions(file, maxWidth, maxHeight);
    allErrors.push(...dimensionValidation.errors);
    allWarnings.push(...dimensionValidation.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

// ===== FILE PROCESSING =====

/**
 * Sanitize filename
 */
export function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts
  let sanitized = basename(filename);
  
  // Replace dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Remove multiple underscores
  sanitized = sanitized.replace(/_{2,}/g, '_');
  
  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');
  
  // Ensure filename is not empty
  if (!sanitized) {
    sanitized = 'file';
  }
  
  return sanitized;
}

/**
 * Generate unique filename
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const baseName = sanitizeFileName(originalName.replace(extension, ''));
  
  return `${baseName}_${timestamp}_${random}${extension}`;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return extname(filename).toLowerCase();
}

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
  const extension = getFileExtension(filename);
  return MIME_TYPE_MAP[extension] || 'application/octet-stream';
}

/**
 * Calculate file checksum
 */
export function calculateFileChecksum(buffer: Buffer, algorithm: 'md5' | 'sha256' = 'sha256'): string {
  const hash = createHash(algorithm);
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Get file information
 */
export async function getFileInfo(file: File): Promise<FileInfo> {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  return {
    originalName: file.name,
    sanitizedName: sanitizeFileName(file.name),
    extension: getFileExtension(file.name),
    mimeType: file.type || getMimeType(file.name),
    size: file.size,
    checksum: calculateFileChecksum(buffer)
  };
}

// ===== IMAGE PROCESSING =====

/**
 * Get image dimensions
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Could not load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type);
}

/**
 * Check if file is a document
 */
export function isDocumentFile(file: File): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(file.type);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get appropriate max size for file type
 */
export function getMaxSizeForFileType(file: File): number {
  if (isImageFile(file)) return MAX_FILE_SIZES.image;
  if (isDocumentFile(file)) return MAX_FILE_SIZES.document;
  if (file.type.startsWith('video/')) return MAX_FILE_SIZES.video;
  if (file.type.startsWith('audio/')) return MAX_FILE_SIZES.audio;
  
  return MAX_FILE_SIZES.default;
}

/**
 * Check if filename is safe
 */
export function isSafeFileName(filename: string): boolean {
  const sanitized = sanitizeFileName(filename);
  const extension = getFileExtension(filename);
  
  // Check if filename is too short or too long
  if (sanitized.length < 1 || sanitized.length > 255) {
    return false;
  }
  
  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  return true;
}

/**
 * Generate file upload path
 */
export function generateUploadPath(
  filename: string,
  category: string = 'uploads',
  userId?: string
): string {
  const sanitizedFilename = sanitizeFileName(filename);
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  if (userId) {
    return `${category}/${userId}/${timestamp}/${sanitizedFilename}`;
  }
  
  return `${category}/${timestamp}/${sanitizedFilename}`;
}

/**
 * Validate file upload path
 */
export function validateUploadPath(path: string): boolean {
  // Check for path traversal
  if (path.includes('..') || path.includes('~')) {
    return false;
  }
  
  // Check for absolute paths
  if (path.startsWith('/') || path.startsWith('\\')) {
    return false;
  }
  
  // Check for dangerous characters
  if (/[<>:"|?*]/.test(path)) {
    return false;
  }
  
  return true;
}

/**
 * Create file upload metadata
 */
export function createUploadMetadata(
  file: File,
  options: {
    userId?: string;
    category?: string;
    description?: string;
    tags?: string[];
  } = {}
): Record<string, any> {
  return {
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
    ...options
  };
}
