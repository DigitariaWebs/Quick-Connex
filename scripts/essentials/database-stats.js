#!/usr/bin/env node

/**
 * Script to display database statistics and health information
 * Usage:
 *   node scripts/database-stats.js                    - Show all database statistics
 *   node scripts/database-stats.js --users-only       - Show only user statistics
 *   node scripts/database-stats.js --transfers-only   - Show only transfer statistics
 *   node scripts/database-stats.js --health           - Show only health check
 *   node scripts/database-stats.js --format json      - Output in JSON format
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
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
const usersOnly = args.includes('--users-only');
const transfersOnly = args.includes('--transfers-only');
const healthOnly = args.includes('--health');
const format = args.includes('--format=json') ? 'json' : 'table';

async function getDatabaseStats() {
    let client;
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Connect with native MongoDB client for advanced stats
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();

        const stats = {
            timestamp: new Date().toISOString(),
            database: {
                name: db.databaseName,
                uri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // Hide credentials
            },
            health: {},
            users: {},
            transfers: {},
            files: {},
            collections: {}
        };

        // Health check
        if (!transfersOnly && !usersOnly) {
            console.log('🏥 Performing health check...');
            const adminDb = db.admin();
            const serverStatus = await adminDb.serverStatus();
            const dbStats = await db.stats();

            stats.health = {
                status: 'healthy',
                uptime: serverStatus.uptime,
                version: serverStatus.version,
                connections: serverStatus.connections,
                memory: {
                    resident: serverStatus.mem.resident,
                    virtual: serverStatus.mem.virtual,
                    mapped: serverStatus.mem.mapped
                },
                database: {
                    size: dbStats.dataSize,
                    storageSize: dbStats.storageSize,
                    indexes: dbStats.indexSize,
                    collections: dbStats.collections,
                    objects: dbStats.objects
                }
            };
        }

        // User statistics
        if (!transfersOnly && !healthOnly) {
            console.log('👥 Gathering user statistics...');

            const totalUsers = await User.countDocuments();
            const managers = await User.countDocuments({ userType: 'manager' });
            const employees = await User.countDocuments({ userType: 'employee' });
            const approved = await User.countDocuments({ status: 'approved' });
            const pending = await User.countDocuments({ status: 'pending' });
            const rejected = await User.countDocuments({ status: 'rejected' });

            // Recent users (last 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentUsers = await User.countDocuments({ createdAt: { $gte: weekAgo } });

            // Users with documents
            const usersWithDocs = await User.countDocuments({
                userType: 'employee',
                'documents.0': { $exists: true }
            });

            // Document statistics
            const docStats = await User.aggregate([
                { $match: { userType: 'employee' } },
                { $unwind: { path: '$documents', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$documents.documentType',
                        count: { $sum: 1 },
                        totalSize: { $sum: '$documents.size' }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            stats.users = {
                total: totalUsers,
                byType: {
                    managers,
                    employees
                },
                byStatus: {
                    approved,
                    pending,
                    rejected
                },
                recent: {
                    last7Days: recentUsers
                },
                documents: {
                    usersWithDocuments: usersWithDocs,
                    documentTypes: docStats
                }
            };
        }

        // Transfer statistics
        if (!usersOnly && !healthOnly) {
            console.log('🚑 Gathering transfer statistics...');

            const totalTransfers = await Transfer.countDocuments();
            const pending = await Transfer.countDocuments({ status: 'pending' });
            const accepted = await Transfer.countDocuments({ status: 'accepted' });
            const inProgress = await Transfer.countDocuments({ status: 'in_progress' });
            const completed = await Transfer.countDocuments({ status: 'completed' });
            const cancelled = await Transfer.countDocuments({ status: 'cancelled' });

            const urgent = await Transfer.countDocuments({ priority: 'urgent' });
            const high = await Transfer.countDocuments({ priority: 'high' });
            const medium = await Transfer.countDocuments({ priority: 'medium' });
            const low = await Transfer.countDocuments({ priority: 'low' });

            // Recent transfers (last 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentTransfers = await Transfer.countDocuments({ requestedDate: { $gte: weekAgo } });

            // Average completion time
            const completedTransfers = await Transfer.find({
                status: 'completed',
                actualDuration: { $exists: true, $gt: 0 }
            }).select('actualDuration estimatedDuration');

            const avgActualDuration = completedTransfers.length > 0
                ? completedTransfers.reduce((sum, t) => sum + t.actualDuration, 0) / completedTransfers.length
                : 0;

            const avgEstimatedDuration = completedTransfers.length > 0
                ? completedTransfers.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0) / completedTransfers.length
                : 0;

            // Most active hospitals
            const hospitalStats = await Transfer.aggregate([
                {
                    $group: {
                        _id: { from: '$fromHospital', to: '$toHospital' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            stats.transfers = {
                total: totalTransfers,
                byStatus: {
                    pending,
                    accepted,
                    inProgress,
                    completed,
                    cancelled
                },
                byPriority: {
                    urgent,
                    high,
                    medium,
                    low
                },
                recent: {
                    last7Days: recentTransfers
                },
                performance: {
                    averageActualDuration: Math.round(avgActualDuration),
                    averageEstimatedDuration: Math.round(avgEstimatedDuration),
                    completedWithDuration: completedTransfers.length
                },
                topRoutes: hospitalStats
            };
        }

        // File statistics (GridFS)
        if (!usersOnly && !transfersOnly && !healthOnly) {
            console.log('📁 Gathering file statistics...');

            const filesCollection = db.collection('fs.files');
            const chunksCollection = db.collection('fs.chunks');

            const fileCount = await filesCollection.countDocuments();
            const chunkCount = await chunksCollection.countDocuments();

            const fileStats = await filesCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSize: { $sum: '$length' },
                        avgSize: { $avg: '$length' },
                        minSize: { $min: '$length' },
                        maxSize: { $max: '$length' }
                    }
                }
            ]).toArray();

            const fileTypeStats = await filesCollection.aggregate([
                {
                    $group: {
                        _id: '$metadata.documentType',
                        count: { $sum: 1 },
                        totalSize: { $sum: '$length' }
                    }
                },
                { $sort: { count: -1 } }
            ]).toArray();

            stats.files = {
                totalFiles: fileCount,
                totalChunks: chunkCount,
                size: fileStats[0] || { totalSize: 0, avgSize: 0, minSize: 0, maxSize: 0 },
                byType: fileTypeStats
            };
        }

        // Collection information
        if (!usersOnly && !transfersOnly && !healthOnly) {
            console.log('📊 Gathering collection information...');

            const collections = await db.listCollections().toArray();
            const collectionStats = {};

            for (const collection of collections) {
                const coll = db.collection(collection.name);
                const count = await coll.countDocuments();

                // Get basic collection info (without detailed stats to avoid driver issues)
                collectionStats[collection.name] = {
                    count,
                    size: 0, // Will be calculated from document count
                    avgObjSize: 0,
                    storageSize: 0,
                    totalIndexSize: 0
                };
            }

            stats.collections = collectionStats;
        }

        // Display results
        if (format === 'json') {
            console.log(JSON.stringify(stats, null, 2));
        } else {
            displayStatsTable(stats);
        }

    } catch (error) {
        console.error('❌ Error gathering database statistics:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
        }
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

function displayStatsTable(stats) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DATABASE STATISTICS');
    console.log('='.repeat(80));
    console.log(`📅 Generated: ${new Date(stats.timestamp).toLocaleString()}`);
    console.log(`🗄️  Database: ${stats.database.name}`);

    // Health check
    if (stats.health && Object.keys(stats.health).length > 0) {
        console.log('\n🏥 HEALTH CHECK');
        console.log('-'.repeat(40));
        console.log(`Status: ${stats.health.status}`);
        console.log(`Uptime: ${Math.floor(stats.health.uptime / 3600)} hours`);
        console.log(`Version: ${stats.health.version}`);
        console.log(`Connections: ${stats.health.connections.current}/${stats.health.connections.available}`);
        console.log(`Memory: ${Math.round(stats.health.memory.resident / 1024 / 1024)} MB resident`);
        console.log(`Database size: ${Math.round(stats.health.database.size / 1024 / 1024)} MB`);
        console.log(`Collections: ${stats.health.database.collections}`);
        console.log(`Documents: ${stats.health.database.objects}`);
    }

    // User statistics
    if (stats.users && Object.keys(stats.users).length > 0) {
        console.log('\n👥 USER STATISTICS');
        console.log('-'.repeat(40));
        console.log(`Total users: ${stats.users.total}`);
        console.log(`Managers: ${stats.users.byType.managers}`);
        console.log(`Employees: ${stats.users.byType.employees}`);
        console.log(`Approved: ${stats.users.byStatus.approved}`);
        console.log(`Pending: ${stats.users.byStatus.pending}`);
        console.log(`Rejected: ${stats.users.byStatus.rejected}`);
        console.log(`Recent (7 days): ${stats.users.recent.last7Days}`);
        console.log(`Users with documents: ${stats.users.documents.usersWithDocuments}`);

        if (stats.users.documents.documentTypes.length > 0) {
            console.log('\n📄 Document Types:');
            stats.users.documents.documentTypes.forEach(doc => {
                const sizeMB = Math.round(doc.totalSize / 1024 / 1024);
                console.log(`  ${doc._id || 'Unknown'}: ${doc.count} files (${sizeMB} MB)`);
            });
        }
    }

    // Transfer statistics
    if (stats.transfers && Object.keys(stats.transfers).length > 0) {
        console.log('\n🚑 TRANSFER STATISTICS');
        console.log('-'.repeat(40));
        console.log(`Total transfers: ${stats.transfers.total}`);
        console.log(`Pending: ${stats.transfers.byStatus.pending}`);
        console.log(`Accepted: ${stats.transfers.byStatus.accepted}`);
        console.log(`In Progress: ${stats.transfers.byStatus.inProgress}`);
        console.log(`Completed: ${stats.transfers.byStatus.completed}`);
        console.log(`Cancelled: ${stats.transfers.byStatus.cancelled}`);
        console.log(`Urgent: ${stats.transfers.byPriority.urgent}`);
        console.log(`High: ${stats.transfers.byPriority.high}`);
        console.log(`Medium: ${stats.transfers.byPriority.medium}`);
        console.log(`Low: ${stats.transfers.byPriority.low}`);
        console.log(`Recent (7 days): ${stats.transfers.recent.last7Days}`);
        console.log(`Avg completion time: ${stats.transfers.performance.averageActualDuration} min`);
        console.log(`Avg estimated time: ${stats.transfers.performance.averageEstimatedDuration} min`);

        if (stats.transfers.topRoutes.length > 0) {
            console.log('\n🏥 Top Transfer Routes:');
            stats.transfers.topRoutes.slice(0, 5).forEach((route, index) => {
                console.log(`  ${index + 1}. ${route._id.from} → ${route._id.to}: ${route.count} transfers`);
            });
        }
    }

    // File statistics
    if (stats.files && Object.keys(stats.files).length > 0) {
        console.log('\n📁 FILE STATISTICS');
        console.log('-'.repeat(40));
        console.log(`Total files: ${stats.files.totalFiles}`);
        console.log(`Total chunks: ${stats.files.totalChunks}`);
        console.log(`Total size: ${Math.round(stats.files.size.totalSize / 1024 / 1024)} MB`);
        console.log(`Average size: ${Math.round(stats.files.size.avgSize / 1024)} KB`);

        if (stats.files.byType.length > 0) {
            console.log('\n📄 File Types:');
            stats.files.byType.forEach(fileType => {
                const sizeMB = Math.round(fileType.totalSize / 1024 / 1024);
                console.log(`  ${fileType._id || 'Unknown'}: ${fileType.count} files (${sizeMB} MB)`);
            });
        }
    }

    console.log('\n' + '='.repeat(80));
}

// Run the script
getDatabaseStats().catch(console.error);
