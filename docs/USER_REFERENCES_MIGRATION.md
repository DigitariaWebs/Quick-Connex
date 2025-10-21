# User References Migration Guide

## Overview

This document describes the migration process for converting string-based CIUSSS and Hospital references to proper ObjectId references in the User model. This migration ensures data consistency and enables proper population of related data.

## Problem Description

### Issue
- **Old Data**: Users created with older scripts had `ciusss` and `hospital` fields stored as strings (e.g., "05" for CIUSSS codes)
- **Current Model**: The User model expects these fields to be ObjectId references for proper population
- **Error**: "Cast to ObjectId failed for value '05' (type string) at path '_id' for model 'CIUSSS'"

### Impact
- Admin users page fails to load
- CIUSSS and Hospital data cannot be populated
- Data inconsistency between old and new user records

## Solution Components

### 1. Data Migration Script
**File**: `scripts/essentials/migrate-user-references.js`

**Purpose**: Converts existing string references to ObjectId references

**Features**:
- Finds all users with string-based references
- Maps string values to proper ObjectIds using CIUSSS codes and Hospital names
- Provides detailed migration statistics
- Handles errors gracefully with detailed reporting
- Verifies migration results

**Usage**:
```bash
# Run migration directly
node scripts/essentials/migrate-user-references.js

# Or use the helper script
node scripts/run-migration.js
```

### 2. Schema Validation
**File**: `src/models/User.ts`

**Changes**:
- Added ObjectId validation to `ciusss` and `hospital` fields
- Ensures only valid ObjectIds are accepted
- Provides clear error messages for invalid references

**Validation Rules**:
```typescript
validate: {
  validator: function(v: any) {
    if (!v) return true; // Allow null/undefined for non-managers
    return mongoose.Types.ObjectId.isValid(v);
  },
  message: 'CIUSSS must be a valid ObjectId reference'
}
```

### 3. API Validation
**Files**: 
- `src/app/api/admin/users/route.ts`
- `src/app/api/auth/signup/route.ts`

**Changes**:
- Added ObjectId validation in user creation APIs
- Prevents string references from being saved
- Provides clear error messages for invalid formats
- Ensures all new users use ObjectId references

## Migration Process

### Pre-Migration Checklist
1. **Backup Database**: Create a backup of your MongoDB database
2. **Check CIUSSS Data**: Ensure all CIUSSS records exist in the database
3. **Check Hospital Data**: Ensure all Hospital records exist in the database
4. **Test Environment**: Run migration on a test environment first

### Running the Migration

1. **Stop the Application**: Ensure no users are being created during migration
2. **Run Migration Script**:
   ```bash
   cd /path/to/patients_management
   node scripts/run-migration.js
   ```
3. **Review Results**: Check the migration summary for any errors
4. **Verify Data**: Test the admin users page to ensure it loads correctly

### Post-Migration Verification

1. **Check Migration Results**:
   ```bash
   # Verify no string references remain
   node scripts/essentials/check-user-references.js
   ```

2. **Test Application**:
   - Access admin users page
   - Verify CIUSSS and Hospital data is populated
   - Test user creation to ensure new users use ObjectIds

3. **Monitor Logs**: Check application logs for any remaining issues

## Error Handling

### Common Issues

1. **CIUSSS Code Not Found**:
   - **Cause**: User has CIUSSS string that doesn't match any CIUSSS code
   - **Solution**: Check CIUSSS data and update user manually if needed

2. **Hospital Name Not Found**:
   - **Cause**: User has Hospital string that doesn't match any Hospital name
   - **Solution**: Check Hospital data and update user manually if needed

3. **Invalid ObjectId Format**:
   - **Cause**: API receives non-ObjectId values
   - **Solution**: Ensure frontend sends proper ObjectId values

### Recovery Options

1. **Rollback**: Restore from database backup if migration fails
2. **Manual Fix**: Update specific users manually in the database
3. **Re-run Migration**: Fix data issues and re-run migration script

## Prevention Measures

### 1. Schema Validation
- User model now validates ObjectId format
- Prevents string references from being saved

### 2. API Validation
- All user creation APIs validate ObjectId format
- Clear error messages for invalid references

### 3. Frontend Validation
- Ensure frontend sends ObjectId values, not strings
- Validate references before API calls

## Monitoring

### Key Metrics
- Number of users migrated
- Number of errors encountered
- Remaining string references (should be 0)

### Logs to Monitor
- Migration script output
- Application error logs
- Database query performance

## Troubleshooting

### Migration Script Issues
```bash
# Check script syntax
node -c scripts/essentials/migrate-user-references.js

# Run with debug output
DEBUG=* node scripts/essentials/migrate-user-references.js
```

### Database Issues
```bash
# Check MongoDB connection
mongo --eval "db.runCommand('ping')"

# Check user data
mongo --eval "db.users.find({ciusss: {$type: 'string'}}).count()"
```

### Application Issues
- Check browser console for JavaScript errors
- Check server logs for API errors
- Verify authentication is working

## Support

If you encounter issues during migration:

1. **Check Logs**: Review all error messages and warnings
2. **Verify Data**: Ensure CIUSSS and Hospital data is complete
3. **Test Incrementally**: Run migration on a subset of users first
4. **Contact Support**: Provide detailed error logs and migration output

## Future Considerations

1. **Data Consistency**: Regular audits to ensure no string references are created
2. **Performance**: Monitor query performance with ObjectId references
3. **Backup Strategy**: Regular backups to prevent data loss
4. **Documentation**: Keep this guide updated with any changes
