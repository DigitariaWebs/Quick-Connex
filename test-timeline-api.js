/**
 * Test Timeline API
 * 
 * Simple test to check if the timeline API is working
 */

const fetch = require('node-fetch');

async function testTimelineAPI() {
    try {
        console.log('🧪 Testing Timeline API...\n');

        // Test with a sample transfer ID
        const testTransferId = 'TRANSFER_123'; // Replace with actual transfer ID
        const apiUrl = `http://localhost:3000/api/transfers/${testTransferId}/timeline`;

        console.log(`📡 Testing API: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add any auth headers if needed
            }
        });

        console.log(`📊 Response Status: ${response.status}`);
        console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));

        if (data.success) {
            console.log(`✅ API Success: ${data.data.timeline.length} timeline items`);
        } else {
            console.log(`❌ API Error: ${data.error || data.message}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testTimelineAPI();
}

module.exports = { testTimelineAPI };
