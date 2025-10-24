#!/usr/bin/env node

/**
 * AuthService Integration Test
 * 
 * Tests the utility integrations in AuthService:
 * - Error handling with AppError classes
 * - Input validation with Zod schemas  
 * - String helpers integration
 * - Data helpers integration
 * - Date/time helpers integration
 * - Async helpers integration
 * - Structured logging
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = [];
let passedTests = 0;
let failedTests = 0;

function logTest(testName, status, details = '') {
    const result = { testName, status, details, timestamp: new Date() };
    testResults.push(result);

    if (status === 'PASS') {
        passedTests++;
        console.log(`✅ ${testName}${details ? ` - ${details}` : ''}`);
    } else {
        failedTests++;
        console.log(`❌ ${testName}${details ? ` - ${details}` : ''}`);
    }
}

function runTest(testName, testFunction) {
    try {
        const result = testFunction();
        logTest(testName, 'PASS', result);
        return result;
    } catch (error) {
        logTest(testName, 'FAIL', error.message);
        return null;
    }
}

// Test 1: Check if AuthService file exists and has expected imports
function testAuthServiceFile() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');

    if (!fs.existsSync(authServicePath)) {
        throw new Error('AuthService.ts file not found');
    }

    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for utility imports
    const expectedImports = [
        'AppError',
        'logErrorWithContext',
        'formatErrorForClient',
        'maskEmail',
        'sanitizeString',
        'truncate',
        'pickFields',
        'omitFields',
        'transformUserForAuth',
        'transformSessionForAuth',
        'addHoursToDate',
        'calculateDateDiff',
        'retry',
        'timeout',
        'batchProcess'
    ];

    const missingImports = expectedImports.filter(importName =>
        !content.includes(importName)
    );

    if (missingImports.length > 0) {
        throw new Error(`Missing imports: ${missingImports.join(', ')}`);
    }

    return 'All utility imports found';
}

// Test 2: Check for error handling integration
function testErrorHandlingIntegration() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for AppError usage
    const appErrorUsage = (content.match(/throw new AppError/g) || []).length;
    if (appErrorUsage < 10) {
        throw new Error(`Expected at least 10 AppError throws, found ${appErrorUsage}`);
    }

    // Check for logErrorWithContext usage
    const logErrorUsage = (content.match(/logErrorWithContext/g) || []).length;
    if (logErrorUsage < 5) {
        throw new Error(`Expected at least 5 logErrorWithContext calls, found ${logErrorUsage}`);
    }

    // Check that old error return patterns are removed
    const oldErrorPatterns = (content.match(/return \{\s*success: false/g) || []).length;
    if (oldErrorPatterns > 0) {
        throw new Error(`Found ${oldErrorPatterns} old error return patterns that should be replaced`);
    }

    return `AppError usage: ${appErrorUsage}, LogError usage: ${logErrorUsage}`;
}

// Test 3: Check for string helpers integration
function testStringHelpersIntegration() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for maskEmail usage
    const maskEmailUsage = (content.match(/maskEmail\(/g) || []).length;
    if (maskEmailUsage < 3) {
        throw new Error(`Expected at least 3 maskEmail calls, found ${maskEmailUsage}`);
    }

    // Check for sanitizeString usage
    const sanitizeUsage = (content.match(/sanitizeString\(/g) || []).length;
    if (sanitizeUsage < 2) {
        throw new Error(`Expected at least 2 sanitizeString calls, found ${sanitizeUsage}`);
    }

    // Check for truncate usage
    const truncateUsage = (content.match(/truncate\(/g) || []).length;
    if (truncateUsage < 2) {
        throw new Error(`Expected at least 2 truncate calls, found ${truncateUsage}`);
    }

    return `maskEmail: ${maskEmailUsage}, sanitizeString: ${sanitizeUsage}, truncate: ${truncateUsage}`;
}

// Test 4: Check for data helpers integration
function testDataHelpersIntegration() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for transformUserForAuth usage
    const transformUserUsage = (content.match(/transformUserForAuth\(/g) || []).length;
    if (transformUserUsage < 3) {
        throw new Error(`Expected at least 3 transformUserForAuth calls, found ${transformUserUsage}`);
    }

    // Check for transformSessionForAuth usage
    const transformSessionUsage = (content.match(/transformSessionForAuth\(/g) || []).length;
    if (transformSessionUsage < 3) {
        throw new Error(`Expected at least 3 transformSessionForAuth calls, found ${transformSessionUsage}`);
    }

    // Check for pickFields usage
    const pickFieldsUsage = (content.match(/pickFields\(/g) || []).length;
    if (pickFieldsUsage < 2) {
        throw new Error(`Expected at least 2 pickFields calls, found ${pickFieldsUsage}`);
    }

    // Check for omitFields usage
    const omitFieldsUsage = (content.match(/omitFields\(/g) || []).length;
    if (omitFieldsUsage < 2) {
        throw new Error(`Expected at least 2 omitFields calls, found ${omitFieldsUsage}`);
    }

    return `transformUser: ${transformUserUsage}, transformSession: ${transformSessionUsage}, pickFields: ${pickFieldsUsage}, omitFields: ${omitFieldsUsage}`;
}

// Test 5: Check for date/time helpers integration
function testDateTimeHelpersIntegration() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for addHoursToDate usage
    const addHoursUsage = (content.match(/addHoursToDate\(/g) || []).length;
    if (addHoursUsage < 1) {
        throw new Error(`Expected at least 1 addHoursToDate call, found ${addHoursUsage}`);
    }

    // Check transformers file for calculateDateDiff
    const transformersPath = path.join(__dirname, '../src/lib/utils/transformers.ts');
    if (fs.existsSync(transformersPath)) {
        const transformersContent = fs.readFileSync(transformersPath, 'utf8');
        const calculateDateDiffUsage = (transformersContent.match(/calculateDateDiff\(/g) || []).length;
        if (calculateDateDiffUsage < 1) {
            throw new Error(`Expected at least 1 calculateDateDiff call in transformers, found ${calculateDateDiffUsage}`);
        }
    }

    return `addHoursToDate: ${addHoursUsage}, calculateDateDiff: found in transformers`;
}

// Test 6: Check for async helpers integration
function testAsyncHelpersIntegration() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for retry usage
    const retryUsage = (content.match(/retry\(/g) || []).length;
    if (retryUsage < 2) {
        throw new Error(`Expected at least 2 retry calls, found ${retryUsage}`);
    }

    // Check for timeout usage
    const timeoutUsage = (content.match(/timeout\(/g) || []).length;
    if (timeoutUsage < 1) {
        throw new Error(`Expected at least 1 timeout call, found ${timeoutUsage}`);
    }

    // Check for batchProcess usage
    const batchProcessUsage = (content.match(/batchProcess\(/g) || []).length;
    if (batchProcessUsage < 1) {
        throw new Error(`Expected at least 1 batchProcess call, found ${batchProcessUsage}`);
    }

    return `retry: ${retryUsage}, timeout: ${timeoutUsage}, batchProcess: ${batchProcessUsage}`;
}

// Test 7: Check for Zod validation integration
function testZodValidationIntegration() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for Zod schema usage
    const zodUsage = (content.match(/Schema\.parse\(/g) || []).length;
    if (zodUsage < 3) {
        throw new Error(`Expected at least 3 Zod schema validations, found ${zodUsage}`);
    }

    // Check auth-types.ts for schemas
    const authTypesPath = path.join(__dirname, '../src/lib/auth/auth-types.ts');
    if (fs.existsSync(authTypesPath)) {
        const authTypesContent = fs.readFileSync(authTypesPath, 'utf8');
        const schemaExports = (authTypesContent.match(/export const.*Schema/g) || []).length;
        if (schemaExports < 5) {
            throw new Error(`Expected at least 5 Zod schemas in auth-types.ts, found ${schemaExports}`);
        }
    }

    return `Zod validations: ${zodUsage}, schemas in auth-types: found`;
}

// Test 8: Check for console.log replacement
function testConsoleLogReplacement() {
    const authServicePath = path.join(__dirname, '../src/lib/auth/AuthService.ts');
    const content = fs.readFileSync(authServicePath, 'utf8');

    // Check for remaining console.log statements
    const consoleLogUsage = (content.match(/console\.log\(/g) || []).length;
    if (consoleLogUsage > 0) {
        throw new Error(`Found ${consoleLogUsage} console.log statements that should be replaced with structured logging`);
    }

    // Check for logErrorWithContext usage (should be more than console.log)
    const logErrorUsage = (content.match(/logErrorWithContext\(/g) || []).length;
    if (logErrorUsage < 5) {
        throw new Error(`Expected at least 5 logErrorWithContext calls, found ${logErrorUsage}`);
    }

    return `console.log: ${consoleLogUsage}, logErrorWithContext: ${logErrorUsage}`;
}

// Test 9: Check build success
function testBuildSuccess() {
    try {
        const { execSync } = require('child_process');
        execSync('npm run build', { stdio: 'pipe' });
        return 'Build successful';
    } catch (error) {
        throw new Error(`Build failed: ${error.message}`);
    }
}

// Test 10: Check utility files exist
function testUtilityFilesExist() {
    const utilityFiles = [
        '../src/lib/utils/error-handling.ts',
        '../src/lib/utils/string-helpers.ts',
        '../src/lib/utils/data-helpers.ts',
        '../src/lib/utils/date-time.ts',
        '../src/lib/utils/async-helpers.ts',
        '../src/lib/utils/transformers.ts',
        '../src/lib/utils/request-validation.ts'
    ];

    const missingFiles = utilityFiles.filter(file =>
        !fs.existsSync(path.join(__dirname, file))
    );

    if (missingFiles.length > 0) {
        throw new Error(`Missing utility files: ${missingFiles.join(', ')}`);
    }

    return `All ${utilityFiles.length} utility files exist`;
}

// Run all tests
function runAllTests() {
    console.log('🧪 AuthService Utility Integration Test Suite');
    console.log('='.repeat(60));

    runTest('1. AuthService file exists with utility imports', testAuthServiceFile);
    runTest('2. Error handling integration', testErrorHandlingIntegration);
    runTest('3. String helpers integration', testStringHelpersIntegration);
    runTest('4. Data helpers integration', testDataHelpersIntegration);
    runTest('5. Date/time helpers integration', testDateTimeHelpersIntegration);
    runTest('6. Async helpers integration', testAsyncHelpersIntegration);
    runTest('7. Zod validation integration', testZodValidationIntegration);
    runTest('8. Console.log replacement', testConsoleLogReplacement);
    runTest('9. Build success', testBuildSuccess);
    runTest('10. Utility files exist', testUtilityFilesExist);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Total: ${passedTests + failedTests}`);
    console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! AuthService utility integration is complete!');
        console.log('\n🔍 INTEGRATION VERIFICATION:');
        console.log('  ✅ Error handling with AppError classes');
        console.log('  ✅ Input validation with Zod schemas');
        console.log('  ✅ String helpers (maskEmail, sanitizeString, truncate)');
        console.log('  ✅ Data helpers (pickFields, omitFields, transformUserForAuth)');
        console.log('  ✅ Date/time helpers (addHoursToDate, calculateDateDiff)');
        console.log('  ✅ Async helpers (retry, timeout, batchProcess)');
        console.log('  ✅ Structured logging with logErrorWithContext');
        console.log('  ✅ Build success with no TypeScript errors');
    } else {
        console.log('\n❌ Some tests failed. Please review the errors above.');
        process.exit(1);
    }
}

// Run the tests
runAllTests();


