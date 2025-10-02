#!/usr/bin/env node

/**
 * Script to seed the database with Montreal hospitals data
 * Usage: node scripts/seed-hospitals.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/patients_management';

// Hospital schema
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

const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);

// Montreal hospitals data
const hospitalsData = [
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

async function seedHospitals() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing hospitals
        console.log('🗑️  Clearing existing hospitals...');
        await Hospital.deleteMany({});
        console.log('✅ Existing hospitals cleared');

        // Insert new hospitals
        console.log(`🏥 Inserting ${hospitalsData.length} hospitals...`);
        const insertedHospitals = await Hospital.insertMany(hospitalsData);
        console.log(`✅ Successfully inserted ${insertedHospitals.length} hospitals`);

        // Display summary by organization
        const summary = await Hospital.aggregate([
            {
                $group: {
                    _id: {
                        type: '$organization.type',
                        name: '$organization.name'
                    },
                    count: { $sum: 1 },
                    hospitals: { $push: '$name' }
                }
            },
            {
                $sort: { '_id.type': 1, '_id.name': 1 }
            }
        ]);

        console.log('\n📊 Hospital Summary by Organization:');
        summary.forEach(org => {
            console.log(`\n${org._id.type}: ${org._id.name}`);
            console.log(`   Count: ${org.count} hospitals`);
            org.hospitals.forEach(hospital => {
                console.log(`   - ${hospital}`);
            });
        });

        console.log(`\n🎉 Hospital seeding completed successfully!`);
        console.log(`📈 Total hospitals: ${insertedHospitals.length}`);

    } catch (error) {
        console.error('❌ Error seeding hospitals:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Database connection closed');
    }
}

// Run the script
seedHospitals().catch(console.error);
