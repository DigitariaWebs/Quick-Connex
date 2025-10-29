#!/usr/bin/env tsx

/**
 * Template System Test Script
 * 
 * Test the new Handlebars-based template system.
 */

import { config } from 'dotenv';
import { CommunicationService } from '../src/lib/communication';
import { TemplateService } from '../src/lib/communication/templates/core/TemplateService';
import { EMAIL_TEMPLATES } from '../src/lib/communication/templates/definitions/email-templates';
import { SMS_TEMPLATES } from '../src/lib/communication/templates/definitions/sms-templates';

// Load environment variables
config({ path: '.env' });

interface TestResult {
  templateId: string;
  success: boolean;
  error?: string;
  content?: any;
  renderTime: number;
}

class TemplateTester {
  private communicationService: CommunicationService;
  private templateService: TemplateService;
  private results: TestResult[] = [];

  constructor() {
    this.communicationService = CommunicationService.getInstance();
    this.templateService = TemplateService.getInstance();
  }

  async runTests(): Promise<void> {
    console.log('🧪 Starting Template System Tests\n');

    try {
      // Initialize communication service
      console.log('📧 Initializing communication service...');
      await this.communicationService.initialize();
      console.log('✅ Communication service initialized\n');

      // Test email templates
      console.log('📧 Testing Email Templates');
      console.log('=' .repeat(50));
      await this.testEmailTemplates();

      // Test SMS templates
      console.log('\n📱 Testing SMS Templates');
      console.log('=' .repeat(50));
      await this.testSMSTemplates();

      // Test template service directly
      console.log('\n🔧 Testing Template Service');
      console.log('=' .repeat(50));
      await this.testTemplateService();

      // Test error handling
      console.log('\n❌ Testing Error Handling');
      console.log('=' .repeat(50));
      await this.testErrorHandling();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  private async testEmailTemplates(): Promise<void> {
    const sampleData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      baseUrl: 'http://localhost:3001',
      reason: 'Incomplete documentation',
      resetToken: 'abc123def456',
      patientName: 'Jane Smith',
      fromHospital: 'General Hospital',
      toHospital: 'City Medical Center',
      priority: 'urgent',
      requestedBy: 'Dr. Smith',
      transferId: 'TXN-12345',
      createdAt: new Date(),
      approvedBy: 'Dr. Johnson',
      approvedAt: new Date(),
      notes: 'Patient requires specialized care'
    };

    for (const template of EMAIL_TEMPLATES) {
      await this.testTemplate(template.id, sampleData, 'email');
    }
  }

  private async testSMSTemplates(): Promise<void> {
    const sampleData = {
      firstName: 'John',
      baseUrl: 'http://localhost:3001',
      patientName: 'Jane Smith',
      fromHospital: 'General Hospital',
      toHospital: 'City Medical Center',
      priority: 'urgent',
      transferId: 'TXN-12345',
      approvedBy: 'Dr. Johnson',
      reason: 'Incomplete documentation',
      resetCode: '123456',
      message: 'System maintenance required',
      timestamp: new Date(),
      appointmentType: 'Follow-up',
      appointmentDate: new Date(),
      appointmentTime: '2:00 PM',
      maintenanceDate: new Date(),
      startTime: '2:00 AM',
      endTime: '4:00 AM',
      alertMessage: 'Critical system failure detected'
    };

    for (const template of SMS_TEMPLATES) {
      await this.testTemplate(template.id, sampleData, 'sms');
    }
  }

  private async testTemplate(templateId: string, data: Record<string, any>, channel: 'email' | 'sms'): Promise<void> {
    const startTime = Date.now();
    
    try {
      const content = await this.communicationService.renderTemplate(templateId, data);
      const renderTime = Date.now() - startTime;

      this.results.push({
        templateId,
        success: true,
        content,
        renderTime
      });

      console.log(`✅ ${templateId}`);
      console.log(`   Channel: ${channel}`);
      console.log(`   Render time: ${renderTime}ms`);
      
      if (channel === 'email') {
        console.log(`   Subject: ${content.subject || 'N/A'}`);
        console.log(`   Text length: ${content.text?.length || 0} chars`);
        console.log(`   HTML length: ${content.html?.length || 0} chars`);
      } else {
        console.log(`   Text: ${content.text?.substring(0, 100)}${content.text && content.text.length > 100 ? '...' : ''}`);
      }
      console.log('');

    } catch (error) {
      const renderTime = Date.now() - startTime;
      
      this.results.push({
        templateId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        renderTime
      });

      console.log(`❌ ${templateId}`);
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`   Render time: ${renderTime}ms`);
      console.log('');
    }
  }

  private async testTemplateService(): Promise<void> {
    try {
      // Test template service methods
      const stats = this.templateService.getTemplateStats();
      console.log('📊 Template Service Stats:');
      console.log(`   Total templates: ${stats.totalTemplates}`);
      console.log(`   Engine cache size: ${stats.engineStats.size}`);
      console.log(`   Engine hit rate: ${stats.engineStats.hitRate}%`);
      console.log(`   Repository cache size: ${stats.repositoryStats.size}`);
      console.log('');

      // Test template validation
      const validation = this.templateService.validateTemplateSyntax('Hello {{name}}!');
      console.log('🔍 Template Validation:');
      console.log(`   Valid syntax: ${validation.valid}`);
      if (!validation.valid) {
        console.log(`   Error: ${validation.error}`);
      }
      console.log('');

      // Test variable extraction
      const variables = this.templateService.extractVariables('Hello {{firstName}} {{lastName}}! Your email is {{email}}.');
      console.log('🔍 Variable Extraction:');
      console.log(`   Variables found: ${variables.join(', ')}`);
      console.log('');

    } catch (error) {
      console.log(`❌ Template service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testErrorHandling(): Promise<void> {
    // Test non-existent template
    try {
      await this.communicationService.renderTemplate('non_existent_template', {});
      console.log('❌ Should have failed for non-existent template');
    } catch (error) {
      console.log('✅ Correctly handled non-existent template');
    }

    // Test missing variables
    try {
      await this.communicationService.renderTemplate('user_approval', {});
      console.log('❌ Should have failed for missing variables');
    } catch (error) {
      console.log('✅ Correctly handled missing variables');
    }

    // Test invalid template syntax
    try {
      const invalidTemplate = 'Hello {{name'; // Missing closing braces
      const validation = this.templateService.validateTemplateSyntax(invalidTemplate);
      if (!validation.valid) {
        console.log('✅ Correctly detected invalid template syntax');
      } else {
        console.log('❌ Should have detected invalid syntax');
      }
    } catch (error) {
      console.log('✅ Correctly handled invalid template syntax');
    }
  }

  private printSummary(): void {
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = total - successful;
    const avgRenderTime = this.results.reduce((sum, r) => sum + r.renderTime, 0) / total;

    console.log('\n📊 Test Summary');
    console.log('=' .repeat(50));
    console.log(`Total templates tested: ${total}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / total) * 100).toFixed(1)}%`);
    console.log(`⏱️  Average render time: ${avgRenderTime.toFixed(2)}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Templates:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.templateId}: ${r.error}`);
        });
    }

    console.log('\n🎉 Template system test completed!');
  }
}

// Run tests
async function main() {
  const tester = new TemplateTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(console.error);
}
