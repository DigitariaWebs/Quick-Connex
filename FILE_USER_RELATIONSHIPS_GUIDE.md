# File-User Relationships Guide

This guide explains how to identify and verify relationships between files and users in the GridFS system.

## How Files Are Related to Users

### 1. **Metadata Association** (Primary Method)
Every file uploaded to GridFS includes metadata that contains the user ID:

```javascript
// File metadata structure
{
  userId: "507f1f77bcf86cd799439011",  // MongoDB ObjectId of the user
  documentType: "opiqPermit",          // Type of document
  originalName: "document.pdf",        // Original filename
  mimeType: "application/pdf",         // File MIME type
  size: 1024000,                      // File size in bytes
  checksum: "sha256hash...",          // File integrity checksum
  uploadedAt: new Date()              // Upload timestamp
}
```

### 2. **Filename Pattern** (Secondary Method)
GridFS filenames follow a specific pattern that includes the user ID:

```
{documentType}_{userId}_{timestamp}_{originalName}
```

**Example:**
```
opiqPermit_507f1f77bcf86cd799439011_1640995200000_document.pdf
```

### 3. **User Collection References** (Tertiary Method)
The User collection stores references to document file IDs:

```javascript
// User document structure
{
  _id: "507f1f77bcf86cd799439011",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  documents: [
    {
      fileId: "507f1f77bcf86cd799439012",  // GridFS file ID
      documentType: "opiqPermit",
      originalName: "document.pdf",
      mimeType: "application/pdf",
      size: 1024000,
      checksum: "sha256hash...",
      uploadedAt: "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Methods to Identify File-User Relationships

### Method 1: Query by Metadata
```javascript
// Find all files for a specific user
const userFiles = await bucket.find({ 
  'metadata.userId': '507f1f77bcf86cd799439011' 
}).toArray();

// Find files by document type for a user
const opiqFiles = await bucket.find({ 
  'metadata.userId': '507f1f77bcf86cd799439011',
  'metadata.documentType': 'opiqPermit'
}).toArray();
```

### Method 2: Query by Filename Pattern
```javascript
// Find files by user ID in filename
const userFiles = await bucket.find({ 
  filename: { $regex: `_507f1f77bcf86cd799439011_` } 
}).toArray();
```

### Method 3: Query User Collection
```javascript
// Find user and their document references
const user = await User.findById('507f1f77bcf86cd799439011');
const fileIds = user.documents.map(doc => doc.fileId);

// Get files from GridFS using the file IDs
const files = await bucket.find({ 
  _id: { $in: fileIds.map(id => new ObjectId(id)) } 
}).toArray();
```

### Method 4: Cross-Reference Both Collections
```javascript
// Get user with documents
const user = await User.findById('507f1f77bcf86cd799439011');

// Get files from GridFS by metadata
const gridfsFiles = await bucket.find({ 
  'metadata.userId': user._id.toString() 
}).toArray();

// Compare and verify consistency
const userFileIds = user.documents.map(doc => doc.fileId);
const gridfsFileIds = gridfsFiles.map(file => file._id.toString());

const matchingFiles = userFileIds.filter(id => gridfsFileIds.includes(id));
const orphanedInUser = userFileIds.filter(id => !gridfsFileIds.includes(id));
const orphanedInGridFS = gridfsFileIds.filter(id => !userFileIds.includes(id));
```

## Verification Scripts

### Quick Check Script
```bash
# Check file ownership for all files
node scripts/check-file-ownership.js

# Find files for specific user
node scripts/check-file-ownership.js 507f1f77bcf86cd799439011
```

### Comprehensive Verification Script
```bash
# Full relationship verification
node scripts/verify-file-user-relationships.js

