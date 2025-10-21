#!/usr/bin/env node

/**
 * Fix Admin API Routes Script
 * 
 * This script fixes all admin API routes that are incorrectly using requireManager()
 * instead of requireAdmin().
 */

const fs = require('fs');
const path = require('path');

const adminApiFiles = [
    'src/app/api/admin/transfers/[id]/route.ts',
    'src/app/api/admin/transfers/[id]/actions/route.ts',
    'src/app/api/admin/transfers/route.ts',
    'src/app/api/admin/users/stats/route.ts',
    'src/app/api/admin/transfers/analytics/route.ts',
    'src/app/api/admin/monitoring/test-sse/route.ts',
    'src/app/api/admin/monitoring/sse/route.ts',
    'src/app/api/admin/monitoring/sse-stats/route.ts',
    'src/app/api/admin/monitoring/api/route.ts',
    'src/app/api/admin/monitoring/clear-sse/route.ts',
    'src/app/api/admin/monitoring/system-health/route.ts',
    'src/app/api/admin/monitoring/errors/route.ts',
    'src/app/api/admin/monitoring/database/route.ts',
    'src/app/api/admin/monitoring/system/route.ts'
];

function fixAdminApiFile(filePath) {
    try {
        const fullPath = path.join(process.cwd(), filePath);

        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  File not found: ${filePath}`);
            return false;
        }

        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        // Fix import statement
        if (content.includes("import { requireManager,")) {
            content = content.replace(
                "import { requireManager,",
                "import { requireAdmin,"
            );
            modified = true;
            console.log(`✅ Fixed import in ${filePath}`);
        }

        // Fix function calls
        if (content.includes("await requireManager()")) {
            content = content.replace(/await requireManager\(\)/g, "await requireAdmin()");
            modified = true;
            console.log(`✅ Fixed function calls in ${filePath}`);
        }

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Successfully updated ${filePath}`);
            return true;
        } else {
            console.log(`ℹ️  No changes needed for ${filePath}`);
            return false;
        }

    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function main() {
    console.log('🔧 Fixing Admin API Routes...\n');

    let fixedCount = 0;

    adminApiFiles.forEach(filePath => {
        if (fixAdminApiFile(filePath)) {
            fixedCount++;
        }
    });

    console.log(`\n🏁 Fixed ${fixedCount} out of ${adminApiFiles.length} files`);

    if (fixedCount > 0) {
        console.log('\n✅ All admin API routes have been updated to use requireAdmin() instead of requireManager()');
    }
}

main();
