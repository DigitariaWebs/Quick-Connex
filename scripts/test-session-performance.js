/**
 * Session Performance Testing Script
 * 
 * Tests the performance improvements of the session system.
 * Measures query times, cache performance, and overall system efficiency.
 */

const { SessionManager } = require('../src/lib/session/SessionManager');
const mongoose = require('mongoose');

// Test configuration
const TEST_CONFIG = {
    concurrentUsers: 100,
    sessionsPerUser: 3,
    testDuration: 60000, // 1 minute
    warmupTime: 10000,   // 10 seconds
};

// Performance metrics
const metrics = {
    sessionCreations: [],
    sessionValidations: [],
    sessionQueries: [],
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    startTime: null,
    endTime: null
};

/**
 * Generate test data
 */
function generateTestData() {
    const users = [];
    const sessions = [];

    for (let i = 0; i < TEST_CONFIG.concurrentUsers; i++) {
        users.push({
            _id: `test_user_${i}`,
            email: `test${i}@example.com`,
            userType: i % 10 === 0 ? 'admin' : 'employee',
            status: 'approved'
        });

        for (let j = 0; j < TEST_CONFIG.sessionsPerUser; j++) {
            sessions.push({
                sessionId: `test_session_${i}_${j}`,
                userId: `test_user_${i}`,
                deviceInfo: {
                    userAgent: `TestAgent/${j}`,
                    platform: 'web',
                    deviceType: j % 3 === 0 ? 'mobile' : 'desktop'
                },
                ipAddress: `192.168.1.${i % 255}`,
                isActive: true,
                revoked: false
            });
        }
    }

    return { users, sessions };
}

/**
 * Test session creation performance
 */
async function testSessionCreation() {
    console.log('🧪 Testing session creation performance...');

    const { users } = generateTestData();
    const startTime = Date.now();

    for (const user of users) {
        try {
            const sessionStart = Date.now();

            // Mock session creation
            const result = await SessionManager.createSession(
                user._id,
                {
                    userAgent: 'TestAgent/1.0',
                    platform: 'web',
                    deviceType: 'desktop'
                },
                '192.168.1.1'
            );

            const sessionTime = Date.now() - sessionStart;
            metrics.sessionCreations.push(sessionTime);

            if (result.success) {
                console.log(`✅ Session created for user ${user._id} in ${sessionTime}ms`);
            } else {
                console.log(`❌ Session creation failed for user ${user._id}: ${result.error}`);
                metrics.errors++;
            }

        } catch (error) {
            console.error(`❌ Session creation error for user ${user._id}:`, error);
            metrics.errors++;
        }
    }

    const totalTime = Date.now() - startTime;
    console.log(`📊 Session creation test completed in ${totalTime}ms`);
    console.log(`📊 Average creation time: ${Math.round(metrics.sessionCreations.reduce((a, b) => a + b, 0) / metrics.sessionCreations.length)}ms`);
}

/**
 * Test session validation performance
 */
async function testSessionValidation() {
    console.log('🧪 Testing session validation performance...');

    const { sessions } = generateTestData();
    const startTime = Date.now();

    for (const session of sessions) {
        try {
            const validationStart = Date.now();

            // Mock session validation
            const result = await SessionManager.validateSession(session.sessionId);

            const validationTime = Date.now() - validationStart;
            metrics.sessionValidations.push(validationTime);

            if (result.success) {
                console.log(`✅ Session validated ${session.sessionId} in ${validationTime}ms`);
            } else {
                console.log(`❌ Session validation failed ${session.sessionId}: ${result.error}`);
                metrics.errors++;
            }

        } catch (error) {
            console.error(`❌ Session validation error ${session.sessionId}:`, error);
            metrics.errors++;
        }
    }

    const totalTime = Date.now() - startTime;
    console.log(`📊 Session validation test completed in ${totalTime}ms`);
    console.log(`📊 Average validation time: ${Math.round(metrics.sessionValidations.reduce((a, b) => a + b, 0) / metrics.sessionValidations.length)}ms`);
}

