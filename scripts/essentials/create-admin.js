#!/usr/bin/env node

/**
 * Script to create admin users
 * Usage:
 *   node scripts/essentials/create-admin.js                    - Interactive mode
 *   node scripts/essentials/create-admin.js --super            - Create super admin
 *   node scripts/essentials/create-admin.js --email admin@example.com --password pass123 --name "Admin User"
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Parse command line arguments
const args = process.argv.slice(2);
const isSuperAdmin = args.includes('--super');
const emailArg = args.indexOf('--email');
const passwordArg = args.indexOf('--password');
const nameArg = args.indexOf('--name');

const providedEmail = emailArg !== -1 ? args[emailArg + 1] : null;
const providedPassword = passwordArg !== -1 ? args[passwordArg + 1] : null;
const providedName = nameArg !== -1 ? args[nameArg + 1] : null;

// User schema
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager', 'admin', 'super_admin'] },
    role: { type: String, required: true, enum: ['employee', 'manager', 'admin', 'super_admin'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    permissions: [{ type: String }],
    isSuperAdmin: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'approved' },
    lastLogin: { type: Date },
    lastLoginIp: { type: String },
    loginHistory: [{
        timestamp: { type: Date },
        ipAddress: { type: String },
        userAgent: { type: String },
        success: { type: Boolean }
    }],
    failedLoginAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date },
    approvedAt: { type: Date },
    lastPasswordChange: { type: Date, default: Date.now }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// All available permissions
const ALL_PERMISSIONS = [
    // User management
    'view_all_users',
    'edit_users',
    'delete_users',
    'approve_users',
    'suspend_users',

    // Transfer management
    'view_all_transfers',
    'cancel_any_transfer',
    'edit_any_transfer',
    'force_complete_transfer',
    'reassign_transfers',

    // System management
    'view_system_metrics',
    'manage_system_settings',
    'access_audit_logs',
    'manage_notifications',
    'view_error_logs',

    // Data management
    'export_data',
    'delete_data',
    'backup_database',
];

// Super admin gets all permissions plus exclusive ones
const SUPER_ADMIN_PERMISSIONS = [
    ...ALL_PERMISSIONS,
    'manage_admins',
    'access_system_logs',
    'execute_queries',
];

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let email, password, firstName, lastName, phone;

        if (providedEmail && providedPassword && providedName) {
            // Use provided arguments
            email = providedEmail;
            password = providedPassword;
            const nameParts = providedName.split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ') || nameParts[0];
            phone = '000-000-0000'; // Default phone for CLI creation
        } else {
            // Interactive mode
            console.log('\n📝 Admin User Creation');
            console.log('='.repeat(50));
            console.log(`Creating ${isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'} user\n`);

            email = await question('Email: ');
            password = await question('Password (min 6 characters): ');
            firstName = await question('First Name: ');
            lastName = await question('Last Name: ');
            phone = await question('Phone: ');
        }

        // Validate inputs
        if (!email || !password || !firstName || !lastName || !phone) {
            console.error('❌ All fields are required');
            process.exit(1);
        }

        if (password.length < 6) {
            console.error('❌ Password must be at least 6 characters');
            process.exit(1);
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.error(`❌ User with email ${email} already exists`);
            process.exit(1);
        }

        // Hash password
        console.log('\n🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine permissions
        const permissions = isSuperAdmin ? SUPER_ADMIN_PERMISSIONS : ALL_PERMISSIONS;

        // Create admin user
        console.log(`\n👤 Creating ${isSuperAdmin ? 'super admin' : 'admin'} user...`);
        const adminUser = new User({
            userType: isSuperAdmin ? 'super_admin' : 'admin',
            role: isSuperAdmin ? 'super_admin' : 'admin',
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            permissions,
            isSuperAdmin,
            status: 'approved',
            approvedAt: new Date(),
            lastPasswordChange: new Date()
        });

        await adminUser.save();

        console.log('\n✅ Admin user created successfully!');
        console.log('='.repeat(50));
        console.log(`📧 Email: ${email}`);
        console.log(`👤 Name: ${firstName} ${lastName}`);
        console.log(`🔑 Role: ${isSuperAdmin ? 'Super Admin' : 'Admin'}`);
        console.log(`📞 Phone: ${phone}`);
        console.log(`🛡️  Permissions: ${permissions.length} permissions granted`);
        console.log(`✅ Status: Approved`);
        console.log('='.repeat(50));

        if (isSuperAdmin) {
            console.log('\n⚠️  WARNING: This is a SUPER ADMIN account with full system access!');
            console.log('   Use this account responsibly and keep credentials secure.');
        }

        console.log('\n💡 You can now log in with these credentials at /login');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    } finally {
        rl.close();
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
createAdmin().catch(console.error);

















