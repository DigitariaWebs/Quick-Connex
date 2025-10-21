const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas
const UserSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin', 'super_admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: mongoose.Schema.Types.Mixed }, // Allow any type for diagnosis
    hospital: { type: mongoose.Schema.Types.Mixed }, // Allow any type for diagnosis
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function diagnoseUserReferences() {
    try {
        console.log('🔍 Diagnosing User References...');
        console.log('🔌 Connecting to MongoDB...');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users
        console.log('📊 Fetching all users...');
        const allUsers = await User.find({}).lean();
        console.log(`📊 Found ${allUsers.length} total users`);

        // Analyze each user
        console.log('\n📋 User Analysis:');
        allUsers.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
            console.log(`   User Type: ${user.userType}`);
            console.log(`   CIUSSS: ${typeof user.ciusss} - ${JSON.stringify(user.ciusss)}`);
            console.log(`   Hospital: ${typeof user.hospital} - ${JSON.stringify(user.hospital)}`);

            // Check for string references
            if (typeof user.ciusss === 'string' || typeof user.hospital === 'string') {
                console.log(`   ⚠️  HAS STRING REFERENCES`);
            }
        });

        // Count by type
        const stringCiusss = allUsers.filter(u => typeof u.ciusss === 'string').length;
        const stringHospital = allUsers.filter(u => typeof u.hospital === 'string').length;
        const objectIdCiusss = allUsers.filter(u => u.ciusss && typeof u.ciusss === 'object' && u.ciusss.toString().length === 24).length;
        const objectIdHospital = allUsers.filter(u => u.hospital && typeof u.hospital === 'object' && u.hospital.toString().length === 24).length;
        const undefinedCiusss = allUsers.filter(u => u.ciusss === undefined || u.ciusss === null).length;
        const undefinedHospital = allUsers.filter(u => u.hospital === undefined || u.hospital === null).length;

        console.log('\n📊 Reference Type Summary:');
        console.log(`   CIUSSS - String: ${stringCiusss}, ObjectId: ${objectIdCiusss}, Undefined: ${undefinedCiusss}`);
        console.log(`   Hospital - String: ${stringHospital}, ObjectId: ${objectIdHospital}, Undefined: ${undefinedHospital}`);

        // Find users that need migration
        const usersNeedingMigration = allUsers.filter(u =>
            (typeof u.ciusss === 'string' && u.ciusss) ||
            (typeof u.hospital === 'string' && u.hospital)
        );

        console.log(`\n🔧 Users needing migration: ${usersNeedingMigration.length}`);
        if (usersNeedingMigration.length > 0) {
            usersNeedingMigration.forEach(user => {
                console.log(`   - ${user.email}: ciusss="${user.ciusss}", hospital="${user.hospital}"`);
            });
        }

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

diagnoseUserReferences();
