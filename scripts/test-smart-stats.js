#!/usr/bin/env node

/**
 * Test script to verify smart stats updates
 * This script creates test users and verifies the smart stats behavior
 * 
 * Usage: node scripts/test-smart-stats.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../../.env.local' });

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Define schemas
const userSchema = new mongoose.Schema({
    userType: {
        type: String,
        required: true,
        enum: ['employee', 'manager', 'admin', 'super_admin']
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: mongoose.Schema.Types.ObjectId, ref: 'CIUSSS' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    documents: [{
        fileId: { type: String, required: true },
        documentType: {
            type: String,
            required: true,
            enum: ['cv', 'opiqPermit', 'rcr']
        },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'pending'
    },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function testSmartStats() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Create test users for smart stats testing
        const testUsers = [
            {
                userType: 'employee',
                firstName: 'Stats',
                lastName: 'Tester1',
                email: 'stats.tester1@test.com',
                phone: '514-111-1111',
                password: await bcrypt.hash('TestPassword123!', 12),
                status: 'pending'
            },
            {
                userType: 'manager',
                firstName: 'Stats',
                lastName: 'Tester2',
                email: 'stats.tester2@test.com',
                phone: '514-222-2222',
                password: await bcrypt.hash('TestPassword123!', 12),
                status: 'pending'
            },
            {
                userType: 'employee',
                firstName: 'Stats',
                lastName: 'Tester3',
                email: 'stats.tester3@test.com',
                phone: '514-333-3333',
                password: await bcrypt.hash('TestPassword123!', 12),
                status: 'pending'
            }
        ];

        // Clear existing test users
        await User.deleteMany({
            email: { $in: testUsers.map(u => u.email) }
        });

        // Create new test users
        const savedUsers = [];
        for (const userData of testUsers) {
            const user = new User(userData);
            const savedUser = await user.save();
            savedUsers.push(savedUser);
        }

        console.log('✅ Test users created:', savedUsers.map(u => ({
            name: `${u.firstName} ${u.lastName}`,
            email: u.email,
            status: u.status
        })));

        console.log('\n🎯 Smart Stats Updates Test Ready!');
        console.log('📋 Test Steps:');
        console.log('1. Go to http://localhost:3000/admin/users');
        console.log('2. Observe the initial stats cards');
        console.log('3. Click on "Pending" filter to see pending users');
        console.log('4. Test the smart stats updates:');
        console.log('   a) Click on "Stats Tester1" user');
        console.log('   b) Click "Approve User" button');
        console.log('   c) Observe the stats cards update immediately:');
        console.log('      ✅ Pending count decreases by 1');
        console.log('      ✅ Approved count increases by 1');
        console.log('      ✅ Total count stays the same');
        console.log('      ✅ Numbers animate smoothly');
        console.log('      ✅ Refresh spinner appears briefly');

        console.log('\n🔍 Expected Smart Stats Behavior:');
        console.log('✅ Instant stats updates (no API call needed)');
        console.log('✅ Smooth number animations');
        console.log('✅ Refresh indicators during updates');
        console.log('✅ Accurate counts maintained');
        console.log('✅ Visual feedback for all changes');

        console.log('\n🧪 Test Scenarios:');
        console.log('1. Approve user → Pending ↓, Approved ↑');
        console.log('2. Reject user → Pending ↓, Rejected ↑');
        console.log('3. Multiple actions → Stats update cumulatively');
        console.log('4. Mixed user types → Role-specific stats update');

        console.log('\n🎨 Visual Features:');
        console.log('✅ Animated number transitions');
        console.log('✅ Refresh spinner indicators');
        console.log('✅ Smooth scale animations');
        console.log('✅ Consistent with transfers page');

    } catch (error) {
        console.error('❌ Error testing smart stats:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
testSmartStats().catch(console.error);
