#!/usr/bin/env node

/**
 * Script to reset the development environment
 * Usage:
 *   node scripts/reset-environment.js                    - Reset database and create fresh test data
 *   node scripts/reset-environment.js --keep-users       - Keep existing users, reset everything else
 *   node scripts/reset-environment.js --keep-transfers   - Keep existing transfers, reset everything else
 *   node scripts/reset-environment.js --no-seed          - Reset but don't seed with test data
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    patientInfo: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        age: { type: Number, required: true, min: 0, max: 120 },
        dossierNumber: { type: String, required: true, trim: true }
    },
    fromHospital: { type: String, required: true, trim: true },
    toHospital: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, required: true, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    requestedDate: { type: Date, required: true, default: Date.now },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    notes: { type: String, trim: true },
    medicalDocuments: [{ type: String, trim: true }],
    scheduling: {
        transferTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    statusHistory: [{
        status: { type: String, required: true, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'] },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        reason: { type: String, trim: true }
    }],
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    estimatedDuration: { type: Number, min: 0 },
    actualDuration: { type: Number, min: 0 }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

// Parse command line arguments
const args = process.argv.slice(2);
const keepUsers = args.includes('--keep-users');
const keepTransfers = args.includes('--keep-transfers');
const noSeed = args.includes('--no-seed');

async function resetEnvironment() {
    let client;
    try {
        console.log('🔄 Starting environment reset...');
        console.log('='.repeat(60));

        // Step 1: Connect to database
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();

        // Step 2: Backup existing data if requested
        if (keepUsers || keepTransfers) {
            console.log('💾 Backing up existing data...');
            const backup = {
                users: keepUsers ? await User.find({}) : [],
                transfers: keepTransfers ? await Transfer.find({}) : [],
                timestamp: new Date().toISOString()
            };

            const backupDir = path.join(process.cwd(), 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const backupFile = path.join(backupDir, `backup-${Date.now()}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
            console.log(`✅ Backup saved to: ${backupFile}`);
        }

        // Step 3: Clear database collections
        console.log('🗑️  Clearing database collections...');

        if (!keepUsers) {
            const userCount = await User.countDocuments();
            if (userCount > 0) {
                await User.deleteMany({});
                console.log(`   ✅ Deleted ${userCount} users`);
            }
        }

        if (!keepTransfers) {
            const transferCount = await Transfer.countDocuments();
            if (transferCount > 0) {
                await Transfer.deleteMany({});
                console.log(`   ✅ Deleted ${transferCount} transfers`);
            }
        }

        // Clear GridFS files
        console.log('🗑️  Clearing GridFS files...');
        const filesCollection = db.collection('fs.files');
        const chunksCollection = db.collection('fs.chunks');

        const filesCount = await filesCollection.countDocuments();
        const chunksCount = await chunksCollection.countDocuments();

        if (filesCount > 0) {
            await filesCollection.deleteMany({});
            console.log(`   ✅ Deleted ${filesCount} files from GridFS`);
        }

        if (chunksCount > 0) {
            await chunksCollection.deleteMany({});
            console.log(`   ✅ Deleted ${chunksCount} chunks from GridFS`);
        }

        // Clear other collections (notifications, etc.)
        const collections = await db.listCollections().toArray();
        const collectionsToClear = collections
            .map(col => col.name)
            .filter(name =>
                !name.startsWith('system.') &&
                name !== 'fs.files' &&
                name !== 'fs.chunks' &&
                name !== 'users' &&
                name !== 'transfers'
            );

        for (const collectionName of collectionsToClear) {
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            if (count > 0) {
                await collection.deleteMany({});
                console.log(`   ✅ Cleared ${count} documents from ${collectionName}`);
            }
        }

        // Step 4: Clear uploads directory
        console.log('🗑️  Clearing uploads directory...');
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            }
            console.log(`   ✅ Cleared ${files.length} files from uploads directory`);
        }

        // Step 5: Clear logs and temporary files
        console.log('🗑️  Clearing temporary files...');
        const tempFiles = [
            'logs',
            'tmp',
            '.next',
            'node_modules/.cache'
        ];

        for (const tempDir of tempFiles) {
            const tempPath = path.join(process.cwd(), tempDir);
            if (fs.existsSync(tempPath)) {
                try {
                    fs.rmSync(tempPath, { recursive: true, force: true });
                    console.log(`   ✅ Cleared ${tempDir} directory`);
                } catch (error) {
                    console.log(`   ⚠️  Could not clear ${tempDir}: ${error.message}`);
                }
            }
        }

        // Step 6: Restore backed up data if requested
        if (keepUsers || keepTransfers) {
            console.log('🔄 Restoring backed up data...');

            if (keepUsers && backup.users.length > 0) {
                await User.insertMany(backup.users);
                console.log(`   ✅ Restored ${backup.users.length} users`);
            }

            if (keepTransfers && backup.transfers.length > 0) {
                await Transfer.insertMany(backup.transfers);
                console.log(`   ✅ Restored ${backup.transfers.length} transfers`);
            }
        }

        // Step 7: Seed with fresh data if requested
        if (!noSeed) {
            console.log('🌱 Seeding database with fresh test data...');
            try {
                // Run the seed script
                execSync('node scripts/seed-database.js --count 3', {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });
                console.log('✅ Database seeded successfully');
            } catch (error) {
                console.log('⚠️  Seeding failed, but environment reset completed');
            }
        }

        // Step 8: Display final status
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ENVIRONMENT RESET COMPLETED');
        console.log('='.repeat(60));

        const finalUserCount = await User.countDocuments();
        const finalTransferCount = await Transfer.countDocuments();
        const finalFileCount = await filesCollection.countDocuments();

        console.log(`📊 Final Database State:`);
        console.log(`   - Users: ${finalUserCount}`);
        console.log(`   - Transfers: ${finalTransferCount}`);
        console.log(`   - Files: ${finalFileCount}`);

        console.log(`\n🔑 Test Credentials:`);
        console.log(`   Email: arselene.tests@gmail.com`);
        console.log(`   Password: TestPassword123!`);

        console.log(`\n🚀 Next Steps:`);
        console.log(`   1. Run 'npm run dev' to start the development server`);
        console.log(`   2. Visit http://localhost:3000 to access the application`);
        console.log(`   3. Use the test credentials to log in`);

    } catch (error) {
        console.error('❌ Error resetting environment:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
resetEnvironment().catch(console.error);
