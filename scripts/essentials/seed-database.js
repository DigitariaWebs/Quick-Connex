#!/usr/bin/env node

/**
 * Script to seed the database with comprehensive test data
 * Usage:
 *   node scripts/seed-database.js                    - Seed with default data
 *   node scripts/seed-database.js --reset            - Clear database first, then seed
 *   node scripts/seed-database.js --users-only       - Seed only users
 *   node scripts/seed-database.js --transfers-only   - Seed only transfers
 *   node scripts/seed-database.js --count 10         - Create 10 of each type
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Define schemas
const userSchema = new mongoose.Schema({
    userType: { type: String, required: true, enum: ['employee', 'manager'] },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: String, trim: true },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date, default: Date.now },
    rejectionReason: { type: String, trim: true }
}, {
    timestamps: true,
    versionKey: false
});

const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true, trim: true },
    patientInfo: {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        age: { type: Number, required: true, min: 0, max: 120 },
        dossierNumber: { type: String, required: true, trim: true }
    },
    fromHospital: { type: String, required: true, trim: true },
    toHospital: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, required: true, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
    requestedDate: { type: Date, required: true, default: Date.now },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    notes: { type: String, trim: true },
    medicalDocuments: [{ type: String, trim: true }],
    scheduling: {
        transferTime: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    statusHistory: [{
        status: { type: String, required: true, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'] },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        reason: { type: String, trim: true }
    }],
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    estimatedDuration: { type: Number, min: 0 },
    actualDuration: { type: Number, min: 0 }
}, {
    timestamps: true,
    versionKey: false
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);

// Comprehensive seed data
const managerData = [
    { firstName: 'Marie', lastName: 'Dubois', email: 'marie.dubois@ciuss.com', phone: '514-123-4567', post: 'Directrice des soins', ciusss: '01' },
    { firstName: 'Jean', lastName: 'Tremblay', email: 'jean.tremblay@ciuss.com', phone: '514-234-5678', post: 'Chef de service', ciusss: '02' },
    { firstName: 'Sophie', lastName: 'Gagnon', email: 'sophie.gagnon@ciuss.com', phone: '514-345-6789', post: 'Superviseure clinique', ciusss: '03' },
    { firstName: 'Pierre', lastName: 'Lavoie', email: 'pierre.lavoie@ciuss.com', phone: '514-456-7890', post: 'Directeur médical', ciusss: '04' },
    { firstName: 'Isabelle', lastName: 'Martin', email: 'isabelle.martin@ciuss.com', phone: '514-567-8901', post: 'Coordinatrice des transferts', ciusss: '05' }
];

const employeeData = [
    { firstName: 'Pierre', lastName: 'Martin', email: 'pierre.martin@employee.com', phone: '514-678-9012' },
    { firstName: 'Isabelle', lastName: 'Lavoie', email: 'isabelle.lavoie@employee.com', phone: '514-789-0123' },
    { firstName: 'Marc', lastName: 'Bouchard', email: 'marc.bouchard@employee.com', phone: '514-890-1234' },
    { firstName: 'Julie', lastName: 'Roy', email: 'julie.roy@employee.com', phone: '514-901-2345' },
    { firstName: 'François', lastName: 'Côté', email: 'francois.cote@employee.com', phone: '514-012-3456' },
    { firstName: 'Nathalie', lastName: 'Bergeron', email: 'nathalie.bergeron@employee.com', phone: '514-123-4567' },
    { firstName: 'Michel', lastName: 'Lévesque', email: 'michel.levesque@employee.com', phone: '514-234-5678' },
    { firstName: 'Caroline', lastName: 'Beaulieu', email: 'caroline.beaulieu@employee.com', phone: '514-345-6789' },
    { firstName: 'David', lastName: 'Morin', email: 'david.morin@employee.com', phone: '514-456-7890' },
    { firstName: 'Sylvie', lastName: 'Pelletier', email: 'sylvie.pelletier@employee.com', phone: '514-567-8901' }
];

const hospitals = [
    'Hôpital Notre-Dame',
    'Hôpital Sacré-Cœur',
    'Hôpital Sainte-Justine',
    'Hôpital Royal Victoria',
    'Hôpital Général de Montréal',
    'Hôpital Maisonneuve-Rosemont',
    'Hôpital Jean-Talon',
    'Hôpital Fleury',
    'Hôpital Cité-de-la-Santé',
    'Hôpital Pierre-Boucher',
    'Hôpital Charles-Le Moyne',
    'Hôpital Anna-Laberge',
    'Hôpital de Valleyfield',
    'Hôpital de Saint-Jérôme',
    'Hôpital de Saint-Eustache'
];

const transferReasons = [
    'Specialized cardiac care required',
    'Emergency surgery needed',
    'ICU bed availability',
    'Specialist consultation required',
    'Patient family request',
    'Equipment not available',
    'Overcrowding situation',
    'Medical emergency',
    'Post-operative care',
    'Rehabilitation services needed',
    'Diagnostic imaging required',
    'Oncology treatment needed',
    'Pediatric specialist required',
    'Trauma center needed',
    'Burn unit required'
];

const patientNames = [
    { firstName: 'Marie', lastName: 'Tremblay' },
    { firstName: 'Jean', lastName: 'Gagnon' },
    { firstName: 'Sophie', lastName: 'Lavoie' },
    { firstName: 'Pierre', lastName: 'Martin' },
    { firstName: 'Isabelle', lastName: 'Dubois' },
    { firstName: 'Marc', lastName: 'Bouchard' },
    { firstName: 'Julie', lastName: 'Roy' },
    { firstName: 'François', lastName: 'Côté' },
    { firstName: 'Nathalie', lastName: 'Bergeron' },
    { firstName: 'Michel', lastName: 'Lévesque' },
    { firstName: 'Caroline', lastName: 'Beaulieu' },
    { firstName: 'David', lastName: 'Morin' },
    { firstName: 'Sylvie', lastName: 'Pelletier' },
    { firstName: 'André', lastName: 'Fortin' },
    { firstName: 'Louise', lastName: 'Girard' }
];

// Parse command line arguments
const args = process.argv.slice(2);
const reset = args.includes('--reset');
const usersOnly = args.includes('--users-only');
const transfersOnly = args.includes('--transfers-only');
const countArg = args.find(arg => arg.startsWith('--count='));
const count = countArg ? parseInt(countArg.split('=')[1]) || 5 : 5;

function generateTransferId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TRF-${timestamp}-${random}`.toUpperCase();
}

function generateDossierNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}-${random}`;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomAge() {
    return Math.floor(Math.random() * 80) + 18; // Ages 18-97
}

function getRandomTime() {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function getRandomDate(daysAgo = 30) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date;
}

async function seedDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        if (reset) {
            console.log('🗑️  Resetting database...');
            await User.deleteMany({});
            await Transfer.deleteMany({});
            console.log('✅ Database cleared');
        }

        const defaultPassword = 'TestPassword123!';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        let createdUsers = [];
        let createdTransfers = [];

        // Seed users
        if (!transfersOnly) {
            console.log(`\n👥 Creating ${count} managers and ${count} employees...`);

            // Create managers
            for (let i = 0; i < count; i++) {
                const managerInfo = managerData[i % managerData.length];
                const manager = new User({
                    ...managerInfo,
                    userType: 'manager',
                    password: hashedPassword,
                    status: 'approved',
                    approvedBy: 'admin@system.com',
                    approvedAt: new Date()
                });

                try {
                    await manager.save();
                    createdUsers.push(manager);
                    console.log(`   ✅ Created manager: ${manager.firstName} ${manager.lastName}`);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`   ⚠️  Manager ${managerInfo.email} already exists`);
                    } else {
                        console.log(`   ❌ Error creating manager: ${error.message}`);
                    }
                }
            }

            // Create employees
            for (let i = 0; i < count; i++) {
                const employeeInfo = employeeData[i % employeeData.length];
                const employee = new User({
                    ...employeeInfo,
                    userType: 'employee',
                    password: hashedPassword,
                    status: 'approved',
                    approvedBy: 'admin@system.com',
                    approvedAt: new Date(),
                    documents: [
                        {
                            fileId: `seed-cv-${i + 1}`,
                            documentType: 'cv',
                            originalName: `${employeeInfo.firstName}_${employeeInfo.lastName}_CV.pdf`,
                            mimeType: 'application/pdf',
                            size: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
                            checksum: `seed-cv-checksum-${i + 1}`,
                            uploadedAt: new Date()
                        },
                        {
                            fileId: `seed-opiq-${i + 1}`,
                            documentType: 'opiqPermit',
                            originalName: `${employeeInfo.firstName}_${employeeInfo.lastName}_OPIQ.pdf`,
                            mimeType: 'application/pdf',
                            size: Math.floor(Math.random() * 1000000) + 200000, // 200KB - 1.2MB
                            checksum: `seed-opiq-checksum-${i + 1}`,
                            uploadedAt: new Date()
                        },
                        {
                            fileId: `seed-rcr-${i + 1}`,
                            documentType: 'rcr',
                            originalName: `${employeeInfo.firstName}_${employeeInfo.lastName}_RCR.pdf`,
                            mimeType: 'application/pdf',
                            size: Math.floor(Math.random() * 1500000) + 300000, // 300KB - 1.8MB
                            checksum: `seed-rcr-checksum-${i + 1}`,
                            uploadedAt: new Date()
                        }
                    ]
                });

                try {
                    await employee.save();
                    createdUsers.push(employee);
                    console.log(`   ✅ Created employee: ${employee.firstName} ${employee.lastName}`);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`   ⚠️  Employee ${employeeInfo.email} already exists`);
                    } else {
                        console.log(`   ❌ Error creating employee: ${error.message}`);
                    }
                }
            }
        }

        // Seed transfers
        if (!usersOnly) {
            console.log(`\n🚑 Creating ${count * 2} transfers...`);

            // Get managers for transfer requests
            const managers = await User.find({ userType: 'manager', status: 'approved' });
            if (managers.length === 0) {
                console.log('⚠️  No managers found. Creating transfers with existing users...');
                const anyUsers = await User.find({ status: 'approved' }).limit(3);
                managers.push(...anyUsers);
            }

            for (let i = 0; i < count * 2; i++) {
                const patient = getRandomElement(patientNames);
                const fromHospital = getRandomElement(hospitals);
                let toHospital = getRandomElement(hospitals);

                // Ensure from and to hospitals are different
                while (toHospital === fromHospital) {
                    toHospital = getRandomElement(hospitals);
                }

                const requester = managers[i % managers.length];
                const statuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
                const weights = [0.2, 0.3, 0.2, 0.25, 0.05]; // Weighted random selection
                const random = Math.random();
                let cumulativeWeight = 0;
                let selectedStatus = 'pending';

                for (let j = 0; j < statuses.length; j++) {
                    cumulativeWeight += weights[j];
                    if (random <= cumulativeWeight) {
                        selectedStatus = statuses[j];
                        break;
                    }
                }

                const transfer = new Transfer({
                    transferId: generateTransferId(),
                    patientInfo: {
                        firstName: patient.firstName,
                        lastName: patient.lastName,
                        age: getRandomAge(),
                        dossierNumber: generateDossierNumber()
                    },
                    fromHospital,
                    toHospital,
                    requestedBy: requester._id,
                    reason: getRandomElement(transferReasons),
                    priority: getRandomElement(['low', 'medium', 'high', 'urgent']),
                    status: selectedStatus,
                    requestedDate: getRandomDate(60), // Random date within last 60 days
                    notes: `Seeded transfer - ${new Date().toLocaleString()}`,
                    medicalDocuments: [],
                    scheduling: {
                        transferTime: getRandomTime()
                    },
                    statusHistory: [{
                        status: 'pending',
                        changedBy: requester._id,
                        changedAt: getRandomDate(60),
                        reason: 'Transfer request created'
                    }],
                    lastModifiedBy: requester._id,
                    estimatedDuration: Math.floor(Math.random() * 120) + 30 // 30-150 minutes
                });

                // Add scheduled date if status is not pending
                if (transfer.status !== 'pending') {
                    const scheduledDate = new Date(transfer.requestedDate);
                    scheduledDate.setHours(scheduledDate.getHours() + Math.floor(Math.random() * 48) + 1);
                    transfer.scheduledDate = scheduledDate;
                }

                // Add completed date if status is completed
                if (transfer.status === 'completed') {
                    const completedDate = new Date(transfer.requestedDate);
                    completedDate.setHours(completedDate.getHours() + Math.floor(Math.random() * 72) + 1);
                    transfer.completedDate = completedDate;
                    transfer.actualDuration = Math.floor(Math.random() * 60) + 30;
                }

                try {
                    await transfer.save();
                    createdTransfers.push(transfer);
                    console.log(`   ✅ Created transfer: ${transfer.transferId} (${transfer.status})`);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`   ⚠️  Transfer ID ${transfer.transferId} already exists, generating new one...`);
                        i--; // Retry with new ID
                    } else {
                        console.log(`   ❌ Error creating transfer: ${error.message}`);
                    }
                }
            }
        }

        console.log(`\n🎉 Database seeding completed!`);
        console.log(`📊 Summary:`);
        console.log(`   - Users created: ${createdUsers.length}`);
        console.log(`   - Transfers created: ${createdTransfers.length}`);
        console.log(`🔑 Default password for all users: ${defaultPassword}`);

        // Display final statistics
        const totalUsers = await User.countDocuments();
        const totalTransfers = await Transfer.countDocuments();
        const managers = await User.countDocuments({ userType: 'manager' });
        const employees = await User.countDocuments({ userType: 'employee' });
        const pendingTransfers = await Transfer.countDocuments({ status: 'pending' });
        const completedTransfers = await Transfer.countDocuments({ status: 'completed' });

        console.log(`\n📈 Final Database State:`);
        console.log(`   - Total users: ${totalUsers} (${managers} managers, ${employees} employees)`);
        console.log(`   - Total transfers: ${totalTransfers} (${pendingTransfers} pending, ${completedTransfers} completed)`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
seedDatabase().catch(console.error);
