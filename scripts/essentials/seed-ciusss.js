const mongoose = require('mongoose');
require('dotenv').config({ path: '../../.env.local' });

// Fallback to direct environment variable
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://arselene:1N0Z11AyVoDqdI1A@cluster0.ym7agwh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
console.log('MONGODB_URI:', mongoUri ? 'Found' : 'Not found');

// CIUSSS data from the original formConfig
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

async function seedCIUSSS() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Import the CIUSSS model
        const { CIUSSS } = require('../../src/models/CIUSSS');

        // Clear existing CIUSSS data
        console.log('🗑️ Clearing existing CIUSSS data...');
        await CIUSSS.deleteMany({});
        console.log('✅ Cleared existing CIUSSS data');

        // Insert new CIUSSS data
        console.log('🌱 Seeding CIUSSS data...');
        const insertedCIUSSS = await CIUSSS.insertMany(CIUSSS_DATA);
        console.log(`✅ Inserted ${insertedCIUSSS.length} CIUSSS records`);

        // Display the results
        console.log('\n📋 CIUSSS Records:');
        insertedCIUSSS.forEach(ciusss => {
            console.log(`  ${ciusss.code}: ${ciusss.name}`);
        });

        console.log('\n🎉 CIUSSS seeding completed successfully!');

    } catch (error) {
        console.error('❌ Error seeding CIUSSS:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the seeding function
seedCIUSSS();
