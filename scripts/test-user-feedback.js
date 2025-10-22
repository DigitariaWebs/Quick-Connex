#!/usr/bin/env node

/**
 * Test script to verify user feedback system
 * This script creates a test user and then tests the approval/rejection flow
 * 
 * Usage: node scripts/test-user-feedback.js
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

async function testUserFeedback() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Create a test user for feedback testing
        const testUser = {
            userType: 'employee',
            firstName: 'Feedback',
            lastName: 'Tester',
            email: 'feedback.tester@test.com',
            phone: '514-999-9999',
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

        console.log('\n🎯 Feedback System Test Ready!');
        console.log('📋 Next Steps:');
        console.log('1. Go to http://localhost:3000/admin/users');
        console.log('2. Click on "Feedback Tester" user');
        console.log('3. Test the "Approve User" button:');
        console.log('   - Should show loading spinner in button');
        console.log('   - Should show success popup on bottom-left');
        console.log('   - Should close modal after 1.5 seconds');
        console.log('4. Test the "Reject User" button:');
        console.log('   - Should show loading spinner in button');
        console.log('   - Should show success popup on bottom-left');
        console.log('   - Should close modal after 1.5 seconds');

        console.log('\n🔍 Expected Behavior:');
        console.log('✅ Loading indicators in buttons');
        console.log('✅ Side popup feedback (AnimatedStatusIcon)');
        console.log('✅ Proper error handling');
        console.log('✅ Modal auto-close on success');

    } catch (error) {
        console.error('❌ Error testing user feedback:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
testUserFeedback().catch(console.error);
