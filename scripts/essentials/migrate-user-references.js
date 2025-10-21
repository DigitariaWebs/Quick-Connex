const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas directly to avoid import issues
const CIUSSSSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'ciusss'
});

const HospitalSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    address: { type: String, required: true, trim: true },
    organization: {
        type: { type: String, required: true, enum: ['CIUSSS', 'CISSS', 'CUSM'] },
        name: { type: String, required: true, trim: true },
        region: { type: String, required: true, trim: true }
    },
    coordinates: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 }
    },
    contact: {
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true }
    },
    specialties: [{ type: String, trim: true }],
    capacity: {
        totalBeds: { type: Number, min: 0 },
        icuBeds: { type: Number, min: 0 },
        emergencyBeds: { type: Number, min: 0 }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    versionKey: false
});

const UserSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin', 'super_admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: mongoose.Schema.Types.ObjectId, ref: 'CIUSSS' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

// Create models
const CIUSSS = mongoose.models.CIUSSS || mongoose.model('CIUSSS', CIUSSSSchema);
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', HospitalSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

/**
 * Migration Script: Convert String References to ObjectIds
 * 
 * This script migrates existing users from string-based CIUSSS/Hospital references
 * to proper ObjectId references for better data consistency and population.
 */

async function migrateUserReferences() {
    try {
        console.log('🔄 Starting User References Migration...');
        console.log('🔌 Connecting to MongoDB...');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users that need migration
        console.log('🔍 Finding users with string references...');
        const usersWithStringRefs = await User.find({
            $or: [
                { ciusss: { $type: 'string' } },
                { hospital: { $type: 'string' } }
            ]
        });

        console.log(`📊 Found ${usersWithStringRefs.length} users with string references`);

        if (usersWithStringRefs.length === 0) {
            console.log('✅ No users need migration - all references are already ObjectIds');
            return;
        }

        // Get all CIUSSS and Hospital data for mapping
        console.log('📋 Loading CIUSSS and Hospital data...');
        const [ciusssList, hospitalList] = await Promise.all([
            CIUSSS.find({}, 'code name _id'),
            Hospital.find({}, 'name _id')
        ]);

        // Create lookup maps
        const ciusssByCode = new Map();
        const hospitalByName = new Map();

        ciusssList.forEach(ciusss => {
            ciusssByCode.set(ciusss.code, ciusss._id);
        });

        hospitalList.forEach(hospital => {
            hospitalByName.set(hospital.name, hospital._id);
        });

        console.log(`📋 Loaded ${ciusssList.length} CIUSSS and ${hospitalList.length} Hospitals`);

        // Migration statistics
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errors = [];

        // Process each user
        for (const user of usersWithStringRefs) {
            try {
                console.log(`\n👤 Processing user: ${user.firstName} ${user.lastName} (${user.email})`);

                const updates = {};
                let hasUpdates = false;

                // Handle CIUSSS migration
                if (user.ciusss && typeof user.ciusss === 'string') {
                    console.log(`  🔍 CIUSSS string reference: "${user.ciusss}"`);

                    const ciusssId = ciusssByCode.get(user.ciusss);
                    if (ciusssId) {
                        updates.ciusss = ciusssId;
                        hasUpdates = true;
                        console.log(`  ✅ Found CIUSSS ObjectId: ${ciusssId}`);
                    } else {
                        console.log(`  ⚠️  CIUSSS code "${user.ciusss}" not found in database`);
                        errors.push({
                            user: user.email,
                            field: 'ciusss',
                            value: user.ciusss,
                            error: 'CIUSSS code not found'
                        });
                    }
                }

                // Handle Hospital migration
                if (user.hospital && typeof user.hospital === 'string') {
                    console.log(`  🔍 Hospital string reference: "${user.hospital}"`);

                    const hospitalId = hospitalByName.get(user.hospital);
                    if (hospitalId) {
                        updates.hospital = hospitalId;
                        hasUpdates = true;
                        console.log(`  ✅ Found Hospital ObjectId: ${hospitalId}`);
                    } else {
                        console.log(`  ⚠️  Hospital name "${user.hospital}" not found in database`);
                        errors.push({
                            user: user.email,
                            field: 'hospital',
                            value: user.hospital,
                            error: 'Hospital name not found'
                        });
                    }
                }

                // Update user if we have changes
                if (hasUpdates) {
                    await User.findByIdAndUpdate(user._id, updates);
                    migratedCount++;
                    console.log(`  ✅ Updated user references`);
                } else {
                    skippedCount++;
                    console.log(`  ⏭️  No valid references found to migrate`);
                }

            } catch (error) {
                errorCount++;
                console.error(`  ❌ Error processing user ${user.email}:`, error.message);
                errors.push({
                    user: user.email,
                    error: error.message
                });
            }
        }

        // Print migration summary
        console.log('\n📊 Migration Summary:');
        console.log(`  ✅ Successfully migrated: ${migratedCount} users`);
        console.log(`  ⏭️  Skipped: ${skippedCount} users`);
        console.log(`  ❌ Errors: ${errorCount} users`);

        if (errors.length > 0) {
            console.log('\n⚠️  Migration Errors:');
            errors.forEach((error, index) => {
                console.log(`  ${index + 1}. User: ${error.user}`);
                if (error.field) {
                    console.log(`     Field: ${error.field}, Value: "${error.value}"`);
                }
                console.log(`     Error: ${error.error}`);
            });
        }

        // Verify migration results
        console.log('\n🔍 Verifying migration results...');
        const remainingStringRefs = await User.find({
            $or: [
                { ciusss: { $type: 'string' } },
                { hospital: { $type: 'string' } }
            ]
        });

        if (remainingStringRefs.length === 0) {
            console.log('✅ Migration completed successfully - no string references remaining');
        } else {
            console.log(`⚠️  ${remainingStringRefs.length} users still have string references`);
            remainingStringRefs.forEach(user => {
                console.log(`  - ${user.email}: ciusss=${typeof user.ciusss}, hospital=${typeof user.hospital}`);
            });
        }

        console.log('\n🎉 User References Migration completed!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
migrateUserReferences();
