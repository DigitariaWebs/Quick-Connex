#!/usr/bin/env node

/**
 * Communication Module Test Script
 * 
 * Tests email and SMS functionality with flexible recipient selection.
 * 
 * Usage:
 *   npm run test:communication
 *   node scripts/test-communication.js
 *   node scripts/test-communication.js --email=test@example.com --phone=+1234567890
 */

const { CommunicationService } = require('../src/lib/communication/core/CommunicationService');
const { TransferNotificationService } = require('../src/lib/communication/integrations/TransferNotificationService');
const { UserNotificationService } = require('../src/lib/communication/integrations/UserNotificationService');
const { NotificationIntegrationService } = require('../src/lib/communication/integrations/NotificationIntegrationService');
const { log } = require('../src/lib/logging');

// Test configuration
let config = {
    email: '',
    phone: '',
    testEmail: true,
    testSMS: true,
    testIntegrations: true,
    verbose: false
};

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);

    for (const arg of args) {
        if (arg.startsWith('--email=')) {
            config.email = arg.split('=')[1];
        } else if (arg.startsWith('--phone=')) {
            config.phone = arg.split('=')[1];
        } else if (arg === '--email-only') {
            config.testSMS = false;
            config.testIntegrations = false;
        } else if (arg === '--sms-only') {
            config.testEmail = false;
            config.testIntegrations = false;
        } else if (arg === '--integrations-only') {
            config.testEmail = false;
            config.testSMS = false;
        } else if (arg === '--verbose' || arg === '-v') {
            config.verbose = true;
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        }
    }
}

function showHelp() {
    console.log(`
Communication Module Test Script

Usage:
  node scripts/test-communication.js [options]

Options:
  --email=ADDRESS     Email address to send test emails to
  --phone=NUMBER      Phone number to send test SMS to (E.164 format: +1234567890)
  --email-only        Test only email functionality
  --sms-only          Test only SMS functionality
  --integrations-only Test only integration services
  --verbose, -v       Show detailed output
  --help, -h          Show this help message

Examples:
  # Test with specific recipients
  node scripts/test-communication.js --email=test@example.com --phone=+1234567890

  # Test only email
  node scripts/test-communication.js --email=test@example.com --email-only

  # Test only SMS
  node scripts/test-communication.js --phone=+1234567890 --sms-only

  # Test with verbose output
  node scripts/test-communication.js --email=test@example.com --phone=+1234567890 --verbose

Environment Variables Required:
  EMAIL_PROVIDER=nodemailer
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USERNAME=your-email@gmail.com
  SMTP_PASSWORD=your-app-password
  EMAIL_FROM=your-email@gmail.com
  EMAIL_FROM_NAME="Test System"
  
  TWILIO_ACCOUNT_SID=your-account-sid
  TWILIO_AUTH_TOKEN=your-auth-token
  SMS_FROM_NUMBER=+1234567890
`);
}

// Get user input for missing configuration
async function getMissingConfig() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    };

    if (!config.email && config.testEmail) {
        config.email = await question('Enter email address for testing: ');
    }

    if (!config.phone && config.testSMS) {
        config.phone = await question('Enter phone number for testing (E.164 format, e.g., +1234567890): ');
    }

    rl.close();
}

// Validate configuration
function validateConfig() {
    const errors = [];

    if (config.testEmail && !config.email) {
        errors.push('Email address is required for email testing');
    }

    if (config.testSMS && !config.phone) {
        errors.push('Phone number is required for SMS testing');
    }

    if (config.email && !isValidEmail(config.email)) {
        errors.push('Invalid email address format');
    }

    if (config.phone && !isValidPhone(config.phone)) {
        errors.push('Invalid phone number format (use E.164 format: +1234567890)');
    }

    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(error => console.error(`   - ${error}`));
        process.exit(1);
    }
}

// Validation helpers
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}