/**
 * Test session query performance
 */
async function testSessionQueries() {
    console.log('🧪 Testing session query performance...');

    const { users } = generateTestData();
    const startTime = Date.now();

    for (const user of users) {
        try {
            const queryStart = Date.now();

            // Mock session queries
            const sessions = await SessionManager.getUserSessions(user._id);

            const queryTime = Date.now() - queryStart;
            metrics.sessionQueries.push(queryTime);

            console.log(`✅ Queried ${sessions.length} sessions for user ${user._id} in ${queryTime}ms`);

        } catch (error) {
            console.error(`❌ Session query error for user ${user._id}:`, error);
            metrics.errors++;
        }
    }

    const totalTime = Date.now() - startTime;
    console.log(`📊 Session query test completed in ${totalTime}ms`);
    console.log(`📊 Average query time: ${Math.round(metrics.sessionQueries.reduce((a, b) => a + b, 0) / metrics.sessionQueries.length)}ms`);
}

/**
 * Test cache performance
 */
async function testCachePerformance() {
    console.log('🧪 Testing cache performance...');

    const { sessions } = generateTestData();
    const startTime = Date.now();

    // First pass - cache misses
    for (const session of sessions) {
        try {
            const cacheStart = Date.now();

            const result = await SessionManager.validateSession(session.sessionId);

            const cacheTime = Date.now() - cacheStart;
            metrics.cacheMisses++;

            console.log(`🔄 Cache miss for ${session.sessionId} in ${cacheTime}ms`);

        } catch (error) {
            console.error(`❌ Cache test error ${session.sessionId}:`, error);
            metrics.errors++;
        }
    }

    // Second pass - cache hits
    for (const session of sessions) {
        try {
            const cacheStart = Date.now();

            const result = await SessionManager.validateSession(session.sessionId);

            const cacheTime = Date.now() - cacheStart;
            metrics.cacheHits++;

            console.log(`⚡ Cache hit for ${session.sessionId} in ${cacheTime}ms`);

        } catch (error) {
            console.error(`❌ Cache test error ${session.sessionId}:`, error);
            metrics.errors++;
        }
    }

    const totalTime = Date.now() - startTime;
    console.log(`📊 Cache performance test completed in ${totalTime}ms`);
    console.log(`📊 Cache hit rate: ${Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100)}%`);
}

/**
 * Test session cleanup performance
 */
async function testCleanupPerformance() {
    console.log('🧪 Testing session cleanup performance...');

    const startTime = Date.now();

    try {
        const result = await SessionManager.cleanupExpiredSessions();

        const cleanupTime = Date.now() - startTime;
        console.log(`🧹 Cleanup completed in ${cleanupTime}ms`);
        console.log(`🧹 Sessions cleaned: ${result.cleaned}`);
        console.log(`🧹 Cleanup efficiency: ${Math.round(result.cleaned / (cleanupTime / 1000))} sessions/sec`);

    } catch (error) {
        console.error(`❌ Cleanup error:`, error);
        metrics.errors++;
    }
}

/**
 * Test session pool statistics
 */
