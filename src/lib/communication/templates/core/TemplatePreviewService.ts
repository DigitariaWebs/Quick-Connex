import { TemplateLoader } from './TemplateLoader';
import { TemplateValidator } from './TemplateValidator';

export interface PreviewData {
  [key: string]: any;
}

export interface PreviewResult {
  html: string;
  metadata: {
    templatePath: string;
    variablesUsed: string[];
    renderTime: number;
    dataProvided: string[];
    validationResult?: any;
  };
  sampleData: PreviewData;
}

export interface SampleDataGenerator {
  [templateType: string]: PreviewData;
}

/**
 * Template preview service for generating previews with sample data
 */
export class TemplatePreviewService {
  private static instance: TemplatePreviewService;
  private templateLoader: TemplateLoader;
  private templateValidator: TemplateValidator;
  private sampleDataGenerators: SampleDataGenerator;

  private constructor() {
    this.templateLoader = TemplateLoader.getInstance();
    this.templateValidator = TemplateValidator.getInstance();
    this.sampleDataGenerators = this.initializeSampleDataGenerators();
  }

  public static getInstance(): TemplatePreviewService {
    if (!TemplatePreviewService.instance) {
      TemplatePreviewService.instance = new TemplatePreviewService();
    }
    return TemplatePreviewService.instance;
  }

  /**
   * Generate preview for a template
   */
  public generatePreview(templatePath: string, customData?: PreviewData): PreviewResult {
    const startTime = Date.now();
    
    // Get sample data for the template
    const sampleData = customData || this.getSampleDataForTemplate(templatePath);
    
    // Validate template with sample data
    const validationResult = this.templateValidator.validateTemplate(templatePath, sampleData);
    
    // Render template
    let html = '';
    try {
      html = this.templateLoader.renderTemplate(templatePath, sampleData);
    } catch (error) {
      html = `<div style="color: red; padding: 20px; border: 1px solid red; margin: 20px;">
        <h3>Template Rendering Error</h3>
        <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Template: ${templatePath}</p>
      </div>`;
    }

    const renderTime = Date.now() - startTime;
    const variablesUsed = this.templateValidator.getTemplateMetadata(templatePath).variables;

    return {
      html,
      metadata: {
        templatePath,
        variablesUsed,
        renderTime,
        dataProvided: Object.keys(sampleData),
        validationResult
      },
      sampleData
    };
  }

  /**
   * Generate multiple previews for different scenarios
   */
  public generateMultiplePreviews(templatePath: string): PreviewResult[] {
    const scenarios = this.getScenariosForTemplate(templatePath);
    return scenarios.map(scenario => this.generatePreview(templatePath, scenario.data));
  }

  /**
   * Get sample data for a specific template
   */
  public getSampleDataForTemplate(templatePath: string): PreviewData {
    const templateType = this.extractTemplateType(templatePath);
    return this.sampleDataGenerators[templateType] || this.getDefaultSampleData();
  }

  /**
   * Get available templates for preview
   */
  public getAvailableTemplates(): string[] {
    return this.templateLoader.getAvailableTemplates();
  }

  /**
   * Initialize sample data generators
   */
  private initializeSampleDataGenerators(): SampleDataGenerator {
    return {
      'transfer-request': {
        transferId: 'TR-2024-001',
        priority: 'URGENT',
        priorityText: 'URGENT TRANSFER REQUEST',
        priorityIcon: '🚨',
        priorityGradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 25%, #fca5a5 50%, #f87171 75%, #ef4444 100%)',
        priorityBadgeGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        isUrgent: true,
        patientName: 'John Doe',
        patientAge: '45',
        dossierNumber: 'DOS-2024-001',
        fromHospital: 'Montreal General Hospital',
        toHospital: 'Royal Victoria Hospital',
        scheduledDate: '2024-01-15',
        scheduledTime: '14:30',
        reason: 'Emergency surgery required for acute appendicitis',
        requestedBy: 'Dr. Sarah Smith',
        requestedByPhone: '+1-514-555-0123',
        requestedByEmail: 'dr.smith@hospital.com',
        notes: 'Patient requires immediate attention. Family has been notified.',
        approvalUrl: 'http://localhost:3000/api/transfers/TR-2024-001/approve',
        rejectionUrl: 'http://localhost:3000/api/transfers/TR-2024-001/reject',
        categorySpecificContent: `
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px; font-weight: 600;">👤 Patient Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Name:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">John Doe</p>
              </div>
              <div>
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Age:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">45 years</p>
              </div>
              <div style="grid-column: 1 / -1;">
                <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;"><strong>Dossier Number:</strong></p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">DOS-2024-001</p>
              </div>
            </div>
          </div>
        `
      },
      'transfer-approved': {
        transferId: 'TR-2024-001',
        title: 'Transfer Approved',
        message: 'Your transfer request has been approved by the administrator.',
        icon: '✅',
        actionText: 'You can now track the transfer progress in your dashboard.',
        patientName: 'John Doe',
        priority: 'URGENT',
        fromHospital: 'Montreal General Hospital',
        toHospital: 'Royal Victoria Hospital',
        approvedBy: 'Admin User',
        approvedAt: '2024-01-15 10:30',
        dashboardUrl: 'http://localhost:3000/dashboard'
      },
      'transfer-accepted': {
        transferId: 'TR-2024-001',
        patientName: 'John Doe',
        fromHospital: 'Montreal General Hospital',
        toHospital: 'Royal Victoria Hospital',
        priority: 'URGENT',
        priorityLower: 'urgent',
        acceptedBy: 'Nurse Johnson',
        acceptedAt: '2024-01-15 11:00'
      }
    };
  }

