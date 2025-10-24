#!/usr/bin/env node

/**
 * Migration Script for API Routes
 * 
 * Automatically updates all API routes to use the new DatabaseService
 * instead of the legacy dbConnect() approach.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_DIR = 'src/app/api';

// Recursive function to find all route files
function findRouteFiles(dir) {
    const files = [];

    try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...findRouteFiles(fullPath));
            } else if (item === 'route.ts' || item === 'route.js') {
                files.push(fullPath);
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    }

    return files;
}

// Import patterns to replace
const IMPORT_REPLACEMENTS = [
    {
        from: /import dbConnect from ['"]@\/lib\/database\/mongoose['"];?\s*/g,
        to: ''
    },
    {
        from: /import.*from ['"]@\/lib\/database\/models['"];?\s*/g,
        to: ''
    },
    {
        from: /import\s+{\s*([^}]+)\s*}\s+from\s+['"]@\/models\/([^'"]+)['"];?\s*/g,
        to: (match, imports, modelName) => {
            // This will be handled by the main import replacement
            return '';
        }
    }
];

// Function call replacements
const FUNCTION_REPLACEMENTS = [
    {
        from: /await dbConnect\(\);?\s*/g,
        to: '// DatabaseService handles connection automatically\n'
    },
    {
        from: /\.find\(([^)]+)\)\s*\.populate\(([^)]+)\)\s*\.sort\(([^)]+)\)\s*\.skip\(([^)]+)\)\s*\.limit\(([^)]+)\)/g,
        to: (match, query, populate, sort, skip, limit) => {
            return `DatabaseService.findMany(Model, ${query}, {
        populate: ${populate},
        sort: ${sort},
        skip: ${skip},
        limit: ${limit}
      })`;
        }
    },
    {
        from: /\.find\(([^)]+)\)\s*\.populate\(([^)]+)\)\s*\.sort\(([^)]+)\)/g,
        to: (match, query, populate, sort) => {
            return `DatabaseService.findMany(Model, ${query}, {
        populate: ${populate},
        sort: ${sort}
      })`;
        }
    },
    {
        from: /\.findById\(([^)]+)\)\s*\.populate\(([^)]+)\)/g,
        to: (match, id, populate) => {
            return `DatabaseService.findById(Model, ${id}, {
        populate: ${populate}
      })`;
        }
    },
    {
        from: /\.findOne\(([^)]+)\)/g,
        to: (match, query) => {
            return `DatabaseService.findOne(Model, ${query})`;
        }
    },
    {
        from: /\.countDocuments\(([^)]+)\)/g,
        to: (match, query) => {
            return `DatabaseService.count(Model, ${query})`;
        }
    },
    {
        from: /new Model\(([^)]+)\)/g,
        to: (match, data) => {
            return `DatabaseService.create(Model, ${data})`;
        }
    },
    {
        from: /\.save\(\)/g,
        to: ''
    }
];

// Add DatabaseService import
function addDatabaseServiceImport(content) {
    // Check if DatabaseService is already imported
    if (content.includes('DatabaseService')) {
        return content;
    }

    // Find the first import statement
    const importMatch = content.match(/^import.*from.*['"];?\s*/m);
    if (importMatch) {
        const insertIndex = importMatch.index + importMatch[0].length;
        return content.slice(0, insertIndex) +
            "import { DatabaseService } from '@/lib/database';\n" +
            content.slice(insertIndex);
    }

    // If no imports found, add at the beginning
    return "import { DatabaseService } from '@/lib/database';\n" + content;
}

// Process a single file
function processFile(filePath) {
    console.log(`Processing: ${filePath}`);

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Skip if already processed
        if (content.includes('DatabaseService')) {
            console.log(`  Skipping: Already uses DatabaseService`);
            return;
        }

        // Apply import replacements
        for (const replacement of IMPORT_REPLACEMENTS) {
            if (replacement.from.test(content)) {
                content = content.replace(replacement.from, replacement.to);
                modified = true;
            }
        }

        // Apply function replacements
        for (const replacement of FUNCTION_REPLACEMENTS) {
            if (replacement.from.test(content)) {
                content = content.replace(replacement.from, replacement.to);
                modified = true;
            }
        }

        // Add DatabaseService import if needed
        if (modified) {
            content = addDatabaseServiceImport(content);
        }

        // Write back if modified
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  ✅ Updated: ${filePath}`);
        } else {
            console.log(`  ⏭️  No changes needed: ${filePath}`);
        }

    } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
}

// Main execution
function main() {
    console.log('🔄 Starting API routes migration...\n');

    // Find all route files
    const files = findRouteFiles(API_DIR);

    console.log(`Found ${files.length} route files to process\n`);

    // Process each file
    for (const file of files) {
        processFile(file);
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📝 Manual review required for:');
    console.log('  - Complex queries that need custom DatabaseService methods');
    console.log('  - Transaction operations');
    console.log('  - Model-specific operations');
    console.log('  - Error handling adjustments');
}

// Run the migration
if (require.main === module) {
    main();
}

module.exports = { processFile, addDatabaseServiceImport };
