# Scripts Documentation

This directory contains helpful scripts for managing the Patients Management System during development and testing.

## 📋 Available Scripts

### 🚀 Quick Start Commands

```bash
# Set up a fresh development environment
npm run reset

# Run health check and setup
npm run test-setup

# Seed database with test data
npm run seed
```

### 👥 User Management Scripts

#### Create Test Users
```bash
# Create default test users (3 managers + 3 employees)
npm run create-users

# Create only managers
npm run create-users -- --manager

# Create only employees  
npm run create-users -- --employee

# Create 10 of each type
npm run create-users -- --count=10
```

#### List Users
```bash
# List all users
npm run list-users

# List only managers
npm run list-users -- --type=manager

# List only employees
npm run list-users -- --type=employee

# List only pending users
npm run list-users -- --status=pending

# List only approved users
npm run list-users -- --status=approved

# Output in JSON format
npm run list-users -- --format=json

# Limit results
npm run list-users -- --limit=5
```

#### Approve/Reject Users
```bash
# Approve user by email
npm run approve-user -- user@example.com --approve

# Approve user by ID
npm run approve-user -- 507f1f77bcf86cd799439011 --approve

# Reject user with reason
npm run approve-user -- user@example.com --reject="Missing documents"

# Approve all pending users
npm run approve-user -- --approve-all

# Reject all pending users
npm run approve-user -- --reject-all="Incomplete applications"
```

### 🚑 Transfer Management Scripts

#### Create Test Transfers
```bash
# Create default test transfers (6 transfers)
npm run create-transfers

# Create 10 transfers
npm run create-transfers -- --count=10

# Create only urgent transfers
npm run create-transfers -- --priority=urgent
```

#### List Transfers
```bash
# List all transfers
npm run list-transfers

# List only pending transfers
npm run list-transfers -- --status=pending

# List only urgent transfers
npm run list-transfers -- --priority=urgent

# Sort by priority
npm run list-transfers -- --sort=priority

# Sort by date (default)
npm run list-transfers -- --sort=date

# Output in JSON format
npm run list-transfers -- --format=json

# Limit results
npm run list-transfers -- --limit=10
```

#### Update Transfer Status
```bash
# Update transfer status
npm run update-transfer -- TRF-ABC123 --status=accepted

# Schedule a transfer
npm run update-transfer -- TRF-ABC123 --schedule="2024-01-15 14:30"

# Complete a transfer with duration
npm run update-transfer -- TRF-ABC123 --complete --duration=90

# Cancel a transfer with reason
npm run update-transfer -- TRF-ABC123 --status=cancelled --reason="Patient condition improved"
```

### 🗄️ Database Management Scripts

#### Database Statistics
```bash
# Show all database statistics
npm run db-stats

# Show only user statistics
npm run db-stats -- --users-only

# Show only transfer statistics
npm run db-stats -- --transfers-only

# Show only health check
npm run db-stats -- --health

# Output in JSON format
npm run db-stats -- --format=json
```

#### Clear Database
```bash
# Clear all data
npm run clear-db

# Clear specific user
npm run clear-db -- 507f1f77bcf86cd799439011
```

#### Seed Database
```bash
# Seed with default data (5 users + 10 transfers)
npm run seed

# Reset database first, then seed
npm run seed -- --reset

# Seed only users
npm run seed -- --users-only

# Seed only transfers
npm run seed -- --transfers-only

# Create 10 of each type
npm run seed -- --count=10
```

### 🔧 Development Scripts

#### Reset Environment
```bash
# Complete environment reset with fresh data
npm run reset

# Reset but keep existing users
npm run reset -- --keep-users

# Reset but keep existing transfers
npm run reset -- --keep-transfers

# Reset without seeding new data
npm run reset -- --no-seed
```

#### Test Setup
```bash
# Full test setup and health check
npm run test-setup

# Quick health check only
npm run test-setup -- --quick

# Create admin user for testing
npm run test-setup -- --create-admin
```

