/**
 * Debug script to test EmailService directly
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmailService() {
    console.log('🔍 Debugging EmailService...\n');

    try {
        // Import the EmailService
        const { EmailService } = require('../src/lib/communication/email-service');

        console.log('✅ EmailService imported successfully');

        // Create instance
        const emailService = new EmailService();
        console.log('✅ EmailService instance created');

        // Test email message
        const testEmail = {
            id: `debug-${Date.now()}`,
            recipient: {
                email: process.argv[2] || 'test@example.com',
                name: 'Test User'
            },
            content: {
                template: 'password_reset',
                templateData: {
                    firstName: 'John',
                    lastName: 'Doe',
                    resetUrl: 'http://localhost:3000/reset-password?token=test123',
                    expiresIn: '1 hour'
                }
            },
            metadata: {
                category: 'password_reset',
                userId: 'test123'
            },
            priority: 'high'
        };

        console.log('📧 Sending test email...');
        console.log('   Template:', testEmail.content.template);
        console.log('   Recipient:', testEmail.recipient.email);

        const result = await emailService.sendEmail(testEmail);

        console.log('\n📊 Result:');
        console.log('   Success:', result.success);
        console.log('   Message ID:', result.messageId);
        console.log('   Status:', result.status);
        if (result.error) {
            console.log('   Error:', result.error);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testEmailService();
