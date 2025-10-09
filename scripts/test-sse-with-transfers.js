#!/usr/bin/env node

/**
 * SSE Testing with Real Transfer Operations
 * 
 * This script tests the SSE system by performing real transfer operations
 * and verifying that notifications are sent to connected users.
 * 
 * Usage: node scripts/test-sse-with-transfers.js
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Schemas
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const hospitalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    organization: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    transferCategory: {
        type: String,
        required: true,
        enum: ['patient', 'envelope', 'patient_file', 'medical_equipment'],
        default: 'patient'
    },
    patientInfo: {
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        age: { type: Number, min: 0, max: 120 },
        dossierNumber: { type: String, trim: true }
    },
    fromHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    toHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    fromHospitalName: { type: String, trim: true },
    toHospitalName: { type: String, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    requestedDate: { type: Date, default: Date.now },
    scheduledDate: { type: Date },
    notes: { type: String, trim: true },
    issuer: { type: String, trim: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statusHistory: [{
        status: { type: String, required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true }
    }],
    timeline: [{
        id: { type: String, required: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        timestamp: { type: Date, required: true },
        actor: {
            id: { type: mongoose.Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
            userType: { type: String, required: true }
        },
        metadata: { type: mongoose.Schema.Types.Mixed },
        isSystemEvent: { type: Boolean, default: false },
        isVisible: { type: Boolean, default: true }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Hospital = mongoose.model('Hospital', hospitalSchema);
const Transfer = mongoose.model('Transfer', transferSchema);

class SSETransferTest {
    constructor() {
        this.testResults = [];
        this.testTransfer = null;
        this.testUser = null;
        this.testHospitals = [];
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            debug: '🔍'
        }[level] || 'ℹ️';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async initialize() {
        this.log('🚀 Initializing SSE Transfer Test...');

        try {
            // Connect to database
            await mongoose.connect(MONGODB_URI);
            this.log('✅ Connected to database');

            // Get or create test user
            this.testUser = await User.findOne({ email: 'arselene.tests@gmail.com' });
            if (!this.testUser) {
                this.log('❌ Test user not found. Please create a user with email: arselene.tests@gmail.com', 'error');
                throw new Error('Test user not found');
            }
            this.log(`✅ Found test user: ${this.testUser.firstName} ${this.testUser.lastName}`);

            // Get or create test hospitals
            this.testHospitals = await Hospital.find().limit(2);
            if (this.testHospitals.length < 2) {
                this.log('❌ Need at least 2 hospitals for testing', 'error');
                throw new Error('Insufficient hospitals');
            }
            this.log(`✅ Found ${this.testHospitals.length} hospitals`);

        } catch (error) {
            this.log(`❌ Failed to initialize: ${error.message}`, 'error');
            throw error;
        }
    }

    async createTestTransfer() {
        this.log('📋 Creating test transfer...');

        try {
            // Generate unique transfer ID
            const transferId = `SSE-TEST-${Date.now()}`;

            const transfer = new Transfer({
                transferId,
                transferCategory: 'patient',
                patientInfo: {
                    firstName: 'SSE',
                    lastName: 'TestPatient',
                    age: 30,
                    dossierNumber: `SSE-${Date.now()}`
                },
                fromHospital: this.testHospitals[0]._id,
                toHospital: this.testHospitals[1]._id,
                fromHospitalName: this.testHospitals[0].name,
                toHospitalName: this.testHospitals[1].name,
                requestedBy: this.testUser._id,
                reason: 'SSE System Testing - Transfer Creation',
                priority: 'medium',
                status: 'pending'
            });

            await transfer.save();
            this.testTransfer = transfer;

            this.log(`✅ Created test transfer: ${transfer.transferId}`, 'success');
            return transfer;

        } catch (error) {
            this.log(`❌ Failed to create test transfer: ${error.message}`, 'error');
            throw error;
        }
    }

    async testTransferCreation() {
        this.log('🧪 Testing transfer creation notification...');

        const testResult = {
            operation: 'transfer_creation',
            startTime: Date.now(),
            success: false,
            errors: []
        };

        try {
            const response = await fetch(`${BASE_URL}/api/transfers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    transferCategory: 'patient',
                    patientInfo: {
                        firstName: 'SSE',
                        lastName: 'TestPatient2',
                        age: 25,
                        dossierNumber: `SSE-CREATE-${Date.now()}`
                    },
                    fromHospital: this.testHospitals[0]._id,
                    toHospital: this.testHospitals[1]._id,
                    reason: 'SSE System Testing - API Transfer Creation',
                    priority: 'high'
                })
            });

            if (response.ok) {
                const data = await response.json();
                testResult.success = true;
                testResult.transferId = data.transfer.transferId;
                this.log(`✅ Transfer created via API: ${data.transfer.transferId}`, 'success');
            } else {
                const error = await response.json();
                testResult.errors.push(`API Error: ${error.message || response.statusText}`);
                this.log(`❌ Failed to create transfer via API: ${response.status}`, 'error');
            }

        } catch (error) {
            testResult.errors.push(error.message);
            this.log(`❌ Transfer creation test failed: ${error.message}`, 'error');
        }

        testResult.endTime = Date.now();
        testResult.duration = testResult.endTime - testResult.startTime;
        this.testResults.push(testResult);

        return testResult;
    }

    async testTransferStatusChange() {
        this.log('🧪 Testing transfer status change notification...');

        const testResult = {
            operation: 'transfer_status_change',
            startTime: Date.now(),
            success: false,
            errors: []
        };

        try {
            if (!this.testTransfer) {
                throw new Error('No test transfer available');
            }

            // Change status to accepted
            const response = await fetch(`${BASE_URL}/api/transfers/${this.testTransfer._id}/accept`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    notes: 'SSE System Testing - Status Change'
                })
            });

            if (response.ok) {
                const data = await response.json();
                testResult.success = true;
                this.log(`✅ Transfer status changed to: ${data.transfer.status}`, 'success');
            } else {
                const error = await response.json();
                testResult.errors.push(`API Error: ${error.message || response.statusText}`);
                this.log(`❌ Failed to change transfer status: ${response.status}`, 'error');
            }

        } catch (error) {
            testResult.errors.push(error.message);
            this.log(`❌ Transfer status change test failed: ${error.message}`, 'error');
        }

        testResult.endTime = Date.now();
        testResult.duration = testResult.endTime - testResult.startTime;
        this.testResults.push(testResult);

        return testResult;
    }

    async testTransferCancellation() {
        this.log('🧪 Testing transfer cancellation notification...');

        const testResult = {
            operation: 'transfer_cancellation',
            startTime: Date.now(),
            success: false,
            errors: []
        };

        try {
            if (!this.testTransfer) {
                throw new Error('No test transfer available');
            }

            // Cancel the transfer
            const response = await fetch(`${BASE_URL}/api/transfers/${this.testTransfer._id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    reason: 'SSE System Testing - Transfer Cancellation'
                })
            });

            if (response.ok) {
                const data = await response.json();
                testResult.success = true;
                this.log(`✅ Transfer cancelled: ${data.transfer.status}`, 'success');
            } else {
                const error = await response.json();
                testResult.errors.push(`API Error: ${error.message || response.statusText}`);
                this.log(`❌ Failed to cancel transfer: ${response.status}`, 'error');
            }

        } catch (error) {
            testResult.errors.push(error.message);
            this.log(`❌ Transfer cancellation test failed: ${error.message}`, 'error');
        }

        testResult.endTime = Date.now();
        testResult.duration = testResult.endTime - testResult.startTime;
        this.testResults.push(testResult);

        return testResult;
    }

    async testDirectNotificationAPI() {
        this.log('🧪 Testing direct notification API...');

        const testResult = {
            operation: 'direct_notification',
            startTime: Date.now(),
            success: false,
            errors: []
        };

        try {
            const notificationTypes = ['test', 'transfer_status', 'urgent'];

            for (const type of notificationTypes) {
                const response = await fetch(`${BASE_URL}/api/test-notifications`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        notificationType: type
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    this.log(`✅ ${type} notification sent: ${data.message}`, 'success');
                } else {
                    testResult.errors.push(`Failed to send ${type} notification: ${response.status}`);
                    this.log(`❌ Failed to send ${type} notification: ${response.status}`, 'error');
                }

                // Wait between notifications
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            testResult.success = testResult.errors.length === 0;

        } catch (error) {
            testResult.errors.push(error.message);
            this.log(`❌ Direct notification test failed: ${error.message}`, 'error');
        }

        testResult.endTime = Date.now();
        testResult.duration = testResult.endTime - testResult.startTime;
        this.testResults.push(testResult);

        return testResult;
    }

    generateReport() {
        this.log('\n📊 SSE TRANSFER TEST REPORT');
        this.log('='.repeat(50));

        const successfulTests = this.testResults.filter(t => t.success).length;
        const totalTests = this.testResults.length;

        this.log(`Total Tests: ${totalTests}`);
        this.log(`Successful: ${successfulTests}`);
        this.log(`Failed: ${totalTests - successfulTests}`);
        this.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

        this.log('\n🔍 Detailed Results:');
        for (const result of this.testResults) {
            const status = result.success ? '✅' : '❌';
            this.log(`  ${status} ${result.operation}: ${result.duration}ms`);
            if (result.errors.length > 0) {
                result.errors.forEach(error => {
                    this.log(`    Error: ${error}`, 'error');
                });
            }
        }
    }

    async cleanup() {
        this.log('🧹 Cleaning up test data...');

        try {
            // Clean up test transfer
            if (this.testTransfer) {
                await Transfer.deleteOne({ _id: this.testTransfer._id });
                this.log('✅ Test transfer cleaned up');
            }

            // Clean up any other test transfers
            await Transfer.deleteMany({
                $or: [
                    { transferId: { $regex: /^SSE-TEST-/ } },
                    { transferId: { $regex: /^SSE-CREATE-/ } }
                ]
            });
            this.log('✅ All test transfers cleaned up');

        } catch (error) {
            this.log(`⚠️ Cleanup warning: ${error.message}`, 'warning');
        }

        // Disconnect from database
        await mongoose.disconnect();
        this.log('✅ Database disconnected');
    }

    async run() {
        try {
            await this.initialize();

            this.log('\n🧪 RUNNING SSE TRANSFER TESTS...');

            // Test 1: Direct notification API
            await this.testDirectNotificationAPI();

            // Test 2: Create test transfer
            await this.createTestTransfer();

            // Test 3: Transfer creation via API
            await this.testTransferCreation();

            // Test 4: Transfer status change
            await this.testTransferStatusChange();

            // Test 5: Transfer cancellation
            await this.testTransferCancellation();

            this.generateReport();

        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
}

// Main execution
if (require.main === module) {
    const test = new SSETransferTest();

    console.log(`
🧪 SSE Transfer Test Suite
==========================

This test will:
1. Test direct notification API
2. Create test transfers
3. Test transfer status changes
4. Test transfer cancellations
5. Verify SSE notifications are triggered

Starting tests...
`);

    test.run().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = SSETransferTest;
