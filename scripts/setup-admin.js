#!/usr/bin/env node

/**
 * Setup Admin User Script
 * 
 * This script creates an admin user for the transfer approval system.
 * The admin user will receive email and SMS notifications for new transfer requests.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// User schema
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, required: function () { return this.userType === 'manager'; }, trim: true },
    ciusss: { type: String, required: function () { return this.userType === 'manager'; }, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    resetPasswordToken: { type: String, trim: true },
    resetPasswordExpires: { type: Date }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function setupAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Admin user configuration
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@patients-management.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
        const adminPhone = process.env.ADMIN_PHONE || '+213793601892';
        const adminName = process.env.ADMIN_NAME || 'System Administrator';

        console.log('\n👤 Setting up admin user...');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`📱 Phone: ${adminPhone}`);
        console.log(`👤 Name: ${adminName}`);

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('   ⚠️  Admin user already exists');
            console.log(`   📧 Email: ${existingAdmin.email}`);
            console.log(`   📱 Phone: ${existingAdmin.phone}`);
            console.log(`   👤 Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
            console.log(`   📊 Status: ${existingAdmin.status}`);

            // Update admin user if needed
            if (existingAdmin.status !== 'approved' || existingAdmin.phone !== adminPhone) {
                console.log('   🔄 Updating admin user...');
                existingAdmin.status = 'approved';
                existingAdmin.phone = adminPhone;
                existingAdmin.approvedBy = 'system';
                existingAdmin.approvedAt = new Date();
                await existingAdmin.save();
                console.log('   ✅ Admin user updated successfully');
            }
        } else {
            // Create new admin user
            console.log('   🆕 Creating new admin user...');
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            const admin = new User({
                userType: 'manager',
                firstName: adminName.split(' ')[0] || 'System',
                lastName: adminName.split(' ').slice(1).join(' ') || 'Administrator',
                email: adminEmail,
                phone: adminPhone,
                password: hashedPassword,
                post: 'System Administrator',
                ciusss: '01',
                status: 'approved',
                approvedBy: 'system',
                approvedAt: new Date()
            });

            await admin.save();
            console.log('   ✅ Admin user created successfully');
            console.log(`   🔑 Password: ${adminPassword}`);
        }

        // Verify admin setup
        console.log('\n🔍 Verifying admin setup...');
        const admin = await User.findOne({ email: adminEmail });
        if (admin) {
            console.log('   ✅ Admin user verified');
            console.log(`   📧 Email: ${admin.email}`);
            console.log(`   📱 Phone: ${admin.phone}`);
            console.log(`   👤 Name: ${admin.firstName} ${admin.lastName}`);
            console.log(`   📊 Status: ${admin.status}`);
            console.log(`   💼 Post: ${admin.post}`);
            console.log(`   🏥 CIUSSS: ${admin.ciusss}`);
        } else {
            console.log('   ❌ Admin user not found');
        }

        // Test admin service
        console.log('\n🧪 Testing admin service...');
        try {
            // Simple admin service test without importing the module
            const adminUsers = await User.find({
                userType: 'manager',
                status: 'approved',
                $or: [
                    { email: { $regex: /admin@patients-management\.com/i } },
                    { post: { $regex: /administrator|admin/i } },
                    { email: { $regex: /admin@/i } }
                ]
            }).select('firstName lastName email phone userType post ciusss');

            console.log(`   📊 Found ${adminUsers.length} admin user(s)`);

            if (adminUsers.length > 0) {
                const primaryAdmin = adminUsers[0];
                console.log(`   👤 Primary admin: ${primaryAdmin.firstName} ${primaryAdmin.lastName} (${primaryAdmin.email})`);
                console.log(`   📞 Admin contact: ${primaryAdmin.firstName} ${primaryAdmin.lastName} - ${primaryAdmin.email} - ${primaryAdmin.phone}`);
            }
        } catch (error) {
            console.log('   ⚠️  Admin service test failed:', error.message);
        }

        console.log('\n✅ Admin setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Configure email and SMS providers in your environment variables');
        console.log('2. Test the transfer creation flow');
        console.log('3. Check that admin receives notifications');
        console.log('4. Test the approval/rejection workflow');

    } catch (error) {
        console.error('❌ Error setting up admin:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    setupAdmin();
}

module.exports = { setupAdmin };