# Clean up orphaned files
node scripts/verify-file-user-relationships.js --cleanup
```

## Common Scenarios

### 1. **Finding Files for a User**
```javascript
// Using the listUserFiles function from gridfs.ts
const userFiles = await listUserFiles('507f1f77bcf86cd799439011');
console.log(`User has ${userFiles.length} files:`);
userFiles.forEach(file => {
  console.log(`- ${file.originalName} (${file.documentType})`);
});
```

### 2. **Verifying File Ownership**
```javascript
// Check if a file belongs to a specific user
const fileId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439011';

const file = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
if (file.length > 0 && file[0].metadata.userId === userId) {
  console.log('File belongs to user');
} else {
  console.log('File does not belong to user');
}
```

### 3. **Finding Orphaned Files**
```javascript
// Files without user association
const orphanedFiles = await bucket.find({
  $or: [
    { metadata: { $exists: false } },
    { 'metadata.userId': { $exists: false } },
    { 'metadata.userId': null }
  ]
}).toArray();
```

### 4. **Data Integrity Check**
```javascript
// Check for inconsistencies between User and GridFS
const users = await User.find({ documents: { $exists: true, $ne: [] } });
for (const user of users) {
  const userFileIds = user.documents.map(doc => doc.fileId);
  const gridfsFiles = await bucket.find({ 
    'metadata.userId': user._id.toString() 
  }).toArray();
  
  const gridfsFileIds = gridfsFiles.map(file => file._id.toString());
  
  // Check for mismatches
  const missingInGridFS = userFileIds.filter(id => !gridfsFileIds.includes(id));
  const missingInUser = gridfsFileIds.filter(id => !userFileIds.includes(id));
  
  if (missingInGridFS.length > 0 || missingInUser.length > 0) {
    console.log(`Data inconsistency found for user ${user._id}`);
  }
}
```

## API Endpoints for File-User Relationships

### 1. **Get User Documents**
```http
GET /api/users/{userId}/documents
```
Returns all documents for a specific user with download URLs.

### 2. **Download File**
```http
GET /api/files/{fileId}
```
Downloads a file (automatically verifies user ownership through metadata).

### 3. **Get File Metadata**
```http
HEAD /api/files/{fileId}
```
Returns file metadata including user information.

## Security Considerations

### 1. **Access Control**
- Files are associated with users through metadata
- API endpoints verify user ownership before allowing access
- Filenames include user IDs for additional verification

### 2. **Data Integrity**
- SHA-256 checksums verify file integrity
- Metadata consistency checks prevent orphaned files
- Regular cleanup scripts remove test files

### 3. **Privacy**
- Files are stored with user-specific metadata
- No cross-user file access without proper authorization
- Filenames are sanitized to prevent path traversal

## Troubleshooting

### Common Issues

1. **Files Not Found for User**
   - Check if `metadata.userId` matches user ID
   - Verify filename pattern includes correct user ID
   - Check User collection document references

2. **Orphaned Files**
   - Files without `metadata.userId`
   - Files referenced in User collection but not in GridFS
   - Files in GridFS but not referenced in User collection

3. **Data Inconsistencies**
   - Mismatched file IDs between User and GridFS
   - Missing metadata in GridFS files
   - Corrupted file references

### Debug Commands

```bash
# Check all file relationships
node scripts/verify-file-user-relationships.js

# Find files for specific user
node scripts/check-file-ownership.js <userId>

# Clean up orphaned files
node scripts/verify-file-user-relationships.js --cleanup

# Test GridFS utilities
node scripts/gridfs-utilities-test.js
```

## Best Practices

1. **Always use metadata.userId** for primary file-user relationships
2. **Verify consistency** between User collection and GridFS
3. **Regular cleanup** of orphaned files
4. **Monitor data integrity** with automated checks
5. **Use proper error handling** for file operations
6. **Implement access controls** based on user ownership

## Summary

File-user relationships in the GridFS system are maintained through:

1. **Primary**: `metadata.userId` in GridFS files
2. **Secondary**: User ID in GridFS filenames
3. **Tertiary**: File ID references in User collection

The system provides multiple verification methods and automated scripts to ensure data integrity and proper file ownership tracking.
