#!/usr/bin/env node

/**
 * Test script to verify smart real-time updates
 * This script creates a test user and verifies the update flow
 * 
 * Usage: node scripts/test-smart-updates.js
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

async function testSmartUpdates() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Create a test user for smart updates testing
        const testUser = {
            userType: 'employee',
            firstName: 'Smart',
            lastName: 'Updater',
            email: 'smart.updater@test.com',
            phone: '514-888-8888',
            password: await bcrypt.hash('TestPassword123!', 12),
            status: 'pending'
        };

        // Clear existing test user
        await User.deleteOne({ email: testUser.email });

        // Create new test user
        const user = new User(testUser);
        const savedUser = await user.save();

        console.log('✅ Test user created:', {
            id: savedUser._id,
            name: `${savedUser.firstName} ${savedUser.lastName}`,
            email: savedUser.email,
            status: savedUser.status
        });

        console.log('\n🎯 Smart Real-Time Updates Test Ready!');
        console.log('📋 Test Steps:');
        console.log('1. Go to http://localhost:3000/admin/users');
        console.log('2. Click on "Pending" filter to see pending users');
        console.log('3. Click on "Smart Updater" user to open modal');
        console.log('4. Click "Approve User" button');
        console.log('5. Observe the following behavior:');
        console.log('   ✅ Button shows loading spinner');
        console.log('   ✅ Success popup appears (bottom-left)');
        console.log('   ✅ Modal closes after 1.5 seconds');
        console.log('   ✅ User automatically disappears from pending list');
        console.log('   ✅ Stats cards update automatically');
        console.log('   ✅ No page refresh needed!');

        console.log('\n🔍 Expected Smart Behavior:');
        console.log('✅ Real-time list updates (no refresh needed)');
        console.log('✅ Stats cards update automatically');
        console.log('✅ Pending users disappear when approved');
        console.log('✅ Approved users appear in approved filter');
        console.log('✅ Consistent with transfers page behavior');

        console.log('\n🔄 Test the complete flow:');
        console.log('1. Approve user → Should move from pending to approved');
        console.log('2. Reject user → Should move from pending to rejected');
        console.log('3. All updates should be instant and smooth');

    } catch (error) {
        console.error('❌ Error testing smart updates:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
testSmartUpdates().catch(console.error);
