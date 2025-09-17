#!/usr/bin/env node

/**
 * Test script to test the full Transfer model with scheduling
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas directly (same as working test)
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    class: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true,
    versionKey: false
});

// Define Transfer schema with full scheduling
const transferSchema = new mongoose.Schema({
    transferId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    patientInfo: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        age: {
            type: Number,
            required: true,
            min: 0,
            max: 120
        }
    },
    fromHospital: {
        type: String,
        required: true,
        trim: true
    },
    fromDepartment: {
        type: String,
        required: true,
        trim: true
    },
    toHospital: {
        type: String,
        required: true,
        trim: true
    },
    toDepartment: {
        type: String,
        required: true,
        trim: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    priority: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    requestedDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    scheduledDate: {
        type: Date
    },
    scheduledEndDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    },
    medicalDocuments: [{
        type: String,
        trim: true
    }],
    scheduling: {
        isRecurring: {
            type: Boolean,
            default: false
        },
        timeSlot: {
            startTime: {
                type: String,
                match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            },
            endTime: {
                type: String,
                match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            },
            duration: {
                type: Number,
                min: 0
            }
        },
        location: {
            pickupLocation: {
                type: String,
                required: true,
                trim: true
            },
            dropoffLocation: {
                type: String,
                required: true,
                trim: true
            },
            transportType: {
                type: String,
                enum: ['ambulance', 'helicopter', 'ground_transport', 'walking'],
                default: 'ambulance'
            }
        },
        resources: {
            requiredEquipment: [{
                type: String,
                trim: true
            }],
            specialInstructions: {
                type: String,
                trim: true
            }
        }
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    statusHistory: [{
        status: {
            type: String,
            required: true,
            enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        changedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        reason: {
            type: String,
            trim: true
        }
    }]
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

async function testFullTransferCreation() {
    try {
        console.log('🧪 Testing full Transfer model creation...');

        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find a manager user
        const manager = await User.findOne({ userType: 'manager' });
        if (!manager) {
            throw new Error('No manager user found');
        }
        console.log(`✅ Found manager: ${manager.email}`);

        // Test transfer data with full scheduling
        const testTransferData = {
            transferId: `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            patientInfo: {
                firstName: 'Alice',
                lastName: 'Johnson',
                age: 67
            },
            fromHospital: 'Toronto General Hospital',
            fromDepartment: 'General',
            toHospital: 'Mount Sinai Hospital',
            toDepartment: 'General',
            requestedBy: manager._id,
            reason: 'Specialized cardiac surgery required',
            priority: 'high',
            status: 'pending',
            requestedDate: new Date(),
            scheduledDate: new Date('2025-09-18T14:30:00'),
            scheduledEndDate: new Date('2025-09-18T15:30:00'),
            notes: 'Test transfer',
            medicalDocuments: [],
            scheduling: {
                isRecurring: false,
                timeSlot: {
                    startTime: '14:30',
                    endTime: '15:30',
                    duration: 60
                },
                location: {
                    pickupLocation: 'Toronto General Hospital',
                    dropoffLocation: 'Mount Sinai Hospital',
                    transportType: 'ambulance'
                },
                resources: {
                    requiredEquipment: [],
                    specialInstructions: ''
                }
            },
            lastModifiedBy: manager._id,
            statusHistory: [{
                status: 'pending',
                changedBy: manager._id,
                changedAt: new Date(),
                reason: 'Transfer created'
            }]
        };

        console.log('📝 Creating transfer with full scheduling data...');

        // Create transfer
        const transfer = new Transfer(testTransferData);
        await transfer.save();

        console.log('✅ Transfer created successfully!');
        console.log(`Transfer ID: ${transfer._id}`);
        console.log(`Transfer ID (custom): ${transfer.transferId}`);

        // Clean up
        await Transfer.findByIdAndDelete(transfer._id);
        console.log('🧹 Test transfer cleaned up');

    } catch (error) {
        console.error('❌ Error testing transfer creation:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });

        // Check if it's a validation error
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the test
testFullTransferCreation();