## 🔑 Test Credentials

The scripts create test users with these default credentials:

### Regular Test User
- **Email:** `arselene.tests@gmail.com`
- **Password:** `TestPassword123!`

### Admin User (if created with --create-admin)
- **Email:** `admin@patients-management.com`
- **Password:** `AdminPassword123!`

### Generated Test Users
- **Email:** `manager1@test.com`, `employee1@test.com`, etc.
- **Password:** `TestPassword123!`

## 📊 Script Output Examples

### User List Output
```
👥 USERS LIST
================================================================================
Found 5 user(s):

1. Marie Dubois
   📧 Email: marie.dubois@test.com
   📱 Phone: 514-123-4567
   👤 Type: manager
   📊 Status: approved
   💼 Post: Directrice des soins
   🏥 CIUSSS: 01
   📅 Created: 1/15/2024, 2:30:45 PM
   🔄 Updated: 1/15/2024, 2:30:45 PM
```

### Transfer List Output
```
🚑 TRANSFERS LIST
================================================================================
Found 3 transfer(s):

1. ⏳ TRF-ABC123
   👤 Patient: Marie Tremblay (45 years)
   📋 Dossier: 2024-001
   🏥 From: Hôpital Notre-Dame
   🏥 To: Hôpital Sacré-Cœur
   🟡 Priority: MEDIUM
   📊 Status: pending
   📝 Reason: Specialized cardiac care required
   👤 Requested by: Jean Tremblay (manager)
   📅 Requested: 1/15/2024, 2:30:45 PM
```

### Database Stats Output
```
📊 DATABASE STATISTICS
================================================================================
📅 Generated: 1/15/2024, 2:30:45 PM
🗄️  Database: patients_management

🏥 HEALTH CHECK
----------------------------------------
Status: healthy
Uptime: 24 hours
Version: 7.0.0
Connections: 5/100
Memory: 128 MB resident
Database size: 25 MB
Collections: 4
Documents: 150

👥 USER STATISTICS
----------------------------------------
Total users: 8
Managers: 3
Employees: 5
Approved: 7
Pending: 1
Rejected: 0
```

## 🛠️ Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb
   
   # Start MongoDB
   brew services start mongodb-community
   ```

2. **Permission Denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.js
   ```

3. **Environment Variables Missing**
   ```bash
   # Check .env.local file exists
   ls -la .env.local
   
   # Copy from example if needed
   cp .env.example .env.local
   ```

4. **Database Locked**
   ```bash
   # Clear database and restart
   npm run clear-db
   npm run seed
   ```

### Script Dependencies

All scripts require:
- Node.js 18+
- MongoDB connection
- Environment variables in `.env.local`
- Required npm packages (mongoose, bcryptjs, etc.)

## 📝 Script Development

### Adding New Scripts

1. Create new script in `scripts/` directory
2. Add shebang: `#!/usr/bin/env node`
3. Include proper error handling
4. Add to `package.json` scripts section
5. Update this documentation

### Script Template

```javascript
#!/usr/bin/env node

/**
 * Script description
 * Usage:
 *   node scripts/script-name.js [options]
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

async function main() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Your script logic here

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

main().catch(console.error);
```

## 🎯 Best Practices

1. **Always use transactions** for multi-document operations
2. **Include proper error handling** and user feedback
3. **Use descriptive console output** with emojis for clarity
4. **Validate input parameters** before processing
5. **Clean up resources** (close connections, etc.)
6. **Provide helpful usage information** in error messages
7. **Use consistent naming conventions** for scripts and options
8. **Include timestamps** in output when relevant
9. **Support both individual and batch operations**
10. **Provide JSON output option** for programmatic use

## 📚 Related Documentation

- [Main README](../README.md)
- [Database Schema](../src/models/)
- [API Documentation](../src/app/api/)
- [Environment Setup](../.env.example)
