const fetch = require('node-fetch');

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
        console.log('🌱 Seeding CIUSSS data via API...');

        let successCount = 0;
        let errorCount = 0;

        for (const ciusssData of CIUSSS_DATA) {
            try {
                const response = await fetch('http://localhost:3000/api/ciusss', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(ciusssData)
                });

                const result = await response.json();

                if (result.success) {
                    console.log(`✅ Created: ${ciusssData.code} - ${ciusssData.name}`);
                    successCount++;
                } else {
                    console.log(`⚠️  Skipped: ${ciusssData.code} - ${result.message}`);
                }
            } catch (error) {
                console.log(`❌ Error creating ${ciusssData.code}: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`\n📊 Results:`);
        console.log(`  ✅ Successfully created: ${successCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📝 Total processed: ${CIUSSS_DATA.length}`);

        if (successCount > 0) {
            console.log('\n🎉 CIUSSS seeding completed successfully!');
        }

    } catch (error) {
        console.error('❌ Error seeding CIUSSS:', error);
        process.exit(1);
    }
}

// Run the seeding function
seedCIUSSS();