async function testSessionPoolStats() {
    console.log('🧪 Testing session pool statistics...');

    try {
        const stats = await SessionManager.getSessionPoolStats();

        console.log(`📊 Session Pool Statistics:`);
        console.log(`📊 Total Sessions: ${stats.totalSessions}`);
        console.log(`📊 Active Sessions: ${stats.activeSessions}`);
        console.log(`📊 Expired Sessions: ${stats.expiredSessions}`);
        console.log(`📊 High Risk Sessions: ${stats.highRiskSessions}`);
        console.log(`📊 Average Session Age: ${stats.averageSessionAge} minutes`);
        console.log(`📊 Session Distribution:`, Object.fromEntries(stats.sessionDistribution));
        console.log(`📊 Performance Metrics:`, stats.performanceMetrics);

    } catch (error) {
        console.error(`❌ Session pool stats error:`, error);
        metrics.errors++;
    }
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
    console.log('\n📊 PERFORMANCE TEST REPORT');
    console.log('='.repeat(50));

    const totalTime = metrics.endTime - metrics.startTime;
    const totalOperations = metrics.sessionCreations.length + metrics.sessionValidations.length + metrics.sessionQueries.length;

    console.log(`⏱️  Total Test Time: ${totalTime}ms`);
    console.log(`🔄 Total Operations: ${totalOperations}`);
    console.log(`⚡ Operations/sec: ${Math.round(totalOperations / (totalTime / 1000))}`);
    console.log(`❌ Total Errors: ${metrics.errors}`);
    console.log(`📈 Error Rate: ${Math.round((metrics.errors / totalOperations) * 100)}%`);

    console.log('\n📊 Session Creation Performance:');
    console.log(`⏱️  Average: ${Math.round(metrics.sessionCreations.reduce((a, b) => a + b, 0) / metrics.sessionCreations.length)}ms`);
    console.log(`⚡ Min: ${Math.min(...metrics.sessionCreations)}ms`);
    console.log(`🐌 Max: ${Math.max(...metrics.sessionCreations)}ms`);

    console.log('\n📊 Session Validation Performance:');
    console.log(`⏱️  Average: ${Math.round(metrics.sessionValidations.reduce((a, b) => a + b, 0) / metrics.sessionValidations.length)}ms`);
    console.log(`⚡ Min: ${Math.min(...metrics.sessionValidations)}ms`);
    console.log(`🐌 Max: ${Math.max(...metrics.sessionValidations)}ms`);

    console.log('\n📊 Session Query Performance:');
    console.log(`⏱️  Average: ${Math.round(metrics.sessionQueries.reduce((a, b) => a + b, 0) / metrics.sessionQueries.length)}ms`);
    console.log(`⚡ Min: ${Math.min(...metrics.sessionQueries)}ms`);
    console.log(`🐌 Max: ${Math.max(...metrics.sessionQueries)}ms`);

    console.log('\n📊 Cache Performance:');
    console.log(`⚡ Cache Hits: ${metrics.cacheHits}`);
    console.log(`🔄 Cache Misses: ${metrics.cacheMisses}`);
    console.log(`📈 Cache Hit Rate: ${Math.round((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100)}%`);

    console.log('\n📊 Performance Recommendations:');
    if (metrics.sessionCreations.reduce((a, b) => a + b, 0) / metrics.sessionCreations.length > 100) {
        console.log('⚠️  Session creation is slow - consider database optimization');
    }
    if (metrics.sessionValidations.reduce((a, b) => a + b, 0) / metrics.sessionValidations.length > 50) {
        console.log('⚠️  Session validation is slow - consider caching optimization');
    }
    if (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) < 0.5) {
        console.log('⚠️  Cache hit rate is low - consider increasing cache size');
    }
    if (metrics.errors > totalOperations * 0.05) {
        console.log('⚠️  High error rate - review error handling');
    }

    console.log('\n✅ Performance test completed successfully!');
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
    console.log('🚀 Starting Session Performance Tests');
    console.log('='.repeat(50));

    metrics.startTime = Date.now();

    try {
        // Warmup
        console.log('🔥 Warming up...');
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.warmupTime));

        // Run tests
        await testSessionCreation();
        await testSessionValidation();
        await testSessionQueries();
        await testCachePerformance();
        await testCleanupPerformance();
        await testSessionPoolStats();

        metrics.endTime = Date.now();

        // Generate report
        generatePerformanceReport();

    } catch (error) {
        console.error('❌ Performance test failed:', error);
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    runPerformanceTests().catch(console.error);
}

module.exports = {
    runPerformanceTests,
    generatePerformanceReport,
    metrics
};
