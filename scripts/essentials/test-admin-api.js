const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas
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
    specialties: [{ type: String, trim: true }],
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
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, {
    timestamps: true,
    versionKey: false
});

const CIUSSS = mongoose.models.CIUSSS || mongoose.model('CIUSSS', CIUSSSSchema);
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', HospitalSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function testAdminAPI() {
    try {
        console.log('🧪 Testing Admin API with ObjectId references...');
        console.log('🔌 Connecting to MongoDB...');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test the same query that the admin users API uses
        console.log('🔍 Testing user query with population...');

        const users = await User.find({})
            .populate('ciusss', 'code name region isActive')
            .populate('hospital', 'name address organization specialties isActive')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        console.log(`✅ Successfully fetched ${users.length} users with population`);

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
            console.log(`   User Type: ${user.userType}`);
            console.log(`   CIUSSS: ${user.ciusss ? `${user.ciusss.name} (${user.ciusss.code})` : 'None'}`);
            console.log(`   Hospital: ${user.hospital ? user.hospital.name : 'None'}`);
        });

        console.log('\n🎉 Admin API test successful - no ObjectId casting errors!');

    } catch (error) {
        console.error('❌ Admin API test failed:', error.message);
        if (error.message.includes('Cast to ObjectId failed')) {
            console.error('❌ ObjectId casting error still exists!');
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

testAdminAPI();
