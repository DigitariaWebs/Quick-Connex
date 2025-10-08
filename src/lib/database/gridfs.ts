import { GridFSBucket, ObjectId, Db } from 'mongodb';
import mongoClient from './mongodb';
import crypto from 'crypto';

// GridFS bucket instance
let gridFSBucket: GridFSBucket | null = null;

// Initialize GridFS bucket
export const getGridFSBucket = async (): Promise<GridFSBucket> => {
  if (!gridFSBucket) {
    const client = await mongoClient;
    const db: Db = client.db();
    gridFSBucket = new GridFSBucket(db, { bucketName: 'documents' });
  }
  return gridFSBucket;
};

// File metadata interface
export interface FileMetadata {
  userId: string;
  documentType: 'cv' | 'opiqPermit' | 'rcr';
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  uploadedAt: Date;
}

// Upload file to GridFS
export const uploadFileToGridFS = async (
  buffer: Buffer,
  filename: string,
  metadata: FileMetadata
): Promise<ObjectId> => {
  try {
    const bucket = await getGridFSBucket();
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const gridFSFilename = `${metadata.documentType}_${metadata.userId}_${timestamp}_${sanitizedFilename}`;
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(gridFSFilename, {
      metadata: {
        ...metadata,
        gridFSFilename,
        uploadedAt: new Date()
      }
    });
    
    // Write buffer to stream
    uploadStream.write(buffer);
    uploadStream.end();
    
    // Wait for upload to complete
    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        console.log(`📄 GridFS: File uploaded successfully - ${gridFSFilename}, ID: ${uploadStream.id}`);
        resolve(uploadStream.id);
      });
      
      uploadStream.on('error', (error) => {
        console.error('❌ GridFS: Upload failed:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ GridFS: Upload error:', error);
    throw error;
  }
};

// Download file from GridFS
export const downloadFileFromGridFS = async (fileId: string): Promise<{
  buffer: Buffer;
  metadata: FileMetadata;
  filename: string;
}> => {
  try {
    const bucket = await getGridFSBucket();
    const objectId = new ObjectId(fileId);
    
    // Get file metadata
    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      throw new Error('File not found');
    }
    
    const fileInfo = files[0];
    
    // Create download stream
    const downloadStream = bucket.openDownloadStream(objectId);
    
    // Collect chunks into buffer
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`📄 GridFS: File downloaded successfully - ${fileInfo.filename}`);
        resolve({
          buffer,
          metadata: fileInfo.metadata as FileMetadata,
          filename: fileInfo.filename
        });
      });
      
      downloadStream.on('error', (error) => {
        console.error('❌ GridFS: Download failed:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ GridFS: Download error:', error);
    throw error;
  }
};

// Delete file from GridFS
export const deleteFileFromGridFS = async (fileId: string): Promise<void> => {
  try {
    const bucket = await getGridFSBucket();
    const objectId = new ObjectId(fileId);
    
    await bucket.delete(objectId);
    console.log(`🗑️ GridFS: File deleted successfully - ID: ${fileId}`);
  } catch (error) {
    console.error('❌ GridFS: Delete error:', error);
    throw error;
  }
};

// Get file metadata from GridFS
export const getFileMetadata = async (fileId: string): Promise<FileMetadata | null> => {
  try {
    const bucket = await getGridFSBucket();
    const objectId = new ObjectId(fileId);
    
    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      return null;
    }
    
    return files[0].metadata as FileMetadata;
  } catch (error) {
    console.error('❌ GridFS: Get metadata error:', error);
    throw error;
  }
};

// Calculate file checksum
export const calculateFileChecksum = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Validate file type and size
export const validateFile = (
  file: File, 
  allowedTypes: string[], 
  maxSizeMB: number
): { isValid: boolean; error?: string } => {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }
  
  // Check file type
  const fileType = file.type;
  if (!allowedTypes.includes(fileType)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  return { isValid: true };
};

// Update file metadata
export const updateFileMetadata = async (fileId: string, updates: Partial<FileMetadata>): Promise<void> => {
  try {
    const bucket = await getGridFSBucket();
    const objectId = new ObjectId(fileId);
    
    // Get current file info
    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      throw new Error('File not found');
    }
    
    const currentFile = files[0];
    const updatedMetadata = { ...currentFile.metadata, ...updates };
    
    // Update the metadata in the files collection
    const db = (await mongoClient).db();
    await db.collection('documents.files').updateOne(
      { _id: objectId },
      { $set: { metadata: updatedMetadata } }
    );
    
    console.log(`✅ GridFS: Metadata updated for file ${fileId}`);
  } catch (error) {
    console.error('❌ GridFS: Update metadata error:', error);
    throw error;
  }
};

// List files for a user
export const listUserFiles = async (userId: string): Promise<Array<{
  fileId: string;
  filename: string;
  documentType: string;
  originalName: string;
  size: number;
  uploadedAt: Date;
}>> => {
  try {
    const bucket = await getGridFSBucket();
    
    const files = await bucket.find({ 
      'metadata.userId': userId 
    }).toArray();
    
    return files.map(file => ({
      fileId: file._id.toString(),
      filename: file.filename,
      documentType: file.metadata?.documentType || 'unknown',
      originalName: file.metadata?.originalName || file.filename,
      size: file.length,
      uploadedAt: file.uploadDate
    }));
  } catch (error) {
    console.error('❌ GridFS: List files error:', error);
    throw error;
  }
};



