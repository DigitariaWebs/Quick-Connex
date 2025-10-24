/**
 * Utility functions for converting user documents to email attachments
 */

import { GridFSService } from '@/lib/database';
import { CommunicationAttachment } from '@/types/communication';
import { IUser, IDocumentReference } from '@/models/User';

/**
 * Convert user documents to email attachments
 */
export async function getUserDocumentsAsAttachments(
  user: IUser
): Promise<CommunicationAttachment[]> {
  const attachments: CommunicationAttachment[] = [];

  if (!user.documents || user.documents.length === 0) {
    return attachments;
  }

  // Process each document
  for (const doc of user.documents) {
    try {
      // Download file from GridFS
      const fileData = await GridFSService.downloadFile(doc.fileId);
      
      // Create attachment
      const attachment: CommunicationAttachment = {
        filename: `${doc.documentType.toUpperCase()}_${doc.originalName}`,
        content: fileData.buffer,
        contentType: doc.mimeType,
        size: doc.size,
      };

      attachments.push(attachment);
      
      console.log(`✅ Downloaded attachment: ${attachment.filename} (${doc.size} bytes)`);
    } catch (error) {
      console.error(`❌ Failed to download document ${doc.documentType}:`, error);
      // Continue with other documents even if one fails
    }
  }

  return attachments;
}

/**
 * Get document summary for email content
 */
export function getDocumentSummary(user: IUser): string {
  if (!user.documents || user.documents.length === 0) {
    return 'No documents submitted';
  }

  const summary = user.documents.map(doc => {
    const sizeInMB = (doc.size / 1024 / 1024).toFixed(2);
    return `• ${doc.documentType.toUpperCase()}: ${doc.originalName} (${sizeInMB} MB)`;
  }).join('\n');

  return `Submitted Documents:\n${summary}`;
}
