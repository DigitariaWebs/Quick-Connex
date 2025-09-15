# GridFS Testing Guide

This guide provides comprehensive testing for the GridFS implementation in the Patients Management system.

## Overview

The GridFS system has been implemented to handle file storage for user documents (OPIQ permits and RCR documents) with the following features:

- File upload with metadata storage
- File download with proper headers
- File deletion and cleanup
- User document listing and filtering
- File validation (type and size)
- Checksum verification
- Metadata updates

## Test Suites

### 1. GridFS Utilities Test (`gridfs-utilities-test.js`)
**Purpose**: Tests the core GridFS utilities and file validation functions.

**What it tests**:
- File checksum calculation
- File validation (type and size)
- Different file types upload (text, PDF, JPEG)
- Different file sizes (empty, 1 byte, 1KB, 1MB, 5MB)
- Metadata operations (retrieval and updates)
- User file listing and filtering

**Run**: `node scripts/gridfs-utilities-test.js`

### 2. Simple GridFS Test (`simple-gridfs-test.js`)
**Purpose**: Basic GridFS operations and signup API testing.

**What it tests**:
- Basic file upload/download/delete operations
- File metadata retrieval
- Content verification
- Signup API with GridFS integration (requires server running)

**Run**: `node scripts/simple-gridfs-test.js`

### 3. GridFS Signup Test (`test-signup-gridfs.js`)
**Purpose**: Complete signup flow testing with GridFS integration.

**What it tests**:
- Employee signup with file uploads
- Manager signup without files
- File download after signup
- User documents API endpoint
- Document metadata verification

**Run**: `node scripts/test-signup-gridfs.js`

### 4. Comprehensive GridFS Test (`comprehensive-gridfs-test.js`)
**Purpose**: Full test suite covering all GridFS operations and edge cases.

**What it tests**:
- Basic CRUD operations
- File type and size validation
- User document management
- Error handling and edge cases
- API endpoints integration
- Performance testing with concurrent operations

**Run**: `node scripts/comprehensive-gridfs-test.js`

### 5. GridFS Stress Test (`gridfs-stress-test.js`)
**Purpose**: Performance and stress testing of the GridFS system.

**What it tests**:
- Concurrent file uploads (10 simultaneous)
- Concurrent file downloads (5 simultaneous)
- Metadata operations under load
- File listing performance
- Large file handling (up to 10MB)
- System cleanup and resource management

**Run**: `node scripts/gridfs-stress-test.js`

## Running Tests

### Run All Tests
```bash
# Run all test suites sequentially
node scripts/run-gridfs-tests.js

# Or make it executable and run directly
chmod +x scripts/run-gridfs-tests.js
./scripts/run-gridfs-tests.js
```

### Run Individual Tests
```bash
# Run a specific test by number
node scripts/run-gridfs-tests.js --single 1

# List available tests
node scripts/run-gridfs-tests.js --list

# Get help
node scripts/run-gridfs-tests.js --help
```

### Run Tests Manually
```bash
# Run individual test files
node scripts/gridfs-utilities-test.js
node scripts/simple-gridfs-test.js
node scripts/test-signup-gridfs.js
node scripts/comprehensive-gridfs-test.js
node scripts/gridfs-stress-test.js
```

## Prerequisites

### Environment Setup
1. **MongoDB Connection**: Ensure MongoDB is accessible
   - Local: `mongodb://localhost:27017/patients_management`
   - Atlas: Set `MONGODB_URI` environment variable

2. **Node.js Dependencies**: Install required packages
   ```bash
   npm install
   ```

3. **Server Running** (for API tests): Start the Next.js development server
   ```bash
   npm run dev
   ```

### Environment Variables
```bash
# MongoDB connection string
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/database"

# Optional: Override default test configuration
export GRIDFS_TEST_BASE_URL="http://localhost:3000"
```

## Test Configuration

### File Types Tested
- `application/pdf` - PDF documents
- `image/jpeg` - JPEG images
- `image/jpg` - JPG images
- `image/png` - PNG images
- `application/msword` - Word documents
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - Word documents (newer format)
- `text/plain` - Plain text files

### File Sizes Tested
- Empty files (0 bytes)
- Small files (1 byte, 1KB)
- Medium files (1MB)
- Large files (5MB, 10MB)

