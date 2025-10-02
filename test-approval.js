const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testApprovalEndpoint() {
    try {
        console.log('🧪 Testing approval endpoint...');

        // Test with a real transfer ID
        const testTransferId = '68ddcaf3fcbac95128d5d836'; // Real ObjectId
        const testAdminEmail = 'admin@patients-management.com';

        const approvalUrl = `http://localhost:3000/api/transfers/${testTransferId}/approve?admin=${testAdminEmail}`;

        console.log('📧 Testing URL:', approvalUrl);

        const response = await fetch(approvalUrl, {
            method: 'GET',
            redirect: 'manual' // Don't follow redirects automatically
        });

        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.status === 302 || response.status === 301) {
            const location = response.headers.get('location');
            console.log('🔄 Redirect location:', location);

            if (location && location.includes('/approval-success')) {
                console.log('✅ SUCCESS: Redirects to approval-success page');
            } else {
                console.log('❌ ISSUE: Redirects to:', location);
            }
        } else {
            const body = await response.text();
            console.log('📄 Response body:', body);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testApprovalEndpoint();
