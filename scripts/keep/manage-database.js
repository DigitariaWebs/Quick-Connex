#!/usr/bin/env node

/**
 * Comprehensive Database Management Script
 * 
 * Interactive menu-driven script for managing all database operations including:
 * - Database connection and environment selection
 * - User management
 * - Transfer management
 * - CIUSSS management and seeding
 * - Hospital management and seeding
 * - Data operations and clearing
 * - Statistics and reports
 * 
 * Usage:
 *   node scripts/essentials/manage-database.js
 *   npm run manage-db
 */

const mongoose = require('mongoose');
const readline = require('readline');
const { MongoClient, GridFSBucket } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// ===== DATABASE CONFIGURATION =====

/**
 * Get the current database environment
 */
function getDatabaseEnvironment() {
    const dbEnv = process.env.DATABASE_ENV?.toLowerCase();

    if (dbEnv === 'development' || dbEnv === 'production') {
        return dbEnv;
    }

    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    return nodeEnv === 'production' ? 'production' : 'development';
}

/**
 * Get the appropriate MongoDB URI based on environment
 */
function getMongoDbUri() {
    const dbEnv = getDatabaseEnvironment();

    if (dbEnv === 'development') {
        if (process.env.MONGODB_URI_DEV) {
            return process.env.MONGODB_URI_DEV;
        }
    } else {
        if (process.env.MONGODB_URI_PROD) {
            return process.env.MONGODB_URI_PROD;
        }
    }

    if (process.env.MONGODB_URI) {
        return process.env.MONGODB_URI;
    }

    return 'mongodb://localhost:27017/patients_management';
}

/**
 * Extract database name from MongoDB connection string
 */