  /**
   * Get scenarios for a template (different states/variations)
   */
  private getScenariosForTemplate(templatePath: string): Array<{name: string, data: PreviewData}> {
    const templateType = this.extractTemplateType(templatePath);
    
    switch (templateType) {
      case 'transfer-request':
        return [
          {
            name: 'Urgent Transfer',
            data: {
              ...this.sampleDataGenerators['transfer-request'],
              priority: 'URGENT',
              isUrgent: true,
              priorityIcon: '🚨',
              priorityText: 'URGENT TRANSFER REQUEST'
            }
          },
          {
            name: 'Normal Transfer',
            data: {
              ...this.sampleDataGenerators['transfer-request'],
              priority: 'NORMAL',
              isUrgent: false,
              priorityIcon: '🚑',
              priorityText: 'TRANSFER REQUEST',
              priorityGradient: 'linear-gradient(135deg, #dbeafe 0%, #88f5c3 25%, #a7f3d0 50%, #bfdbfe 75%, #d4fce8 100%)',
              priorityBadgeGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            }
          },
          {
            name: 'Transfer with Notes',
            data: {
              ...this.sampleDataGenerators['transfer-request'],
              notes: 'Patient has special dietary requirements. Please ensure medical records are transferred.'
            }
          }
        ];
      
      case 'transfer-approved':
        return [
          {
            name: 'Manager Notification',
            data: {
              ...this.sampleDataGenerators['transfer-approved'],
              title: 'Transfer Approved',
              message: 'Your transfer request has been approved by the administrator.',
              icon: '✅',
              actionText: 'You can now track the transfer progress in your dashboard.'
            }
          },
          {
            name: 'Employee Notification',
            data: {
              ...this.sampleDataGenerators['transfer-approved'],
              title: 'New Transfer Available',
              message: 'A new transfer has been approved and is now available for assignment.',
              icon: '🚑',
              actionText: 'Log into the system to view details and accept the transfer assignment.'
            }
          }
        ];
      
      default:
        return [
          {
            name: 'Default',
            data: this.getSampleDataForTemplate(templatePath)
          }
        ];
    }
  }

  /**
   * Extract template type from path
   */
  private extractTemplateType(templatePath: string): string {
    const pathParts = templatePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return fileName.replace('.html', '');
  }

  /**
   * Get default sample data
   */
  private getDefaultSampleData(): PreviewData {
    return {
      title: 'Sample Title',
      message: 'This is a sample message for template preview.',
      content: 'Sample content goes here.',
      timestamp: new Date().toISOString(),
      user: 'Sample User',
      id: 'SAMPLE-001'
    };
  }

  /**
   * Generate preview HTML with validation info
   */
  public generatePreviewWithValidation(templatePath: string, customData?: PreviewData): string {
    const preview = this.generatePreview(templatePath, customData);
    const validation = preview.metadata.validationResult;
    
    let validationHtml = '';
    if (validation && (!validation.isValid || validation.warnings.length > 0)) {
      validationHtml = `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Template Validation Issues</h4>
          ${validation.errors.map((error: any) => `
            <div style="color: #dc2626; margin: 5px 0;">
              <strong>Error:</strong> ${error.message}
              ${error.line ? ` (Line ${error.line})` : ''}
            </div>
          `).join('')}
          ${validation.warnings.map((warning: any) => `
            <div style="color: #d97706; margin: 5px 0;">
              <strong>Warning:</strong> ${warning.message}
              ${warning.line ? ` (Line ${warning.line})` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Template Preview - ${templatePath}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .preview-container { max-width: 800px; margin: 0 auto; }
          .preview-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .preview-content { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
          .preview-iframe { width: 100%; height: 600px; border: none; }
          .metadata { background: #f8fafc; padding: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="preview-header">
            <h1>Template Preview</h1>
            <p><strong>Template:</strong> ${templatePath}</p>
            <p><strong>Render Time:</strong> ${preview.metadata.renderTime}ms</p>
            <p><strong>Variables Used:</strong> ${preview.metadata.variablesUsed.join(', ')}</p>
          </div>
          
          ${validationHtml}
          
          <div class="preview-content">
            <iframe class="preview-iframe" srcdoc="${this.escapeHtml(preview.html)}"></iframe>
            <div class="metadata">
              <p><strong>Data Provided:</strong> ${preview.metadata.dataProvided.join(', ')}</p>
              <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Escape HTML for iframe srcdoc
   */
  private escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Export default instance
export default TemplatePreviewService;