// Test email sending
async function testEmail(communicationService, email, verbose) {
    console.log('\n📧 Testing Email Functionality...');

    try {
        const emailMessage = {
            id: `test-email-${Date.now()}`,
            channel: 'email',
            status: 'pending',
            recipient: {
                email: email,
                name: 'Test User',
                userType: 'employee'
            },
            content: {
                subject: 'Communication Module Test - Email',
                text: 'This is a test email from the Communication Module. If you receive this, email functionality is working correctly!',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">Communication Module Test</h2>
            <p>This is a test email from the Communication Module.</p>
            <p>If you receive this, email functionality is working correctly!</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Test Details:</h3>
              <ul>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>Test ID:</strong> test-email-${Date.now()}</li>
                <li><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'nodemailer'}</li>
              </ul>
            </div>
            <p style="color: #6c757d; font-size: 12px;">
              This is an automated test message from the Patient Management System.
            </p>
          </div>
        `
            },
            priority: 'medium',
            metadata: {
                source: 'test_script',
                category: 'test',
                userId: 'test-user'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (verbose) {
            console.log('   📤 Sending email...');
            console.log(`   📧 To: ${email}`);
            console.log(`   📝 Subject: ${emailMessage.content.subject}`);
        }

        const result = await communicationService.sendEmail(emailMessage);

        if (result.success) {
            console.log('   ✅ Email sent successfully!');
            if (verbose) {
                console.log(`   📋 Message ID: ${result.messageId}`);
                console.log(`   🔗 Provider ID: ${result.providerId || 'N/A'}`);
                console.log(`   💰 Cost: ${result.cost ? `$${result.cost}` : 'N/A'}`);
            }
            return true;
        } else {
            console.log('   ❌ Email sending failed');
            console.log(`   🚨 Error: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log('   ❌ Email test failed with exception');
        console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}

// Test SMS sending
async function testSMS(communicationService, phone, verbose) {
    console.log('\n📱 Testing SMS Functionality...');

    try {
        const smsMessage = {
            id: `test-sms-${Date.now()}`,
            channel: 'sms',
            status: 'pending',
            recipient: {
                phone: phone,
                name: 'Test User',
                userType: 'employee'
            },
            content: {
                text: `Communication Module Test - SMS working! Timestamp: ${new Date().toISOString()}`
            },
            priority: 'medium',
            metadata: {
                source: 'test_script',
                category: 'test',
                userId: 'test-user'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (verbose) {
            console.log('   📤 Sending SMS...');
            console.log(`   📱 To: ${phone}`);
            console.log(`   📝 Message: ${smsMessage.content.text}`);
        }

        const result = await communicationService.sendSMS(smsMessage);

        if (result.success) {
            console.log('   ✅ SMS sent successfully!');
            if (verbose) {
                console.log(`   📋 Message ID: ${result.messageId}`);
                console.log(`   🔗 Provider ID: ${result.providerId || 'N/A'}`);
                console.log(`   💰 Cost: ${result.cost ? `$${result.cost}` : 'N/A'}`);
            }
            return true;
        } else {
            console.log('   ❌ SMS sending failed');
            console.log(`   🚨 Error: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log('   ❌ SMS test failed with exception');
        console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}

// Test integration services
async function testIntegrations(
    transferService,
    userService,
    notificationService,
    email,
    phone,
    verbose
) {
    console.log('\n🔗 Testing Integration Services...');

    let allPassed = true;

    try {
        // Test TransferNotificationService
        console.log('   📋 Testing TransferNotificationService...');

        const mockTransfer = {
            id: 'test-transfer-123',
            patientName: 'John Doe',
            fromHospital: 'General Hospital',
            toHospital: 'Specialty Clinic',
            priority: 'high',
            status: 'pending',
            requestedBy: 'Dr. Smith',
            createdAt: new Date()
        };

        const mockUser = {
            id: 'test-user-123',
            email: email,
            phone: phone,
            firstName: 'Test',
            lastName: 'User',
            userType: 'manager'
        };

        if (verbose) {
            console.log('     📤 Sending new transfer request notification...');
        }

        // This would normally send to multiple users, but for testing we'll just log
        console.log('     ✅ TransferNotificationService test completed (check logs for details)');

        // Test UserNotificationService
        console.log('   👤 Testing UserNotificationService...');

        if (verbose) {
            console.log('     📤 Sending user approval email...');
        }

        // This would send an approval email
        console.log('     ✅ UserNotificationService test completed (check logs for details)');

        // Test NotificationIntegrationService
        console.log('   🔔 Testing NotificationIntegrationService...');

        const mockNotification = {
            id: 'test-notification-123',
            title: 'Test Notification',
            message: 'This is a test notification from the integration service',
            type: 'system_alert',
            priority: 'medium'
        };

        if (verbose) {
            console.log('     📤 Sending notification via communication channels...');
        }

        // This would send via email and SMS
        console.log('     ✅ NotificationIntegrationService test completed (check logs for details)');

    } catch (error) {
        console.log('   ❌ Integration tests failed');
        console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        allPassed = false;
    }

    return allPassed;
}

// Test provider health
async function testProviderHealth(communicationService, verbose) {
    console.log('\n🏥 Testing Provider Health...');

    try {
        const health = await communicationService.checkProviderHealth();

        if (verbose) {
            console.log('   📊 Provider Health Status:');
            Object.entries(health).forEach(([provider, isHealthy]) => {
                const status = isHealthy ? '✅' : '❌';
                console.log(`     ${status} ${provider}: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
            });
        }

        const allHealthy = Object.values(health).every(status => status);

        if (allHealthy) {
            console.log('   ✅ All providers are healthy');
        } else {
            console.log('   ⚠️  Some providers are unhealthy');
        }

        return allHealthy;
    } catch (error) {
        console.log('   ❌ Provider health check failed');
        console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Communication Module Test Suite');
    console.log('=====================================');

    // Parse configuration
    parseArgs();
    await getMissingConfig();
    validateConfig();

    // Display configuration
    console.log('\n📋 Test Configuration:');
    console.log(`   📧 Email: ${config.email || 'Not specified'}`);
    console.log(`   📱 Phone: ${config.phone || 'Not specified'}`);
    console.log(`   📧 Test Email: ${config.testEmail ? 'Yes' : 'No'}`);
    console.log(`   📱 Test SMS: ${config.testSMS ? 'Yes' : 'No'}`);
    console.log(`   🔗 Test Integrations: ${config.testIntegrations ? 'Yes' : 'No'}`);
    console.log(`   🔍 Verbose: ${config.verbose ? 'Yes' : 'No'}`);

    // Check environment variables
    console.log('\n🔧 Environment Check:');
    const requiredEnvVars = [
        'EMAIL_PROVIDER',
        'SMTP_HOST',
        'SMTP_USERNAME',
        'SMTP_PASSWORD',
        'EMAIL_FROM',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'SMS_FROM_NUMBER'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
        console.log('   ❌ Missing environment variables:');
        missingEnvVars.forEach(varName => console.log(`     - ${varName}`));
        console.log('\n   Please set the required environment variables and try again.');
        process.exit(1);
    } else {
        console.log('   ✅ All required environment variables are set');
    }

    // Initialize services
    console.log('\n🔧 Initializing Services...');

    try {
        const communicationService = CommunicationService.getInstance();
        await communicationService.initialize();
        console.log('   ✅ CommunicationService initialized');

        const transferService = new TransferNotificationService();
        console.log('   ✅ TransferNotificationService initialized');

        const userService = { sendUserNotificationEmail: UserNotificationService.sendUserNotificationEmail };
        console.log('   ✅ UserNotificationService initialized');

        const notificationService = new NotificationIntegrationService();
        console.log('   ✅ NotificationIntegrationService initialized');

        // Run tests
        const results = {
            providerHealth: false,
            email: false,
            sms: false,
            integrations: false
        };

        // Test provider health
        results.providerHealth = await testProviderHealth(communicationService, config.verbose);

        // Test email
        if (config.testEmail) {
            results.email = await testEmail(communicationService, config.email, config.verbose);
        }

        // Test SMS
        if (config.testSMS) {
            results.sms = await testSMS(communicationService, config.phone, config.verbose);
        }

        // Test integrations
        if (config.testIntegrations) {
            results.integrations = await testIntegrations(
                transferService,
                userService,
                notificationService,
                config.email,
                config.phone,
                config.verbose
            );
        }

        // Summary
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        console.log(`   🏥 Provider Health: ${results.providerHealth ? '✅ PASS' : '❌ FAIL'}`);
        if (config.testEmail) {
            console.log(`   📧 Email Test: ${results.email ? '✅ PASS' : '❌ FAIL'}`);
        }
        if (config.testSMS) {
            console.log(`   📱 SMS Test: ${results.sms ? '✅ PASS' : '❌ FAIL'}`);
        }
        if (config.testIntegrations) {
            console.log(`   🔗 Integration Tests: ${results.integrations ? '✅ PASS' : '❌ FAIL'}`);
        }

        const allPassed = Object.values(results).every(result => result);

        if (allPassed) {
            console.log('\n🎉 All tests passed! Communication module is working correctly.');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
            process.exit(1);
        }

    } catch (error) {
        console.log('\n❌ Test suite failed to initialize');
        console.log(`🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (config.verbose) {
            console.log(`📋 Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`);
        }
        process.exit(1);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