function getDatabaseName(uri) {
    try {
        const match = uri.match(/\/([^\/\?]+)(\?|$)/);
        return match && match[1] ? match[1] : 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

// Current database URI (can be changed at runtime)
let currentMongoUri = getMongoDbUri();
let currentDbEnv = getDatabaseEnvironment();

// ===== SCHEMAS =====

const userSchema = new mongoose.Schema({
    userType: {
        type: String,
        required: true,
        enum: ['employee', 'manager', 'admin', 'super_admin']
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    post: { type: String, trim: true },
    ciusss: { type: mongoose.Schema.Types.ObjectId, ref: 'CIUSSS' },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    documents: [{
        fileId: { type: String, required: true },
        documentType: { type: String, required: true, enum: ['cv', 'opiqPermit', 'rcr'] },
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
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    approvedBy: { type: String, trim: true },
    approvedAt: { type: Date },
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

const ciusssSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true,
    collection: 'ciusss'
});

const hospitalSchema = new mongoose.Schema({
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

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', transferSchema);
const CIUSSS = mongoose.models.CIUSSS || mongoose.model('CIUSSS', ciusssSchema);
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

// ===== READLINE INTERFACE =====

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

// ===== CIUSSS DATA =====

const CIUSSS_DATA = [
    { code: '01', name: 'CISSS du Bas-Saint-Laurent' },
    { code: '02', name: 'CIUSSS du Saguenay–Lac-Saint-Jean' },
    { code: '03', name: 'CIUSSS de la Capitale-Nationale' },
    { code: '04', name: 'CIUSSS de la Mauricie-et-du-Centre-du-Québec' },
    { code: '05', name: 'CIUSSS de l\'Estrie – Centre hospitalier universitaire de Sherbrooke' },
    { code: '06-1', name: 'CIUSSS de l\'Est-de-l\'Île-de-Montréal' },
    { code: '06-2', name: 'CIUSSS de l\'Ouest-de-l\'Île-de-Montréal' },
    { code: '06-3', name: 'CIUSSS du Centre-Ouest-de-l\'Île-de-Montréal' },
    { code: '06-4', name: 'CIUSSS du Centre-Sud-de-l\'Île-de-Montréal' },
    { code: '06-5', name: 'CIUSSS du Nord-de-l\'Île-de-Montréal' },
    { code: '07', name: 'CISSS de l\'Outaouais' },
    { code: '08', name: 'CISSS de l\'Abitibi-Témiscamingue' },
    { code: '09', name: 'CISSS de la Côte-Nord' },
    { code: '11-1', name: 'CISSS de la Gaspésie' },
    { code: '11-2', name: 'CISSS des Îles' },
    { code: '12', name: 'CISSS de Chaudière-Appalaches' },
    { code: '13', name: 'CISSS de Laval' },
    { code: '14', name: 'CISSS de Lanaudière' },
    { code: '15', name: 'CISSS des Laurentides' },
    { code: '16-1', name: 'CISSS de la Montérégie-Centre' },
    { code: '16-2', name: 'CISSS de la Montérégie-Est' },
    { code: '16-3', name: 'CISSS de la Montérégie-Ouest' }
];

// ===== HOSPITAL DATA =====

const HOSPITALS_DATA = [
    // CIUSSS DE L'EST-DE-L'ÎLE-DE-MONTRÉAL
    {
        name: "Hôpital Maisonneuve-Rosemont",
        address: "5415, boulevard de l'Assomption, Montréal QC H1T 2M4",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DE L'EST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Est-de-l'Île-de-Montréal"
        },
        specialties: ["Cardiology", "Oncology", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital Santa Cabrini Ospedale",
        address: "5655, rue Saint-Zotique Est, Montréal QC H1T 1P7",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DE L'EST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Est-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Surgery", "Emergency Medicine"]
    },
    {
        name: "Institut universitaire en santé mentale de Montréal",
        address: "7401, rue Hochelaga, Montréal QC H1N 3M5",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DE L'EST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Est-de-l'Île-de-Montréal"
        },
        specialties: ["Mental Health", "Psychiatry", "Psychology"]
    },
    // CIUSSS DE L'OUEST-DE-L'ÎLE-DE-MONTRÉAL
    {
        name: "Hôpital général du Lakeshore",
        address: "160, avenue Stillview, Pointe-Claire (Québec) H9R 2Y2",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DE L'OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital de LaSalle",
        address: "8585, terrasse Champlain, LaSalle (Québec) H8P 1C1",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DE L'OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Rehabilitation"]
    },
    {
        name: "Centre hospitalier de St. Mary",
        address: "3830, avenue Lacombe, Montréal (Québec) H3T 1M5",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DE L'OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    // CIUSSS DU CENTRE-OUEST-DE-L'ÎLE-DE-MONTRÉAL
    {
        name: "Hôpital général juif",
        address: "3755 chemin de la Côte-Sainte-Catherine, Montréal, Québec, Canada H3T 1E2",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["Cardiology", "Oncology", "Emergency Medicine", "Surgery", "Neurology"]
    },
    {
        name: "Hôpital Mont Sinaï Montréal",
        address: "5690 boulevard Cavendish, Montréal, Québec, H4W 1S7",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital Catherine Booth",
        address: "4375, avenue Montclair, Montréal, Québec H4B 2J5",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine"]
    },
    {
        name: "Hôpital Richardson",
        address: "5425, avenue Bessborough, Montréal, Québec H4V 2S7",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-OUEST-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Ouest-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine"]
    },
    // CIUSSS DU CENTRE-SUD-DE-L'ÎLE-DE-MONTRÉAL
    {
        name: "Hôpital de Verdun",
        address: "4000, boulevard LaSalle, Montréal QC H4G 2A3",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-SUD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Sud-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital Notre-Dame",
        address: "1560, rue Sherbrooke Est, Montréal QC H2L 4M1",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-SUD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Sud-de-l'Île-de-Montréal"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology"]
    },
    {
        name: "Hôpital chinois de Montréal",
        address: "189, avenue Viger Est, Montréal QC H2X 3Y9",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU CENTRE-SUD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Centre-Sud-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Traditional Chinese Medicine"]
    },
    // CIUSSS DU NORD-DE-L'ÎLE-DE-MONTRÉAL
    {
        name: "Hôpital du Sacré-Cœur-de-Montréal",
        address: "5400, boul. Gouin Ouest, Montréal (Québec) H4J 1C5",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU NORD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Nord-de-l'Île-de-Montréal"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology", "Neurology"]
    },
    {
        name: "Hôpital Jean-Talon",
        address: "1385, rue Jean-Talon Est, Montréal (Québec) H2E 1S6",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU NORD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Nord-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital Fleury",
        address: "2180, Rue Fleury Est, Montréal (Québec) H2B 1K3",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU NORD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Nord-de-l'Île-de-Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital en santé mentale Rivière-des-Prairies",
        address: "7070, Boulevard Perras, Montréal (Québec) H1E 1A4",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU NORD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Nord-de-l'Île-de-Montréal"
        },
        specialties: ["Mental Health", "Psychiatry", "Psychology"]
    },
    {
        name: "Hôpital en santé mentale Albert-Prévost",
        address: "6555, Boulevard Gouin Ouest, Montréal (Québec) H4K 1B3",
        organization: {
            type: "CIUSSS",
            name: "CIUSSS DU NORD-DE-L'ÎLE-DE-MONTRÉAL",
            region: "Nord-de-l'Île-de-Montréal"
        },
        specialties: ["Mental Health", "Psychiatry", "Psychology"]
    },
    // CISSS DE LAVAL
    {
        name: "Hôpital de la Cité-de-la-Santé",
        address: "1755, boulevard René-Laennec, Laval (Québec) H7M 3L9",
        organization: {
            type: "CISSS",
            name: "CISSS DE LAVAL",
            region: "Laval"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology", "Oncology"]
    },
    // CISSS DES LAURENTIDES
    {
        name: "Hôpital de Saint-Jérôme",
        address: "290, rue De Montigny, Saint-Jérôme (Qc) J7Z 5T3",
        organization: {
            type: "CISSS",
            name: "CISSS DES LAURENTIDES",
            region: "Laurentides"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital de Saint-Eustache",
        address: "520, boul. Arthur-Sauvé, Saint-Eustache (Qc) J7R 5B1",
        organization: {
            type: "CISSS",
            name: "CISSS DES LAURENTIDES",
            region: "Laurentides"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital de Mont-Laurier",
        address: "2561, chemin de la Lièvre Sud, Mont-Laurier (Qc) J9L 3G3",
        organization: {
            type: "CISSS",
            name: "CISSS DES LAURENTIDES",
            region: "Laurentides"
        },
        specialties: ["General Medicine", "Emergency Medicine"]
    },
    // CISSS DE LANAUDIÈRE
    {
        name: "Centre hospitalier De Lanaudière",
        address: "1000, boulevard Sainte-Anne, Saint-Charles-Borromée (Québec) J6E 6J2",
        organization: {
            type: "CISSS",
            name: "CISSS DE LANAUDIÈRE",
            region: "Lanaudière"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital Pierre-Le Gardeur",
        address: "911, montée des Pionniers, Terrebonne (Québec) J6V 2H2",
        organization: {
            type: "CISSS",
            name: "CISSS DE LANAUDIÈRE",
            region: "Lanaudière"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    // CISSS DE LA MONTÉRÉGIE-CENTRE
    {
        name: "Hôpital Pierre-Boucher",
        address: "1333, boulevard Jacques-Cartier Est, Longueuil QC J4M 2A5",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology"]
    },
    {
        name: "Hôpital Honoré-Mercier",
        address: "2750, boulevard Laframboise, Saint-Hyacinthe QC J2S 4Y8",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôtel-Dieu de Sorel",
        address: "400, avenue de l'Hôtel-Dieu, Sorel-Tracy QC J3P 1N5",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["General Medicine", "Emergency Medicine"]
    },
    {
        name: "Hôpital du Haut-Richelieu",
        address: "920 boulevard du Séminaire Nord, Saint-Jean-sur-Richelieu QC J3A 1B7",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Hôpital Anna-Laberge",
        address: "200, boulevard Brisebois, Châteauguay QC J6K 4W8",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["General Medicine", "Emergency Medicine"]
    },
    {
        name: "Hôpital Barrie Memorial / Barrie Memorial Hospital",
        address: "28, rue Gale, Ormstown QC J0S 1K0",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["General Medicine", "Emergency Medicine"]
    },
    {
        name: "Hôpital Charles-Le Moyne",
        address: "3120, boulevard Taschereau, Greenfield Park QC J4V 2H1",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology"]
    },
    {
        name: "Hôpital du Suroît",
        address: "150, rue Saint-Thomas, Salaberry-de-Valleyfield QC J6T 6C1",
        organization: {
            type: "CISSS",
            name: "CISSS DE LA MONTÉRÉGIE-CENTRE",
            region: "Montérégie-Centre"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    // CUSM (Centre universitaire de santé McGill)
    {
        name: "Hôpital général de Montréal",
        address: "1650 av. Cedar, Montréal QC H3G 1A4",
        organization: {
            type: "CUSM",
            name: "Centre universitaire de santé McGill",
            region: "Montréal"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology", "Oncology", "Neurology"]
    },
    {
        name: "Hôpital Royal Victoria",
        address: "1001 boul. Décarie, Montréal QC H4A 3J1",
        organization: {
            type: "CUSM",
            name: "Centre universitaire de santé McGill",
            region: "Montréal"
        },
        specialties: ["Emergency Medicine", "Trauma", "Surgery", "Cardiology", "Oncology", "Neurology"]
    },
    {
        name: "Hôpital de Lachine",
        address: "650 16e Avenue, Lachine QC H8S 3N5",
        organization: {
            type: "CUSM",
            name: "Centre universitaire de santé McGill",
            region: "Montréal"
        },
        specialties: ["General Medicine", "Emergency Medicine", "Surgery"]
    },
    {
        name: "Le Neuro (L'Institut-hôpital neurologique de Montréal)",
        address: "3801 rue University, Montréal QC H3A 2B4",
        organization: {
            type: "CUSM",
            name: "Centre universitaire de santé McGill",
            region: "Montréal"
        },
        specialties: ["Neurology", "Neurosurgery", "Neuroscience Research"]
    }
];

// ===== UTILITY FUNCTIONS =====

function normalizePhoneNumber(phone) {
    let normalized = phone.replace(/[^\d+]/g, '');
    if (!normalized.startsWith('+') && normalized.startsWith('1')) {
        normalized = '+' + normalized;
    } else if (!normalized.startsWith('+')) {
        normalized = '+1' + normalized;
    }
    return normalized;
}

/**
 * Check if user confirmed an action
 * Accepts 'y', 'yes', 'Y', 'YES', etc.
 */
function isConfirmed(answer) {
    const normalized = answer.trim().toLowerCase();
    return normalized === 'yes' || normalized === 'y';
}

function maskUri(uri) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

function getPriorityEmoji(priority) {
    switch (priority) {
        case 'urgent': return '🚨';
        case 'high': return '🔴';
        case 'medium': return '🟡';
        case 'low': return '🟢';
        default: return '⚪';
    }
}

function getStatusEmoji(status) {
    switch (status) {
        case 'pending': return '⏳';
        case 'accepted': return '✅';
        case 'in_progress': return '🚑';
        case 'completed': return '🏁';
        case 'cancelled': return '❌';
        default: return '❓';
    }
}

// ===== DATABASE CONNECTION FUNCTIONS =====

/**
 * Ensure mongoose connection is active, reconnect if needed
 */
async function ensureConnection() {
    try {
        // Check if already connected to the current URI
        if (mongoose.connection.readyState === 1) {
            const currentDbName = getDatabaseName(currentMongoUri);
            const connectedDbName = mongoose.connection.name;

            // If connected to a different database, disconnect and reconnect
            if (currentDbName !== connectedDbName) {
                console.log('🔄 Reconnecting to new database...');
                await mongoose.disconnect();
                await mongoose.connect(currentMongoUri);
                console.log(`✅ Reconnected to: ${mongoose.connection.name}`);
            }
            return;
        }

        // Not connected, connect now
        await mongoose.connect(currentMongoUri);
        console.log(`✅ Connected to: ${mongoose.connection.name}`);
    } catch (error) {
        console.error(`❌ Connection error: ${error.message}`);
        throw error;
    }
}

async function showDatabaseInfo() {
    const dbName = getDatabaseName(currentMongoUri);
    const maskedUri = maskUri(currentMongoUri);

    console.log('\n' + '='.repeat(80));
    console.log('📊 DATABASE INFORMATION');
    console.log('='.repeat(80));
    console.log(`Environment: ${currentDbEnv}`);
    console.log(`Database Name: ${dbName}`);
    console.log(`URI: ${maskedUri}`);
    console.log(`Connection Status: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    if (mongoose.connection.readyState === 1) {
        console.log(`Connected Database: ${mongoose.connection.name}`);
    }
    console.log('='.repeat(80));
}

async function selectDatabaseEnvironment() {
    console.log('\n' + '='.repeat(80));
    console.log('🔌 SELECT DATABASE ENVIRONMENT');
    console.log('='.repeat(80));
    console.log('1. Development');
    console.log('2. Production');
    console.log('0. Cancel');
    console.log('='.repeat(80));

    const choice = await question('\nSelect environment: ');

    if (choice === '1') {
        currentDbEnv = 'development';
        currentMongoUri = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
        console.log('\n✅ Switched to DEVELOPMENT database');
        // Reconnect to new database
        await ensureConnection();
    } else if (choice === '2') {
        currentDbEnv = 'production';
        currentMongoUri = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';
        console.log('\n✅ Switched to PRODUCTION database');
        // Reconnect to new database
        await ensureConnection();
    } else {
        console.log('\n❌ Cancelled');
        return;
    }

    await showDatabaseInfo();
}

async function testDatabaseConnection() {
    console.log('\n🔌 Testing database connection...');

    try {
        // Use a temporary connection for testing to avoid affecting main connection
        const testConnection = mongoose.createConnection(currentMongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        const startTime = Date.now();

        await testConnection.asPromise();

        const connectionTime = Date.now() - startTime;
        const dbName = testConnection.name;
        const host = `${testConnection.host}:${testConnection.port}`;

        console.log(`✅ Connection successful (${connectionTime}ms)`);
        console.log(`   Database: ${dbName}`);
        console.log(`   Host: ${host}`);

        await testConnection.close();
    } catch (error) {
        console.error(`❌ Connection failed: ${error.message}`);
    }
}

// ===== USER MANAGEMENT FUNCTIONS =====

async function listAllUsers() {
    try {
        await ensureConnection();
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        if (users.length === 0) {
            console.log('\n⚠️  No users found in the database.');
            return;
        }

        console.log('\n' + '='.repeat(120));
        console.log(`👥 ALL USERS (${users.length} total)`);
        console.log('='.repeat(120));

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   🆔 ID: ${user._id}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   📱 Phone: ${user.phone}`);
            console.log(`   👤 Type: ${user.userType}`);
            console.log(`   📊 Status: ${user.status}`);
            console.log(`   ✉️  Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
            console.log(`   📱 Phone Verified: ${user.phoneVerified ? '✅ Yes' : '❌ No'}`);

            if (user.userType === 'manager') {
                console.log(`   💼 Post: ${user.post || 'N/A'}`);
            } else if (user.userType === 'employee') {
                console.log(`   📄 Documents: ${user.documents?.length || 0}`);
            }

            if (user.status === 'approved' && user.approvedBy) {
                console.log(`   ✅ Approved by: ${user.approvedBy}`);
                console.log(`   📅 Approved at: ${user.approvedAt?.toLocaleString() || 'N/A'}`);
            }

            console.log(`   📅 Created: ${user.createdAt?.toLocaleString() || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(120));
    } catch (error) {
        console.error('❌ Error listing users:', error.message);
        throw error;
    }
}

async function listUsersByType(userType) {
    try {
        await ensureConnection();
        const validTypes = ['employee', 'manager', 'admin', 'super_admin'];

        if (!validTypes.includes(userType)) {
            console.log(`\n❌ Invalid user type: ${userType}`);
            console.log(`Valid types: ${validTypes.join(', ')}`);
            return;
        }

        const users = await User.find({ userType })
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();

        if (users.length === 0) {
            console.log(`\n⚠️  No ${userType} users found in the database.`);
            return;
        }

        console.log('\n' + '='.repeat(120));
        console.log(`👥 ${userType.toUpperCase()} USERS (${users.length} total)`);
        console.log('='.repeat(120));

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   🆔 ID: ${user._id}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   📱 Phone: ${user.phone}`);
            console.log(`   📊 Status: ${user.status}`);
            console.log(`   ✉️  Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
            console.log(`   📱 Phone Verified: ${user.phoneVerified ? '✅ Yes' : '❌ No'}`);

            if (user.userType === 'manager') {
                console.log(`   💼 Post: ${user.post || 'N/A'}`);
            }

            console.log(`   📅 Created: ${user.createdAt?.toLocaleString() || 'N/A'}`);
        });

        console.log('\n' + '='.repeat(120));
    } catch (error) {
        console.error('❌ Error listing users by type:', error.message);
        throw error;
    }
}

async function createUser() {
    try {
        await ensureConnection();
        console.log('\n' + '='.repeat(80));
        console.log('➕ CREATE NEW USER');
        console.log('='.repeat(80));

        console.log('\nUser Types:');
        console.log('1. employee');
        console.log('2. manager');
        console.log('3. admin');
        console.log('4. super_admin');
        const typeChoice = await question('\nSelect user type (1-4 or type name): ');

        let userType;
        if (typeChoice === '1') userType = 'employee';
        else if (typeChoice === '2') userType = 'manager';
        else if (typeChoice === '3') userType = 'admin';
        else if (typeChoice === '4') userType = 'super_admin';
        else userType = typeChoice.trim().toLowerCase();

        const validTypes = ['employee', 'manager', 'admin', 'super_admin'];
        if (!validTypes.includes(userType)) {
            console.log(`\n❌ Invalid user type: ${userType}`);
            return false;
        }

        const firstName = await question('First Name: ');
        const lastName = await question('Last Name: ');
        const email = await question('Email: ');
        const phone = await question('Phone: ');
        const password = await question('Password (min 6 characters): ');

        if (!firstName || !lastName || !email || !phone || !password) {
            console.log('\n❌ All fields are required.');
            return false;
        }

        if (password.length < 6) {
            console.log('\n❌ Password must be at least 6 characters long.');
            return false;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedPhone = normalizePhoneNumber(phone);

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { phone: normalizedPhone }
            ]
        });

        if (existingUser) {
            console.log('\n❌ User with this email or phone already exists.');
            return false;
        }

        let post = null;
        if (userType === 'manager') {
            post = await question('Post/Position (optional, press Enter to skip): ');
            if (post && post.trim()) {
                post = post.trim();
            } else {
                post = null;
            }
        }

        console.log('\nStatus options:');
        console.log('1. pending');
        console.log('2. approved');
        console.log('3. rejected');
        const statusChoice = await question('Select status (1-3, default: approved): ');

        let status = 'approved';
        if (statusChoice === '1') status = 'pending';
        else if (statusChoice === '2') status = 'approved';
        else if (statusChoice === '3') status = 'rejected';

        console.log('\n🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);

        const now = new Date();
        const userDoc = {
            userType,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            password: hashedPassword,
            status,
            emailVerified: true,
            phoneVerified: true,
            emailVerifiedAt: now,
            phoneVerifiedAt: now,
            documents: []
        };

        if (userType === 'manager' && post) {
            userDoc.post = post;
        }

        if (status === 'approved') {
            userDoc.approvedBy = 'system';
            userDoc.approvedAt = now;
        }

        console.log('\n📝 Creating user...');
        const user = new User(userDoc);
        const savedUser = await user.save();

        console.log('\n' + '='.repeat(80));
        console.log('✅ USER CREATED SUCCESSFULLY');
        console.log('='.repeat(80));
        console.log(`🆔 ID: ${savedUser._id}`);
        console.log(`👤 Name: ${savedUser.firstName} ${savedUser.lastName}`);
        console.log(`📧 Email: ${savedUser.email}`);
        console.log(`📱 Phone: ${savedUser.phone}`);
        console.log(`👤 Type: ${savedUser.userType}`);
        console.log(`📊 Status: ${savedUser.status}`);
        console.log('='.repeat(80));

        return true;
    } catch (error) {
        if (error.code === 11000) {
            console.error('\n❌ Error: User with this email or phone already exists.');
        } else {
            console.error('\n❌ Error creating user:', error.message);
        }
        throw error;
    }
}

async function deleteUserById(userId) {
    let client;
    try {
        await ensureConnection();
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('\n❌ Invalid user ID format.');
            return false;
        }

        const user = await User.findById(userId).lean();
        if (!user) {
            console.log(`\n⚠️  User with ID ${userId} not found.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete user');
        console.log('='.repeat(80));
        console.log(`Name: ${user.firstName} ${user.lastName}`);
        console.log(`Email: ${user.email}`);
        console.log(`Phone: ${user.phone}`);
        console.log(`Type: ${user.userType}`);
        console.log(`Status: ${user.status}`);
        console.log('='.repeat(80));

        const confirm = await question('\nAre you sure you want to delete this user? (yes/no): ');

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        client = new MongoClient(currentMongoUri);
        await client.connect();
        const db = client.db();

        if (user.documents && user.documents.length > 0) {
            const bucket = new GridFSBucket(db, { bucketName: 'fs' });
            for (const doc of user.documents) {
                try {
                    if (doc.fileId && mongoose.Types.ObjectId.isValid(doc.fileId)) {
                        await bucket.delete(new mongoose.Types.ObjectId(doc.fileId));
                        console.log(`   🗑️  Deleted document: ${doc.originalName}`);
                    }
                } catch (err) {
                    console.log(`   ⚠️  Could not delete document ${doc.originalName}: ${err.message}`);
                }
            }
        }

        await User.findByIdAndDelete(userId);
        console.log(`\n✅ Successfully deleted user: ${user.firstName} ${user.lastName} (${user.email})`);

        return true;
    } catch (error) {
        console.error('\n❌ Error deleting user:', error.message);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function deleteUsersByType(userType) {
    let client;
    try {
        await ensureConnection();
        const validTypes = ['employee', 'manager', 'admin', 'super_admin'];

        if (!validTypes.includes(userType)) {
            console.log(`\n❌ Invalid user type: ${userType}`);
            return false;
        }

        const count = await User.countDocuments({ userType });

        if (count === 0) {
            console.log(`\n⚠️  No ${userType} users found in the database.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete multiple users');
        console.log('='.repeat(80));
        console.log(`User Type: ${userType}`);
        console.log(`Number of users to delete: ${count}`);
        console.log('='.repeat(80));

        const confirm = await question(`\nAre you sure you want to delete ALL ${count} ${userType} user(s)? (yes/no): `);

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        const users = await User.find({ userType }).select('documents').lean();

        client = new MongoClient(currentMongoUri);
        await client.connect();
        const db = client.db();
        const bucket = new GridFSBucket(db, { bucketName: 'fs' });

        let deletedDocs = 0;
        for (const user of users) {
            if (user.documents && user.documents.length > 0) {
                for (const doc of user.documents) {
                    try {
                        if (doc.fileId && mongoose.Types.ObjectId.isValid(doc.fileId)) {
                            await bucket.delete(new mongoose.Types.ObjectId(doc.fileId));
                            deletedDocs++;
                        }
                    } catch (err) {
                        // Document might already be deleted
                    }
                }
            }
        }

        const result = await User.deleteMany({ userType });

        console.log(`\n✅ Successfully deleted ${result.deletedCount} ${userType} user(s)`);
        if (deletedDocs > 0) {
            console.log(`   🗑️  Also deleted ${deletedDocs} associated document(s) from GridFS`);
        }

        return true;
    } catch (error) {
        console.error('\n❌ Error deleting users by type:', error.message);
        throw error;
    } finally {
        if (client) {
            await client.close();
        }
    }
}

async function showUserStatistics() {
    try {
        await ensureConnection();
        const totalUsers = await User.countDocuments();
        const managers = await User.countDocuments({ userType: 'manager' });
        const employees = await User.countDocuments({ userType: 'employee' });
        const admins = await User.countDocuments({ userType: 'admin' });
        const superAdmins = await User.countDocuments({ userType: 'super_admin' });

        const approved = await User.countDocuments({ status: 'approved' });
        const pending = await User.countDocuments({ status: 'pending' });
        const rejected = await User.countDocuments({ status: 'rejected' });
        const suspended = await User.countDocuments({ status: 'suspended' });

        const emailVerified = await User.countDocuments({ emailVerified: true });
        const phoneVerified = await User.countDocuments({ phoneVerified: true });

        console.log('\n' + '='.repeat(80));
        console.log('📊 USER STATISTICS');
        console.log('='.repeat(80));
        console.log(`Total Users: ${totalUsers}`);
        console.log('\nBy Type:');
        console.log(`  👨‍💼 Managers: ${managers}`);
        console.log(`  👷 Employees: ${employees}`);
        console.log(`  👤 Admins: ${admins}`);
        console.log(`  🔑 Super Admins: ${superAdmins}`);
        console.log('\nBy Status:');
        console.log(`  ✅ Approved: ${approved}`);
        console.log(`  ⏳ Pending: ${pending}`);
        console.log(`  ❌ Rejected: ${rejected}`);
        console.log(`  🚫 Suspended: ${suspended}`);
        console.log('\nVerification Status:');
        console.log(`  ✉️  Email Verified: ${emailVerified}`);
        console.log(`  📱 Phone Verified: ${phoneVerified}`);
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ Error getting user statistics:', error.message);
        throw error;
    }
}

// ===== TRANSFER MANAGEMENT FUNCTIONS =====

async function listAllTransfers() {
    try {
        await ensureConnection();
        const transfers = await Transfer.find({})
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('lastModifiedBy', 'firstName lastName email')
            .sort({ requestedDate: -1 })
            .lean();

        if (transfers.length === 0) {
            console.log('\n⚠️  No transfers found in the database.');
            return;
        }

        console.log('\n' + '='.repeat(140));
        console.log(`🚑 ALL TRANSFERS (${transfers.length} total)`);
        console.log('='.repeat(140));

        transfers.forEach((transfer, index) => {
            const priorityEmoji = getPriorityEmoji(transfer.priority);
            const statusEmoji = getStatusEmoji(transfer.status);

            console.log(`\n${index + 1}. ${statusEmoji} ${transfer.transferId}`);
            console.log(`   👤 Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName} (${transfer.patientInfo.age} years)`);
            console.log(`   📋 Dossier: ${transfer.patientInfo.dossierNumber}`);
            console.log(`   🏥 From: ${transfer.fromHospital}`);
            console.log(`   🏥 To: ${transfer.toHospital}`);
            console.log(`   ${priorityEmoji} Priority: ${transfer.priority.toUpperCase()}`);
            console.log(`   📊 Status: ${transfer.status}`);
            console.log(`   📝 Reason: ${transfer.reason}`);

            if (transfer.requestedBy) {
                console.log(`   👤 Requested by: ${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName} (${transfer.requestedBy.userType})`);
            }

            if (transfer.scheduledDate) {
                console.log(`   📅 Scheduled: ${transfer.scheduledDate.toLocaleString()}`);
            }

            if (transfer.completedDate) {
                console.log(`   🏁 Completed: ${transfer.completedDate.toLocaleString()}`);
            }

            console.log(`   📅 Requested: ${transfer.requestedDate.toLocaleString()}`);
        });

        console.log('\n' + '='.repeat(140));
    } catch (error) {
        console.error('❌ Error listing transfers:', error.message);
        throw error;
    }
}

async function listTransfersByStatus(status) {
    try {
        await ensureConnection();
        const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            console.log(`\n❌ Invalid status: ${status}`);
            console.log(`Valid statuses: ${validStatuses.join(', ')}`);
            return;
        }

        const transfers = await Transfer.find({ status })
            .populate('requestedBy', 'firstName lastName email')
            .sort({ requestedDate: -1 })
            .lean();

        if (transfers.length === 0) {
            console.log(`\n⚠️  No ${status} transfers found.`);
            return;
        }

        console.log('\n' + '='.repeat(140));
        console.log(`🚑 ${status.toUpperCase()} TRANSFERS (${transfers.length} total)`);
        console.log('='.repeat(140));

        transfers.forEach((transfer, index) => {
            const priorityEmoji = getPriorityEmoji(transfer.priority);
            console.log(`\n${index + 1}. ${transfer.transferId}`);
            console.log(`   Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
            console.log(`   ${priorityEmoji} Priority: ${transfer.priority}`);
            console.log(`   From: ${transfer.fromHospital} → To: ${transfer.toHospital}`);
        });

        console.log('\n' + '='.repeat(140));
    } catch (error) {
        console.error('❌ Error listing transfers by status:', error.message);
        throw error;
    }
}

async function listTransfersByPriority(priority) {
    try {
        await ensureConnection();
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            console.log(`\n❌ Invalid priority: ${priority}`);
            console.log(`Valid priorities: ${validPriorities.join(', ')}`);
            return;
        }

        const transfers = await Transfer.find({ priority })
            .populate('requestedBy', 'firstName lastName email')
            .sort({ requestedDate: -1 })
            .lean();

        if (transfers.length === 0) {
            console.log(`\n⚠️  No ${priority} priority transfers found.`);
            return;
        }

        console.log('\n' + '='.repeat(140));
        console.log(`🚑 ${priority.toUpperCase()} PRIORITY TRANSFERS (${transfers.length} total)`);
        console.log('='.repeat(140));

        transfers.forEach((transfer, index) => {
            const statusEmoji = getStatusEmoji(transfer.status);
            console.log(`\n${index + 1}. ${statusEmoji} ${transfer.transferId}`);
            console.log(`   Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
            console.log(`   Status: ${transfer.status}`);
            console.log(`   From: ${transfer.fromHospital} → To: ${transfer.toHospital}`);
        });

        console.log('\n' + '='.repeat(140));
    } catch (error) {
        console.error('❌ Error listing transfers by priority:', error.message);
        throw error;
    }
}

async function viewTransferDetails(transferId) {
    try {
        await ensureConnection();
        const transfer = await Transfer.findOne({ transferId })
            .populate('requestedBy', 'firstName lastName email userType')
            .populate('lastModifiedBy', 'firstName lastName email')
            .lean();

        if (!transfer) {
            console.log(`\n⚠️  Transfer with ID ${transferId} not found.`);
            return;
        }

        const priorityEmoji = getPriorityEmoji(transfer.priority);
        const statusEmoji = getStatusEmoji(transfer.status);

        console.log('\n' + '='.repeat(80));
        console.log('🚑 TRANSFER DETAILS');
        console.log('='.repeat(80));
        console.log(`Transfer ID: ${transfer.transferId}`);
        console.log(`Status: ${statusEmoji} ${transfer.status}`);
        console.log(`Priority: ${priorityEmoji} ${transfer.priority}`);
        console.log(`\nPatient Information:`);
        console.log(`  Name: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`  Age: ${transfer.patientInfo.age} years`);
        console.log(`  Dossier: ${transfer.patientInfo.dossierNumber}`);
        console.log(`\nHospitals:`);
        console.log(`  From: ${transfer.fromHospital}`);
        console.log(`  To: ${transfer.toHospital}`);
        console.log(`\nReason: ${transfer.reason}`);
        if (transfer.notes) {
            console.log(`Notes: ${transfer.notes}`);
        }
        if (transfer.requestedBy) {
            console.log(`\nRequested by: ${transfer.requestedBy.firstName} ${transfer.requestedBy.lastName} (${transfer.requestedBy.email})`);
        }
        if (transfer.scheduledDate) {
            console.log(`Scheduled: ${transfer.scheduledDate.toLocaleString()}`);
        }
        if (transfer.completedDate) {
            console.log(`Completed: ${transfer.completedDate.toLocaleString()}`);
        }
        console.log(`Requested: ${transfer.requestedDate.toLocaleString()}`);
        console.log('='.repeat(80));
    } catch (error) {
        console.error('❌ Error viewing transfer details:', error.message);
        throw error;
    }
}

async function deleteTransferById(transferId) {
    try {
        await ensureConnection();
        const transfer = await Transfer.findOne({ transferId }).lean();

        if (!transfer) {
            console.log(`\n⚠️  Transfer with ID ${transferId} not found.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete transfer');
        console.log('='.repeat(80));
        console.log(`Transfer ID: ${transfer.transferId}`);
        console.log(`Patient: ${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}`);
        console.log(`From: ${transfer.fromHospital}`);
        console.log(`To: ${transfer.toHospital}`);
        console.log(`Status: ${transfer.status}`);
        console.log('='.repeat(80));

        const confirm = await question('\nAre you sure you want to delete this transfer? (yes/no): ');

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        await Transfer.deleteOne({ transferId });
        console.log(`\n✅ Successfully deleted transfer: ${transfer.transferId}`);

        return true;
    } catch (error) {
        console.error('\n❌ Error deleting transfer:', error.message);
        throw error;
    }
}

async function deleteTransfersByStatus(status) {
    try {
        await ensureConnection();
        const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            console.log(`\n❌ Invalid status: ${status}`);
            return false;
        }

        const count = await Transfer.countDocuments({ status });

        if (count === 0) {
            console.log(`\n⚠️  No ${status} transfers found.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete multiple transfers');
        console.log('='.repeat(80));
        console.log(`Status: ${status}`);
        console.log(`Number of transfers to delete: ${count}`);
        console.log('='.repeat(80));

        const confirm = await question(`\nAre you sure you want to delete ALL ${count} ${status} transfer(s)? (yes/no): `);

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        const result = await Transfer.deleteMany({ status });
        console.log(`\n✅ Successfully deleted ${result.deletedCount} ${status} transfer(s)`);

        return true;
    } catch (error) {
        console.error('\n❌ Error deleting transfers by status:', error.message);
        throw error;
    }
}

async function showTransferStatistics() {
    try {
        await ensureConnection();
        const totalTransfers = await Transfer.countDocuments();
        const pending = await Transfer.countDocuments({ status: 'pending' });
        const accepted = await Transfer.countDocuments({ status: 'accepted' });
        const inProgress = await Transfer.countDocuments({ status: 'in_progress' });
        const completed = await Transfer.countDocuments({ status: 'completed' });
        const cancelled = await Transfer.countDocuments({ status: 'cancelled' });

        const urgent = await Transfer.countDocuments({ priority: 'urgent' });
        const high = await Transfer.countDocuments({ priority: 'high' });
        const medium = await Transfer.countDocuments({ priority: 'medium' });
        const low = await Transfer.countDocuments({ priority: 'low' });

        console.log('\n' + '='.repeat(80));
        console.log('📊 TRANSFER STATISTICS');
        console.log('='.repeat(80));
        console.log(`Total Transfers: ${totalTransfers}`);
        console.log('\nBy Status:');
        console.log(`  ⏳ Pending: ${pending}`);
        console.log(`  ✅ Accepted: ${accepted}`);
        console.log(`  🚑 In Progress: ${inProgress}`);
        console.log(`  🏁 Completed: ${completed}`);
        console.log(`  ❌ Cancelled: ${cancelled}`);
        console.log('\nBy Priority:');
        console.log(`  🚨 Urgent: ${urgent}`);
        console.log(`  🔴 High: ${high}`);
        console.log(`  🟡 Medium: ${medium}`);
        console.log(`  🟢 Low: ${low}`);
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ Error getting transfer statistics:', error.message);
        throw error;
    }
}

// ===== CIUSSS MANAGEMENT FUNCTIONS =====

async function listAllCIUSSS() {
    try {
        await ensureConnection();
        const ciusssList = await CIUSSS.find({}).sort({ code: 1 }).lean();

        if (ciusssList.length === 0) {
            console.log('\n⚠️  No CIUSSS records found in the database.');
            return;
        }

        console.log('\n' + '='.repeat(80));
        console.log(`🏛️  ALL CIUSSS RECORDS (${ciusssList.length} total)`);
        console.log('='.repeat(80));

        ciusssList.forEach((ciusss, index) => {
            console.log(`${index + 1}. [${ciusss.code}] ${ciusss.name}`);
            if (ciusss.region) {
                console.log(`   Region: ${ciusss.region}`);
            }
            console.log(`   Active: ${ciusss.isActive ? '✅ Yes' : '❌ No'}`);
        });

        console.log('='.repeat(80));
    } catch (error) {
        console.error('❌ Error listing CIUSSS:', error.message);
        throw error;
    }
}

async function seedCIUSSS() {
    try {
        await ensureConnection();
        const existingCount = await CIUSSS.countDocuments();

        console.log('\n' + '='.repeat(80));
        console.log('🌱 SEED CIUSSS DATA');
        console.log('='.repeat(80));
        console.log(`Current CIUSSS records: ${existingCount}`);
        console.log(`Records to insert: ${CIUSSS_DATA.length}`);
        console.log('='.repeat(80));

        if (existingCount > 0) {
            const confirm = await question('\n⚠️  This will DELETE all existing CIUSSS records. Continue? (yes/no): ');
            if (!isConfirmed(confirm)) {
                console.log('❌ Seeding cancelled.');
                return false;
            }
        }

        console.log('\n🗑️  Clearing existing CIUSSS data...');
        await CIUSSS.deleteMany({});
        console.log('✅ Cleared existing CIUSSS data');

        console.log('\n🌱 Seeding CIUSSS data...');
        const insertedCIUSSS = await CIUSSS.insertMany(CIUSSS_DATA);
        console.log(`✅ Inserted ${insertedCIUSSS.length} CIUSSS records`);

        console.log('\n📋 CIUSSS Records:');
        insertedCIUSSS.forEach(ciusss => {
            console.log(`  ${ciusss.code}: ${ciusss.name}`);
        });

        console.log('\n🎉 CIUSSS seeding completed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error seeding CIUSSS:', error.message);
        throw error;
    }
}

async function clearCIUSSS() {
    try {
        await ensureConnection();
        const count = await CIUSSS.countDocuments();

        if (count === 0) {
            console.log('\n⚠️  No CIUSSS records to delete.');
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete all CIUSSS records');
        console.log('='.repeat(80));
        console.log(`Number of records to delete: ${count}`);
        console.log('='.repeat(80));

        const confirm = await question(`\nAre you sure you want to delete ALL ${count} CIUSSS record(s)? (yes/no): `);

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        const result = await CIUSSS.deleteMany({});
        console.log(`\n✅ Successfully deleted ${result.deletedCount} CIUSSS record(s)`);

        return true;
    } catch (error) {
        console.error('\n❌ Error clearing CIUSSS:', error.message);
        throw error;
    }
}

async function showCIUSSSStatistics() {
    try {
        await ensureConnection();
        const total = await CIUSSS.countDocuments();
        const active = await CIUSSS.countDocuments({ isActive: true });
        const inactive = await CIUSSS.countDocuments({ isActive: false });

        console.log('\n' + '='.repeat(80));
        console.log('📊 CIUSSS STATISTICS');
        console.log('='.repeat(80));
        console.log(`Total CIUSSS Records: ${total}`);
        console.log(`Active: ${active}`);
        console.log(`Inactive: ${inactive}`);
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ Error getting CIUSSS statistics:', error.message);
        throw error;
    }
}

// ===== HOSPITAL MANAGEMENT FUNCTIONS =====

async function listAllHospitals() {
    try {
        await ensureConnection();
        const hospitals = await Hospital.find({}).sort({ name: 1 }).lean();

        if (hospitals.length === 0) {
            console.log('\n⚠️  No hospitals found in the database.');
            return;
        }

        console.log('\n' + '='.repeat(120));
        console.log(`🏥 ALL HOSPITALS (${hospitals.length} total)`);
        console.log('='.repeat(120));

        hospitals.forEach((hospital, index) => {
            console.log(`\n${index + 1}. ${hospital.name}`);
            console.log(`   Address: ${hospital.address}`);
            console.log(`   Organization: ${hospital.organization.type} - ${hospital.organization.name}`);
            console.log(`   Region: ${hospital.organization.region}`);
            if (hospital.specialties && hospital.specialties.length > 0) {
                console.log(`   Specialties: ${hospital.specialties.join(', ')}`);
            }
            console.log(`   Active: ${hospital.isActive ? '✅ Yes' : '❌ No'}`);
        });

        console.log('\n' + '='.repeat(120));
    } catch (error) {
        console.error('❌ Error listing hospitals:', error.message);
        throw error;
    }
}

async function listHospitalsByOrganization() {
    try {
        await ensureConnection();
        const hospitals = await Hospital.find({}).sort({ 'organization.name': 1, name: 1 }).lean();

        if (hospitals.length === 0) {
            console.log('\n⚠️  No hospitals found in the database.');
            return;
        }

        const grouped = {};
        hospitals.forEach(hospital => {
            const orgKey = `${hospital.organization.type}: ${hospital.organization.name}`;
            if (!grouped[orgKey]) {
                grouped[orgKey] = [];
            }
            grouped[orgKey].push(hospital);
        });

        console.log('\n' + '='.repeat(120));
        console.log('🏥 HOSPITALS BY ORGANIZATION');
        console.log('='.repeat(120));

        Object.keys(grouped).sort().forEach(orgKey => {
            console.log(`\n${orgKey} (${grouped[orgKey].length} hospitals):`);
            grouped[orgKey].forEach(hospital => {
                console.log(`  - ${hospital.name}`);
            });
        });

        console.log('\n' + '='.repeat(120));
    } catch (error) {
        console.error('❌ Error listing hospitals by organization:', error.message);
        throw error;
    }
}

async function seedHospitals() {
    try {
        await ensureConnection();
        const existingCount = await Hospital.countDocuments();

        console.log('\n' + '='.repeat(80));
        console.log('🌱 SEED HOSPITAL DATA');
        console.log('='.repeat(80));
        console.log(`Current hospitals: ${existingCount}`);
        console.log(`Hospitals to insert: ${HOSPITALS_DATA.length}`);
        console.log('='.repeat(80));

        if (existingCount > 0) {
            const confirm = await question('\n⚠️  This will DELETE all existing hospitals. Continue? (yes/no): ');
            if (!isConfirmed(confirm)) {
                console.log('❌ Seeding cancelled.');
                return false;
            }
        }

        console.log('\n🗑️  Clearing existing hospitals...');
        await Hospital.deleteMany({});
        console.log('✅ Cleared existing hospitals');

        console.log(`\n🏥 Inserting ${HOSPITALS_DATA.length} hospitals...`);
        const insertedHospitals = await Hospital.insertMany(HOSPITALS_DATA);
        console.log(`✅ Successfully inserted ${insertedHospitals.length} hospitals`);

        const summary = await Hospital.aggregate([
            {
                $group: {
                    _id: {
                        type: '$organization.type',
                        name: '$organization.name'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.type': 1, '_id.name': 1 } }
        ]);

        console.log('\n📊 Hospital Summary by Organization:');
        summary.forEach(org => {
            console.log(`  ${org._id.type}: ${org._id.name} - ${org.count} hospitals`);
        });

        console.log(`\n🎉 Hospital seeding completed successfully!`);
        return true;
    } catch (error) {
        console.error('❌ Error seeding hospitals:', error.message);
        throw error;
    }
}

async function clearHospitals() {
    try {
        await ensureConnection();
        const count = await Hospital.countDocuments();

        if (count === 0) {
            console.log('\n⚠️  No hospitals to delete.');
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete all hospitals');
        console.log('='.repeat(80));
        console.log(`Number of hospitals to delete: ${count}`);
        console.log('='.repeat(80));

        const confirm = await question(`\nAre you sure you want to delete ALL ${count} hospital(s)? (yes/no): `);

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        const result = await Hospital.deleteMany({});
        console.log(`\n✅ Successfully deleted ${result.deletedCount} hospital(s)`);

        return true;
    } catch (error) {
        console.error('\n❌ Error clearing hospitals:', error.message);
        throw error;
    }
}

async function showHospitalStatistics() {
    try {
        await ensureConnection();
        const total = await Hospital.countDocuments();
        const active = await Hospital.countDocuments({ isActive: true });
        const inactive = await Hospital.countDocuments({ isActive: false });

        const byOrg = await Hospital.aggregate([
            {
                $group: {
                    _id: '$organization.type',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n' + '='.repeat(80));
        console.log('📊 HOSPITAL STATISTICS');
        console.log('='.repeat(80));
        console.log(`Total Hospitals: ${total}`);
        console.log(`Active: ${active}`);
        console.log(`Inactive: ${inactive}`);
        console.log('\nBy Organization Type:');
        byOrg.forEach(org => {
            console.log(`  ${org._id}: ${org.count}`);
        });
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ Error getting hospital statistics:', error.message);
        throw error;
    }
}

// ===== DATA OPERATIONS =====

async function clearCollection(collectionName) {
    try {
        await ensureConnection();
        const validCollections = ['users', 'transfers', 'ciusss', 'hospitals'];
        if (!validCollections.includes(collectionName.toLowerCase())) {
            console.log(`\n❌ Invalid collection name: ${collectionName}`);
            console.log(`Valid collections: ${validCollections.join(', ')}`);
            return false;
        }

        let Model, count;
        switch (collectionName.toLowerCase()) {
            case 'users':
                Model = User;
                count = await User.countDocuments();
                break;
            case 'transfers':
                Model = Transfer;
                count = await Transfer.countDocuments();
                break;
            case 'ciusss':
                Model = CIUSSS;
                count = await CIUSSS.countDocuments();
                break;
            case 'hospitals':
                Model = Hospital;
                count = await Hospital.countDocuments();
                break;
        }

        if (count === 0) {
            console.log(`\n⚠️  No records in ${collectionName} collection.`);
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  WARNING: About to delete all records');
        console.log('='.repeat(80));
        console.log(`Collection: ${collectionName}`);
        console.log(`Number of records to delete: ${count}`);
        console.log('='.repeat(80));

        const confirm = await question(`\nAre you sure you want to delete ALL ${count} record(s) from ${collectionName}? (yes/no): `);

        if (!isConfirmed(confirm)) {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        const result = await Model.deleteMany({});
        console.log(`\n✅ Successfully deleted ${result.deletedCount} record(s) from ${collectionName}`);

        return true;
    } catch (error) {
        console.error('\n❌ Error clearing collection:', error.message);
        throw error;
    }
}

async function clearAllData() {
    try {
        await ensureConnection();

        // Get all collections from the database
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('\n⚠️  Database has no collections.');
            return false;
        }

        // Count documents in each collection
        const collectionStats = [];
        let totalDocuments = 0;

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            // Skip system collections
            if (collectionName.startsWith('system.')) {
                continue;
            }

            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();

            if (count > 0) {
                collectionStats.push({ name: collectionName, count });
                totalDocuments += count;
            }
        }

        if (totalDocuments === 0) {
            console.log('\n⚠️  Database is already empty.');
            return false;
        }

        console.log('\n' + '='.repeat(80));
        console.log('⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️');
        console.log('='.repeat(80));
        console.log('This will DELETE ALL DATA from ALL COLLECTIONS in the database!');
        console.log('\nCollections and records to be deleted:');
        collectionStats.forEach(stat => {
            console.log(`  ${stat.name}: ${stat.count} record(s)`);
        });
        console.log(`\n  TOTAL: ${totalDocuments} records across ${collectionStats.length} collection(s)`);
        console.log('='.repeat(80));

        const confirm1 = await question('\n⚠️  Are you ABSOLUTELY SURE? Type "DELETE ALL" to confirm: ');

        if (confirm1 !== 'DELETE ALL') {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        const confirm2 = await question('\n⚠️  Final confirmation. Type "YES" to proceed: ');

        if (confirm2.trim().toUpperCase() !== 'YES') {
            console.log('❌ Deletion cancelled.');
            return false;
        }

        console.log('\n🗑️  Deleting all data from all collections...');

        // Delete all documents from each collection
        const deleteResults = [];
        for (const stat of collectionStats) {
            const collection = db.collection(stat.name);
            const result = await collection.deleteMany({});
            deleteResults.push({ name: stat.name, deletedCount: result.deletedCount });
        }

        console.log(`\n✅ Successfully deleted all data:`);
        deleteResults.forEach(result => {
            console.log(`  ${result.name}: ${result.deletedCount} record(s) deleted`);
        });

        const totalDeleted = deleteResults.reduce((sum, r) => sum + r.deletedCount, 0);
        console.log(`\n  TOTAL: ${totalDeleted} record(s) deleted from ${deleteResults.length} collection(s)`);

        return true;
    } catch (error) {
        console.error('\n❌ Error clearing all data:', error.message);
        throw error;
    }
}

async function showOverallStatistics() {
    try {
        await ensureConnection();
        const client = new MongoClient(currentMongoUri);
        await client.connect();
        const db = client.db();

        const userCount = await User.countDocuments();
        const transferCount = await Transfer.countDocuments();
        const ciusssCount = await CIUSSS.countDocuments();
        const hospitalCount = await Hospital.countDocuments();

        let dbStats = null;
        try {
            dbStats = await db.stats();
        } catch (err) {
            // Stats might not be available
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 OVERALL DATABASE STATISTICS');
        console.log('='.repeat(80));
        console.log(`Database: ${db.databaseName}`);
        console.log(`Environment: ${currentDbEnv}`);
        console.log('\nCollection Counts:');
        console.log(`  👥 Users: ${userCount}`);
        console.log(`  🚑 Transfers: ${transferCount}`);
        console.log(`  🏛️  CIUSSS: ${ciusssCount}`);
        console.log(`  🏥 Hospitals: ${hospitalCount}`);
        console.log(`  📊 Total Records: ${userCount + transferCount + ciusssCount + hospitalCount}`);

        if (dbStats) {
            console.log('\nDatabase Size:');
            console.log(`  Data Size: ${Math.round(dbStats.dataSize / 1024 / 1024)} MB`);
            console.log(`  Storage Size: ${Math.round(dbStats.storageSize / 1024 / 1024)} MB`);
            console.log(`  Indexes: ${dbStats.indexes}`);
            console.log(`  Collections: ${dbStats.collections}`);
        }

        console.log('='.repeat(80) + '\n');

        await client.close();
    } catch (error) {
        console.error('❌ Error getting overall statistics:', error.message);
        throw error;
    }
}

// ===== PERFORMANCE BENCHMARK FUNCTIONS =====

async function benchmarkQueryPerformance() {
    try {
        await ensureConnection();
        console.log('\n' + '='.repeat(80));
        console.log('⚡ QUERY PERFORMANCE BENCHMARK');
        console.log('='.repeat(80));

        const results = {
            find: [],
            count: [],
            aggregate: [],
            populate: []
        };

        // Benchmark: Simple find queries
        console.log('\n📊 Testing simple find queries...');
        for (let i = 0; i < 5; i++) {
            const start = Date.now();
            await User.find({}).limit(10).lean();
            results.find.push(Date.now() - start);
        }
        const avgFind = results.find.reduce((a, b) => a + b, 0) / results.find.length;
        const minFind = Math.min(...results.find);
        const maxFind = Math.max(...results.find);

        // Benchmark: Count queries
        console.log('📊 Testing count queries...');
        for (let i = 0; i < 5; i++) {
            const start = Date.now();
            await User.countDocuments({});
            results.count.push(Date.now() - start);
        }
        const avgCount = results.count.reduce((a, b) => a + b, 0) / results.count.length;
        const minCount = Math.min(...results.count);
        const maxCount = Math.max(...results.count);

        // Benchmark: Aggregate queries
        console.log('📊 Testing aggregate queries...');
        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await User.aggregate([
                { $group: { _id: '$userType', count: { $sum: 1 } } }
            ]);
            results.aggregate.push(Date.now() - start);
        }
        const avgAggregate = results.aggregate.reduce((a, b) => a + b, 0) / results.aggregate.length;
        const minAggregate = Math.min(...results.aggregate);
        const maxAggregate = Math.max(...results.aggregate);

        // Benchmark: Populate queries (if transfers exist)
        const transferCount = await Transfer.countDocuments();
        if (transferCount > 0) {
            console.log('📊 Testing populate queries...');
            for (let i = 0; i < 3; i++) {
                const start = Date.now();
                await Transfer.find({}).limit(5).populate('requestedBy', 'firstName lastName').lean();
                results.populate.push(Date.now() - start);
            }
            const avgPopulate = results.populate.reduce((a, b) => a + b, 0) / results.populate.length;
            const minPopulate = Math.min(...results.populate);
            const maxPopulate = Math.max(...results.populate);

            console.log('\n📊 Query Performance Results:');
            console.log('='.repeat(80));
            console.log('Find Queries (5 runs):');
            console.log(`  Average: ${avgFind.toFixed(2)}ms`);
            console.log(`  Min: ${minFind}ms, Max: ${maxFind}ms`);
            console.log('\nCount Queries (5 runs):');
            console.log(`  Average: ${avgCount.toFixed(2)}ms`);
            console.log(`  Min: ${minCount}ms, Max: ${maxCount}ms`);
            console.log('\nAggregate Queries (3 runs):');
            console.log(`  Average: ${avgAggregate.toFixed(2)}ms`);
            console.log(`  Min: ${minAggregate}ms, Max: ${maxAggregate}ms`);
            console.log('\nPopulate Queries (3 runs):');
            console.log(`  Average: ${avgPopulate.toFixed(2)}ms`);
            console.log(`  Min: ${minPopulate}ms, Max: ${maxPopulate}ms`);
        } else {
            console.log('\n📊 Query Performance Results:');
            console.log('='.repeat(80));
            console.log('Find Queries (5 runs):');
            console.log(`  Average: ${avgFind.toFixed(2)}ms`);
            console.log(`  Min: ${minFind}ms, Max: ${maxFind}ms`);
            console.log('\nCount Queries (5 runs):');
            console.log(`  Average: ${avgCount.toFixed(2)}ms`);
            console.log(`  Min: ${minCount}ms, Max: ${maxCount}ms`);
            console.log('\nAggregate Queries (3 runs):');
            console.log(`  Average: ${avgAggregate.toFixed(2)}ms`);
            console.log(`  Min: ${minAggregate}ms, Max: ${maxAggregate}ms`);
            console.log('\n⚠️  Populate queries skipped (no transfers found)');
        }

        // Performance assessment
        console.log('\n📈 Performance Assessment:');
        console.log('='.repeat(80));
        const assessments = [];
        if (avgFind < 50) assessments.push('✅ Find queries: Excellent');
        else if (avgFind < 100) assessments.push('✅ Find queries: Good');
        else if (avgFind < 200) assessments.push('⚠️  Find queries: Acceptable');
        else assessments.push('❌ Find queries: Slow');

        if (avgCount < 30) assessments.push('✅ Count queries: Excellent');
        else if (avgCount < 100) assessments.push('✅ Count queries: Good');
        else if (avgCount < 200) assessments.push('⚠️  Count queries: Acceptable');
        else assessments.push('❌ Count queries: Slow');

        if (avgAggregate < 100) assessments.push('✅ Aggregate queries: Excellent');
        else if (avgAggregate < 200) assessments.push('✅ Aggregate queries: Good');
        else if (avgAggregate < 500) assessments.push('⚠️  Aggregate queries: Acceptable');
        else assessments.push('❌ Aggregate queries: Slow');

        assessments.forEach(assessment => console.log(`  ${assessment}`));
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error running query performance benchmark:', error.message);
        throw error;
    }
}

async function benchmarkWritePerformance() {
    try {
        await ensureConnection();
        console.log('\n' + '='.repeat(80));
        console.log('⚡ WRITE PERFORMANCE BENCHMARK');
        console.log('='.repeat(80));
        console.log('⚠️  This will create test records. They will be cleaned up after the test.');

        const confirm = await question('\nContinue with write performance test? (yes/no): ');
        if (!isConfirmed(confirm)) {
            console.log('❌ Benchmark cancelled.');
            return;
        }

        // Clean up any existing test records first
        console.log('\n🧹 Cleaning up any existing test records...');
        await User.deleteMany({ email: { $regex: /^test.*@benchmark\.test$/ } });

        const results = {
            insert: [],
            update: [],
            delete: []
        };

        // Benchmark: Insert operations
        console.log('\n📊 Testing insert operations...');

        for (let run = 0; run < 3; run++) {
            // Create fresh test users for each run with unique emails
            const testUsers = [];
            for (let i = 0; i < 10; i++) {
                testUsers.push({
                    userType: 'employee',
                    firstName: `Test${run}_${i}`,
                    lastName: `User${run}_${i}`,
                    email: `test${run}_${i}@benchmark.test`,
                    phone: `+1555${run}000${i}`,
                    password: 'test123456',
                    status: 'pending',
                    emailVerified: false,
                    phoneVerified: false,
                    documents: []
                });
            }

            const start = Date.now();
            await User.insertMany(testUsers);
            results.insert.push(Date.now() - start);
        }

        const avgInsert = results.insert.reduce((a, b) => a + b, 0) / results.insert.length;

        // Benchmark: Update operations
        console.log('📊 Testing update operations...');
        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await User.updateMany(
                { email: { $regex: /^test.*@benchmark\.test$/ } },
                { $set: { status: 'approved' } }
            );
            results.update.push(Date.now() - start);
        }
        const avgUpdate = results.update.reduce((a, b) => a + b, 0) / results.update.length;

        // Benchmark: Delete operations
        console.log('📊 Testing delete operations...');
        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            await User.deleteMany({ email: { $regex: /^test.*@benchmark\.test$/ } });
            results.delete.push(Date.now() - start);
        }
        const avgDelete = results.delete.reduce((a, b) => a + b, 0) / results.delete.length;

        console.log('\n📊 Write Performance Results:');
        console.log('='.repeat(80));
        console.log('Insert Operations (10 records, 3 runs):');
        console.log(`  Average: ${avgInsert.toFixed(2)}ms`);
        console.log(`  Per record: ${(avgInsert / 10).toFixed(2)}ms`);
        console.log('\nUpdate Operations (3 runs):');
        console.log(`  Average: ${avgUpdate.toFixed(2)}ms`);
        console.log('\nDelete Operations (3 runs):');
        console.log(`  Average: ${avgDelete.toFixed(2)}ms`);

        // Performance assessment
        console.log('\n📈 Performance Assessment:');
        console.log('='.repeat(80));
        const assessments = [];
        if (avgInsert < 100) assessments.push('✅ Insert operations: Excellent');
        else if (avgInsert < 200) assessments.push('✅ Insert operations: Good');
        else if (avgInsert < 500) assessments.push('⚠️  Insert operations: Acceptable');
        else assessments.push('❌ Insert operations: Slow');

        if (avgUpdate < 50) assessments.push('✅ Update operations: Excellent');
        else if (avgUpdate < 100) assessments.push('✅ Update operations: Good');
        else if (avgUpdate < 200) assessments.push('⚠️  Update operations: Acceptable');
        else assessments.push('❌ Update operations: Slow');

        if (avgDelete < 50) assessments.push('✅ Delete operations: Excellent');
        else if (avgDelete < 100) assessments.push('✅ Delete operations: Good');
        else if (avgDelete < 200) assessments.push('⚠️  Delete operations: Acceptable');
        else assessments.push('❌ Delete operations: Slow');

        assessments.forEach(assessment => console.log(`  ${assessment}`));
        console.log('='.repeat(80));

        // Cleanup any remaining test records
        await User.deleteMany({ email: { $regex: /^test.*@benchmark\.test$/ } });
        console.log('\n🧹 Cleaned up test records');

    } catch (error) {
        console.error('❌ Error running write performance benchmark:', error.message);
        // Cleanup on error
        try {
            await User.deleteMany({ email: { $regex: /^test.*@benchmark\.test$/ } });
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        throw error;
    }
}

async function benchmarkConnectionPerformance() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('⚡ CONNECTION PERFORMANCE BENCHMARK');
        console.log('='.repeat(80));

        const results = {
            connect: [],
            ping: [],
            disconnect: []
        };

        // Benchmark: Connection time
        console.log('\n📊 Testing connection performance...');
        for (let i = 0; i < 3; i++) {
            const testConn = mongoose.createConnection(currentMongoUri, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000
            });
            const start = Date.now();
            await testConn.asPromise();
            results.connect.push(Date.now() - start);

            // Benchmark: Ping time
            const pingStart = Date.now();
            await testConn.db.admin().ping();
            results.ping.push(Date.now() - pingStart);

            // Benchmark: Disconnect time
            const disconnectStart = Date.now();
            await testConn.close();
            results.disconnect.push(Date.now() - disconnectStart);
        }

        const avgConnect = results.connect.reduce((a, b) => a + b, 0) / results.connect.length;
        const avgPing = results.ping.reduce((a, b) => a + b, 0) / results.ping.length;
        const avgDisconnect = results.disconnect.reduce((a, b) => a + b, 0) / results.disconnect.length;

        console.log('\n📊 Connection Performance Results:');
        console.log('='.repeat(80));
        console.log('Connection Time (3 runs):');
        console.log(`  Average: ${avgConnect.toFixed(2)}ms`);
        console.log(`  Min: ${Math.min(...results.connect)}ms, Max: ${Math.max(...results.connect)}ms`);
        console.log('\nPing Latency (3 runs):');
        console.log(`  Average: ${avgPing.toFixed(2)}ms`);
        console.log(`  Min: ${Math.min(...results.ping)}ms, Max: ${Math.max(...results.ping)}ms`);
        console.log('\nDisconnect Time (3 runs):');
        console.log(`  Average: ${avgDisconnect.toFixed(2)}ms`);

        // Performance assessment
        console.log('\n📈 Performance Assessment:');
        console.log('='.repeat(80));
        const assessments = [];
        if (avgConnect < 500) assessments.push('✅ Connection time: Excellent');
        else if (avgConnect < 1000) assessments.push('✅ Connection time: Good');
        else if (avgConnect < 2000) assessments.push('⚠️  Connection time: Acceptable');
        else assessments.push('❌ Connection time: Slow');

        if (avgPing < 50) assessments.push('✅ Ping latency: Excellent');
        else if (avgPing < 100) assessments.push('✅ Ping latency: Good');
        else if (avgPing < 200) assessments.push('⚠️  Ping latency: Acceptable');
        else assessments.push('❌ Ping latency: Slow');

        assessments.forEach(assessment => console.log(`  ${assessment}`));
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error running connection performance benchmark:', error.message);
        throw error;
    }
}

async function benchmarkIndexPerformance() {
    try {
        await ensureConnection();
        console.log('\n' + '='.repeat(80));
        console.log('⚡ INDEX PERFORMANCE BENCHMARK');
        console.log('='.repeat(80));

        const client = new MongoClient(currentMongoUri);
        await client.connect();
        const db = client.db();

        console.log('\n📊 Analyzing indexes...');

        const collections = ['users', 'transfers', 'ciusss', 'hospitals'];
        const indexResults = {};

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);
                const indexes = await collection.indexes();
                const stats = await collection.stats();

                indexResults[collectionName] = {
                    indexCount: indexes.length,
                    indexSize: stats.totalIndexSize || 0,
                    indexDetails: indexes.map(idx => ({
                        name: idx.name,
                        keys: Object.keys(idx.key).join(', ')
                    }))
                };
            } catch (err) {
                indexResults[collectionName] = { error: err.message };
            }
        }

        await client.close();

        console.log('\n📊 Index Analysis Results:');
        console.log('='.repeat(80));

        for (const [collectionName, data] of Object.entries(indexResults)) {
            if (data.error) {
                console.log(`\n${collectionName}: ❌ Error - ${data.error}`);
                continue;
            }

            console.log(`\n${collectionName}:`);
            console.log(`  Total Indexes: ${data.indexCount}`);
            console.log(`  Index Size: ${Math.round(data.indexSize / 1024)} KB`);
            console.log(`  Indexes:`);
            data.indexDetails.forEach(idx => {
                console.log(`    - ${idx.name}: [${idx.keys}]`);
            });
        }

        // Benchmark: Query with and without index
        console.log('\n📊 Testing indexed vs non-indexed queries...');
        const userCount = await User.countDocuments();

        if (userCount > 0) {
            // Query with index (email is indexed)
            const indexedStart = Date.now();
            await User.findOne({ email: 'nonexistent@test.com' }).lean();
            const indexedTime = Date.now() - indexedStart;

            // Query without index (if possible)
            const nonIndexedStart = Date.now();
            await User.findOne({ firstName: 'NonexistentName12345' }).lean();
            const nonIndexedTime = Date.now() - nonIndexedStart;

            console.log('\nQuery Performance Comparison:');
            console.log('='.repeat(80));
            console.log(`Indexed query (email): ${indexedTime}ms`);
            console.log(`Non-indexed query (firstName): ${nonIndexedTime}ms`);
            if (indexedTime < nonIndexedTime) {
                console.log(`✅ Index provides ${((nonIndexedTime - indexedTime) / nonIndexedTime * 100).toFixed(1)}% improvement`);
            } else {
                console.log(`⚠️  Index performance similar to non-indexed query`);
            }
        } else {
            console.log('\n⚠️  Skipping query comparison (no users in database)');
        }

        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error running index performance benchmark:', error.message);
        throw error;
    }
}

async function runFullPerformanceBenchmark() {
    try {
        await ensureConnection();
        console.log('\n' + '='.repeat(80));
        console.log('⚡ FULL PERFORMANCE BENCHMARK SUITE');
        console.log('='.repeat(80));
        console.log('This will run all performance tests. This may take a few minutes.');

        const confirm = await question('\nContinue with full benchmark suite? (yes/no): ');
        if (!isConfirmed(confirm)) {
            console.log('❌ Benchmark cancelled.');
            return;
        }

        const startTime = Date.now();

        console.log('\n' + '='.repeat(80));
        console.log('1/4 Running Connection Performance Benchmark...');
        console.log('='.repeat(80));
        await benchmarkConnectionPerformance();

        console.log('\n' + '='.repeat(80));
        console.log('2/4 Running Query Performance Benchmark...');
        console.log('='.repeat(80));
        await benchmarkQueryPerformance();

        console.log('\n' + '='.repeat(80));
        console.log('3/4 Running Write Performance Benchmark...');
        console.log('='.repeat(80));
        await benchmarkWritePerformance();

        console.log('\n' + '='.repeat(80));
        console.log('4/4 Running Index Performance Benchmark...');
        console.log('='.repeat(80));
        await benchmarkIndexPerformance();

        const totalTime = Date.now() - startTime;

        console.log('\n' + '='.repeat(80));
        console.log('✅ FULL BENCHMARK SUITE COMPLETED');
        console.log('='.repeat(80));
        console.log(`Total execution time: ${(totalTime / 1000).toFixed(2)} seconds`);
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error running full performance benchmark:', error.message);
        throw error;
    }
}

// ===== MAIN MENU FUNCTIONS =====

async function displayMainMenu() {
    const dbName = getDatabaseName(currentMongoUri);

    console.log('\n' + '='.repeat(80));
    console.log('🗄️  DATABASE MANAGEMENT SYSTEM');
    console.log('='.repeat(80));
    console.log(`Current Database: ${dbName} (${currentDbEnv})`);
    console.log('='.repeat(80));
    console.log('1. Database Connection & Environment');
    console.log('2. User Management');
    console.log('3. Transfer Management');
    console.log('4. CIUSSS Management');
    console.log('5. Hospital Management');
    console.log('6. Data Operations');
    console.log('7. Statistics & Reports');
    console.log('8. Performance Benchmarks');
    console.log('0. Exit');
    console.log('='.repeat(80));
}

async function handleDatabaseMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('🔌 DATABASE CONNECTION & ENVIRONMENT');
        console.log('='.repeat(80));
        console.log('1. Show database information');
        console.log('2. Select database environment');
        console.log('3. Test database connection');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await showDatabaseInfo();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                await selectDatabaseEnvironment();
                await question('\nPress Enter to continue...');
                break;
            case '3':
                await testDatabaseConnection();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handleUserMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('👥 USER MANAGEMENT');
        console.log('='.repeat(80));
        console.log('1. List all users');
        console.log('2. List users by type');
        console.log('3. Create new user');
        console.log('4. Delete user by ID');
        console.log('5. Delete users by type');
        console.log('6. Show user statistics');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await listAllUsers();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                console.log('\nUser Types:');
                console.log('1. employee');
                console.log('2. manager');
                console.log('3. admin');
                console.log('4. super_admin');
                const typeChoice = await question('\nSelect user type (1-4 or type name): ');
                let userType;
                if (typeChoice === '1') userType = 'employee';
                else if (typeChoice === '2') userType = 'manager';
                else if (typeChoice === '3') userType = 'admin';
                else if (typeChoice === '4') userType = 'super_admin';
                else userType = typeChoice.trim().toLowerCase();
                await listUsersByType(userType);
                await question('\nPress Enter to continue...');
                break;
            case '3':
                await createUser();
                await question('\nPress Enter to continue...');
                break;
            case '4':
                const userId = await question('\nEnter user ID to delete: ');
                await deleteUserById(userId.trim());
                await question('\nPress Enter to continue...');
                break;
            case '5':
                console.log('\nUser Types:');
                console.log('1. employee');
                console.log('2. manager');
                console.log('3. admin');
                console.log('4. super_admin');
                const deleteTypeChoice = await question('\nSelect user type to delete (1-4 or type name): ');
                let deleteUserType;
                if (deleteTypeChoice === '1') deleteUserType = 'employee';
                else if (deleteTypeChoice === '2') deleteUserType = 'manager';
                else if (deleteTypeChoice === '3') deleteUserType = 'admin';
                else if (deleteTypeChoice === '4') deleteUserType = 'super_admin';
                else deleteUserType = deleteTypeChoice.trim().toLowerCase();
                await deleteUsersByType(deleteUserType);
                await question('\nPress Enter to continue...');
                break;
            case '6':
                await showUserStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handleTransferMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('🚑 TRANSFER MANAGEMENT');
        console.log('='.repeat(80));
        console.log('1. List all transfers');
        console.log('2. List transfers by status');
        console.log('3. List transfers by priority');
        console.log('4. View transfer details');
        console.log('5. Delete transfer by ID');
        console.log('6. Delete transfers by status');
        console.log('7. Show transfer statistics');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await listAllTransfers();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                console.log('\nStatus options:');
                console.log('1. pending');
                console.log('2. accepted');
                console.log('3. in_progress');
                console.log('4. completed');
                console.log('5. cancelled');
                const statusChoice = await question('\nSelect status (1-5 or status name): ');
                let status;
                if (statusChoice === '1') status = 'pending';
                else if (statusChoice === '2') status = 'accepted';
                else if (statusChoice === '3') status = 'in_progress';
                else if (statusChoice === '4') status = 'completed';
                else if (statusChoice === '5') status = 'cancelled';
                else status = statusChoice.trim().toLowerCase();
                await listTransfersByStatus(status);
                await question('\nPress Enter to continue...');
                break;
            case '3':
                console.log('\nPriority options:');
                console.log('1. low');
                console.log('2. medium');
                console.log('3. high');
                console.log('4. urgent');
                const priorityChoice = await question('\nSelect priority (1-4 or priority name): ');
                let priority;
                if (priorityChoice === '1') priority = 'low';
                else if (priorityChoice === '2') priority = 'medium';
                else if (priorityChoice === '3') priority = 'high';
                else if (priorityChoice === '4') priority = 'urgent';
                else priority = priorityChoice.trim().toLowerCase();
                await listTransfersByPriority(priority);
                await question('\nPress Enter to continue...');
                break;
            case '4':
                const transferId = await question('\nEnter transfer ID: ');
                await viewTransferDetails(transferId.trim());
                await question('\nPress Enter to continue...');
                break;
            case '5':
                const deleteTransferId = await question('\nEnter transfer ID to delete: ');
                await deleteTransferById(deleteTransferId.trim());
                await question('\nPress Enter to continue...');
                break;
            case '6':
                console.log('\nStatus options:');
                console.log('1. pending');
                console.log('2. accepted');
                console.log('3. in_progress');
                console.log('4. completed');
                console.log('5. cancelled');
                const deleteStatusChoice = await question('\nSelect status to delete (1-5 or status name): ');
                let deleteStatus;
                if (deleteStatusChoice === '1') deleteStatus = 'pending';
                else if (deleteStatusChoice === '2') deleteStatus = 'accepted';
                else if (deleteStatusChoice === '3') deleteStatus = 'in_progress';
                else if (deleteStatusChoice === '4') deleteStatus = 'completed';
                else if (deleteStatusChoice === '5') deleteStatus = 'cancelled';
                else deleteStatus = deleteStatusChoice.trim().toLowerCase();
                await deleteTransfersByStatus(deleteStatus);
                await question('\nPress Enter to continue...');
                break;
            case '7':
                await showTransferStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handleCIUSSSMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('🏛️  CIUSSS MANAGEMENT');
        console.log('='.repeat(80));
        console.log('1. List all CIUSSS records');
        console.log('2. Seed CIUSSS data');
        console.log('3. Clear CIUSSS data');
        console.log('4. Show CIUSSS statistics');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await listAllCIUSSS();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                await seedCIUSSS();
                await question('\nPress Enter to continue...');
                break;
            case '3':
                await clearCIUSSS();
                await question('\nPress Enter to continue...');
                break;
            case '4':
                await showCIUSSSStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handleHospitalMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('🏥 HOSPITAL MANAGEMENT');
        console.log('='.repeat(80));
        console.log('1. List all hospitals');
        console.log('2. List hospitals by organization');
        console.log('3. Seed hospital data');
        console.log('4. Clear hospital data');
        console.log('5. Show hospital statistics');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await listAllHospitals();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                await listHospitalsByOrganization();
                await question('\nPress Enter to continue...');
                break;
            case '3':
                await seedHospitals();
                await question('\nPress Enter to continue...');
                break;
            case '4':
                await clearHospitals();
                await question('\nPress Enter to continue...');
                break;
            case '5':
                await showHospitalStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handleDataOperationsMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('🗑️  DATA OPERATIONS');
        console.log('='.repeat(80));
        console.log('1. Clear specific collection');
        console.log('2. Clear all data (⚠️  DANGEROUS)');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                console.log('\nCollections:');
                console.log('1. users');
                console.log('2. transfers');
                console.log('3. ciusss');
                console.log('4. hospitals');
                const collChoice = await question('\nSelect collection to clear (1-4 or name): ');
                let collectionName;
                if (collChoice === '1') collectionName = 'users';
                else if (collChoice === '2') collectionName = 'transfers';
                else if (collChoice === '3') collectionName = 'ciusss';
                else if (collChoice === '4') collectionName = 'hospitals';
                else collectionName = collChoice.trim().toLowerCase();
                await clearCollection(collectionName);
                await question('\nPress Enter to continue...');
                break;
            case '2':
                await clearAllData();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handleStatisticsMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 STATISTICS & REPORTS');
        console.log('='.repeat(80));
        console.log('1. Overall database statistics');
        console.log('2. User statistics');
        console.log('3. Transfer statistics');
        console.log('4. CIUSSS statistics');
        console.log('5. Hospital statistics');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await showOverallStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                await showUserStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '3':
                await showTransferStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '4':
                await showCIUSSSStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '5':
                await showHospitalStatistics();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

async function handlePerformanceMenu() {
    while (true) {
        console.log('\n' + '='.repeat(80));
        console.log('⚡ PERFORMANCE BENCHMARKS');
        console.log('='.repeat(80));
        console.log('1. Query performance benchmark');
        console.log('2. Write performance benchmark');
        console.log('3. Connection performance benchmark');
        console.log('4. Index performance benchmark');
        console.log('5. Run full benchmark suite');
        console.log('0. Back to main menu');
        console.log('='.repeat(80));

        const choice = await question('\nSelect an option: ');

        switch (choice.trim()) {
            case '1':
                await benchmarkQueryPerformance();
                await question('\nPress Enter to continue...');
                break;
            case '2':
                await benchmarkWritePerformance();
                await question('\nPress Enter to continue...');
                break;
            case '3':
                await benchmarkConnectionPerformance();
                await question('\nPress Enter to continue...');
                break;
            case '4':
                await benchmarkIndexPerformance();
                await question('\nPress Enter to continue...');
                break;
            case '5':
                await runFullPerformanceBenchmark();
                await question('\nPress Enter to continue...');
                break;
            case '0':
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
                await question('\nPress Enter to continue...');
        }
    }
}

// ===== MAIN FUNCTION =====

async function main() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🗄️  COMPREHENSIVE DATABASE MANAGEMENT SYSTEM');
        console.log('='.repeat(80));
        console.log('Connecting to database...');

        await mongoose.connect(currentMongoUri);
        const dbName = mongoose.connection.name;
        console.log(`✅ Connected to database: ${dbName} (${currentDbEnv})`);

        let running = true;

        while (running) {
            await displayMainMenu();

            const choice = await question('\nSelect an option: ');

            switch (choice.trim()) {
                case '1':
                    await handleDatabaseMenu();
                    break;
                case '2':
                    await handleUserMenu();
                    break;
                case '3':
                    await handleTransferMenu();
                    break;
                case '4':
                    await handleCIUSSSMenu();
                    break;
                case '5':
                    await handleHospitalMenu();
                    break;
                case '6':
                    await handleDataOperationsMenu();
                    break;
                case '7':
                    await handleStatisticsMenu();
                    break;
                case '8':
                    await handlePerformanceMenu();
                    break;
                case '0':
                    running = false;
                    console.log('\n👋 Goodbye!');
                    break;
                default:
                    console.log('\n❌ Invalid option. Please try again.');
                    await question('\nPress Enter to continue...');
            }
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    listAllUsers,
    listUsersByType,
    createUser,
    deleteUserById,
    deleteUsersByType,
    showUserStatistics,
    listAllTransfers,
    listTransfersByStatus,
    listTransfersByPriority,
    viewTransferDetails,
    deleteTransferById,
    deleteTransfersByStatus,
    showTransferStatistics,
    listAllCIUSSS,
    seedCIUSSS,
    clearCIUSSS,
    showCIUSSSStatistics,
    listAllHospitals,
    listHospitalsByOrganization,
    seedHospitals,
    clearHospitals,
    showHospitalStatistics,
    clearCollection,
    clearAllData,
    showOverallStatistics
};

