#!/usr/bin/env ts-node

/**
 * Mock SMS Test Script
 * 
 * Tests SMS functionality without requiring Twilio credentials.
 * This simulates SMS sending for development/testing purposes.
 */

import { CommunicationService } from '../src/lib/communication/core/CommunicationService';
import { SMSMessage } from '../src/types/communication';

// Mock SMS provider for testing
class MockSMSProvider {
  async send(message: SMSMessage) {
    // Simulate SMS sending
    console.log('📱 [MOCK SMS] Sending SMS...');
    console.log(`   📱 To: ${message.recipient.phone}`);
    console.log(`   📝 Message: ${message.content.text}`);
    console.log(`   🆔 Message ID: ${message.id}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success response
    return {
      success: true,
      messageId: message.id,
      providerId: `mock-sms-${Date.now()}`,
      status: 'sent',
      cost: 0.0075,
      currency: 'USD',
      message: 'SMS sent successfully (MOCK)',
      timestamp: new Date()
    };
  }

  async validateConfiguration() {
    return true;
  }
}

// Override the SMS provider in CommunicationService for testing
async function testSMSSimulation(phone: string) {
  console.log('🚀 Mock SMS Test Suite');
  console.log('========================');
  console.log(`📱 Testing SMS to: ${phone}`);
  console.log('⚠️  This is a MOCK test - no real SMS will be sent\n');

  try {
    // Initialize communication service
    const communicationService = CommunicationService.getInstance();
    await communicationService.initialize();
    
    // Replace SMS provider with mock
    const providerManager = (communicationService as any).providerManager;
    if (providerManager) {
      providerManager.smsProvider = new MockSMSProvider();
    }

    // Create test SMS message
    const smsMessage: SMSMessage = {
      id: `mock-sms-${Date.now()}`,
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
        source: 'mock_test_script',
        category: 'test',
        userId: 'test-user'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📤 Sending mock SMS...');
    console.log(`   📱 To: ${phone}`);
    console.log(`   📝 Message: ${smsMessage.content.text}`);

    // Send SMS
    const result = await communicationService.sendSMS(smsMessage);
    
    if (result.success) {
      console.log('\n✅ Mock SMS test completed successfully!');
      console.log(`   📋 Message ID: ${result.messageId}`);
      console.log(`   🔗 Provider ID: ${result.providerId}`);
      console.log(`   💰 Cost: $${result.cost}`);
      console.log(`   📊 Status: ${result.status}`);
      
      console.log('\n🎉 SMS functionality is working correctly!');
      console.log('   (Note: This was a mock test - no real SMS was sent)');
      
      return true;
    } else {
      console.log('\n❌ Mock SMS test failed');
      console.log(`   🚨 Error: ${result.error}`);
      return false;
    }

  } catch (error) {
    console.log('\n❌ Mock SMS test failed with exception');
    console.log(`   🚨 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let phone = '';

for (const arg of args) {
  if (arg.startsWith('--phone=')) {
    phone = arg.split('=')[1] || '';
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Mock SMS Test Script

Usage:
  npx ts-node scripts/test-sms-mock.ts --phone=+1234567890

Options:
  --phone=NUMBER      Phone number to test SMS to (E.164 format)
  --help, -h          Show this help message

Examples:
  npx ts-node scripts/test-sms-mock.ts --phone=+213793601892

Note: This is a mock test - no real SMS will be sent.
`);
    process.exit(0);
  }
}

if (!phone) {
  console.log('❌ Phone number is required');
  console.log('Usage: npx ts-node scripts/test-sms-mock.ts --phone=+1234567890');
  process.exit(1);
}

// Validate phone number format
const phoneRegex = /^\+[1-9]\d{1,14}$/;
if (!phoneRegex.test(phone)) {
  console.log('❌ Invalid phone number format');
  console.log('Please use E.164 format: +1234567890');
  process.exit(1);
}

// Run the test
testSMSSimulation(phone).then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