### Performance Benchmarks
- **Upload**: Target < 1000ms for 1MB files
- **Download**: Target < 500ms for 1MB files
- **Metadata Operations**: Target < 100ms
- **Concurrent Operations**: Support 10+ simultaneous uploads

## Expected Results

### Successful Test Run
```
🚀 GridFS Test Suite Runner
============================================================
📊 Total Tests: 5
⏰ Started at: 12/25/2024, 10:30:00 AM
============================================================

🧪 Running: GridFS Utilities Test
✅ GridFS Utilities Test completed successfully

🧪 Running: Simple GridFS Test
✅ Simple GridFS Test completed successfully

🧪 Running: GridFS Signup Test
✅ GridFS Signup Test completed successfully

🧪 Running: Comprehensive GridFS Test
✅ Comprehensive GridFS Test completed successfully

🧪 Running: GridFS Stress Test
✅ GridFS Stress Test completed successfully

============================================================
📊 TEST SUMMARY
============================================================
⏱️ Total Time: 45000ms
✅ Passed: 5
❌ Failed: 0
⚠️ Errors: 0
📊 Total: 5
📈 Success Rate: 100.0%

🎉 All tests passed! GridFS implementation is working correctly.
```

### Performance Metrics
- **Upload Throughput**: > 5 MB/s
- **Download Throughput**: > 10 MB/s
- **Concurrent Operations**: 95%+ success rate
- **Error Rate**: < 1%

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```
   ❌ GridFS test failed: MongoNetworkError: failed to connect to server
   ```
   **Solution**: Check MongoDB URI and network connectivity

2. **File Upload Timeout**
   ```
   ❌ Upload failed: timeout
   ```
   **Solution**: Check network speed and MongoDB performance

3. **API Tests Failing**
   ```
   ❌ Signup API test failed: fetch failed
   ```
   **Solution**: Ensure Next.js server is running on localhost:3000

4. **Permission Errors**
   ```
   ❌ GridFS test failed: EACCES: permission denied
   ```
   **Solution**: Check file permissions and MongoDB user privileges

### Debug Mode
Enable detailed logging by setting environment variables:
```bash
export DEBUG=gridfs:*
export NODE_ENV=development
```

### Test Data Cleanup
Tests automatically clean up after themselves, but you can manually clean up:
```bash
# Connect to MongoDB and clean up test data
mongo patients_management
db.documents.files.deleteMany({"metadata.userId": /test-user/})
db.documents.chunks.deleteMany({"files_id": {$in: [/* file IDs */]}})
```

## Test Coverage

### Core Functions Tested
- ✅ `uploadFileToGridFS()`
- ✅ `downloadFileFromGridFS()`
- ✅ `deleteFileFromGridFS()`
- ✅ `getFileMetadata()`
- ✅ `updateFileMetadata()`
- ✅ `listUserFiles()`
- ✅ `calculateFileChecksum()`
- ✅ `validateFile()`

### API Endpoints Tested
- ✅ `POST /api/auth/signup` (with file uploads)
- ✅ `GET /api/files/[fileId]` (file download)
- ✅ `HEAD /api/files/[fileId]` (file metadata)
- ✅ `GET /api/users/[userId]/documents` (user documents)

### Edge Cases Tested
- ✅ Non-existent file operations
- ✅ Invalid ObjectId formats
- ✅ Empty file uploads
- ✅ Oversized file handling
- ✅ Invalid file types
- ✅ Concurrent operations
- ✅ Network interruptions
- ✅ Metadata corruption

## Continuous Integration

### GitHub Actions Example
```yaml
name: GridFS Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:gridfs
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
```

### Package.json Scripts
```json
{
  "scripts": {
    "test:gridfs": "node scripts/run-gridfs-tests.js",
    "test:gridfs:utilities": "node scripts/gridfs-utilities-test.js",
    "test:gridfs:stress": "node scripts/gridfs-stress-test.js"
  }
}
```

## Monitoring and Alerts

### Key Metrics to Monitor
- Upload success rate
- Download success rate
- Average response times
- Error rates
- Storage usage
- Concurrent operation limits

### Alert Thresholds
- Upload success rate < 95%
- Download success rate < 98%
- Average response time > 2 seconds
- Error rate > 2%
- Storage usage > 80%

## Conclusion

This comprehensive test suite ensures the GridFS implementation is robust, performant, and reliable. Run these tests regularly to catch regressions and performance issues early.

For questions or issues, refer to the test output logs and this documentation.
