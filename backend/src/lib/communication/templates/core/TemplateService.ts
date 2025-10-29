/**
 * Template Service
 * 
 * High-level template operations and rendering.
 */

import { 
  CommunicationTemplate, 
  CommunicationChannel, 
  CommunicationContent,
  TemplateRenderOptions,
  TemplateRenderResult
} from '../../../../types/communication';
import { TemplateEngine } from './TemplateEngine';
import { TemplateRepository } from './TemplateRepository';
import { log } from '../../../logging';
import { createCommunicationContext } from '../../utils/logger';

export class TemplateService {
  private static instance: TemplateService;
  private engine: TemplateEngine;
  private repository: TemplateRepository;

  private constructor() {
    this.engine = TemplateEngine.getInstance();
    this.repository = TemplateRepository.getInstance();
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Render a template with data
   */
  public async renderTemplate(options: TemplateRenderOptions): Promise<TemplateRenderResult> {
    try {
      log.debug('Rendering template', 
        createCommunicationContext('template_service_render_start', {
          templateId: options.templateId,
          channel: options.channel,
          useCache: options.useCache
        })
      );

      // Get template
      const template = await this.repository.getTemplate(options.templateId);
      if (!template) {
        return {
          success: false,
          error: `Template '${options.templateId}' not found`,
          source: 'code'
        };
      }

      // Validate template data
      const validation = this.validateTemplateData(options.templateId, options.data, template.variables);
      if (!validation.valid) {
        return {
          success: false,
          error: `Missing required variables: ${validation.missing.join(', ')}`,
          source: 'code'
        };
      }

      // Render based on channel
      let content: CommunicationContent;
      
      if (options.channel === 'email') {
        content = await this.renderEmailTemplate(template, options.data);
      } else if (options.channel === 'sms') {
        content = await this.renderSMSTemplate(template, options.data);
      } else {
        return {
          success: false,
          error: `Unsupported channel: ${options.channel}`,
          source: 'code'
        };
      }

      log.debug('Template rendered successfully', 
        createCommunicationContext('template_service_render_success', {
          templateId: options.templateId,
          channel: options.channel,
          contentLength: JSON.stringify(content).length
        })
      );

      return {
        success: true,
        content,
        templateVersion: 1, // Simplified for now
        source: 'code'
      };
    } catch (error) {
      log.error('Template rendering failed', 
        createCommunicationContext('template_service_render_error', {
          templateId: options.templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'code'
      };
    }
  }

  /**
   * Render email template
   */
  private async renderEmailTemplate(template: CommunicationTemplate, data: Record<string, any>): Promise<CommunicationContent> {
    const content: CommunicationContent = {
      subject: '',
      text: '',
      html: ''
    };

    // Render subject
    if (template.subject) {
      content.subject = this.engine.render(template.subject, data, `${template.id}_subject`);
    }

    // Render text content
    if (template.text) {
      content.text = this.engine.render(template.text, data, `${template.id}_text`);
    }

    // Render HTML content
    if (template.html) {
      content.html = this.engine.render(template.html, data, `${template.id}_html`);
    }

    return content;
  }

  /**
   * Render SMS template
   */
  private async renderSMSTemplate(template: CommunicationTemplate, data: Record<string, any>): Promise<CommunicationContent> {
    const content: CommunicationContent = {
      text: ''
    };

    // Render text content
    if (template.text) {
      content.text = this.engine.render(template.text, data, `${template.id}_text`);
    }

    return content;
  }

  /**
   * Get template by ID
   */
  public async getTemplate(templateId: string): Promise<CommunicationTemplate | null> {
    try {
      return await this.repository.getTemplate(templateId);
    } catch (error) {
      log.error('Failed to get template', 
        createCommunicationContext('template_service_get_error', {
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      return null;
    }
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(channel?: CommunicationChannel): CommunicationTemplate[] {
    return this.repository.getAvailableTemplates(channel);
  }

  /**
   * Validate template data against required variables
   */
  public validateTemplateData(templateId: string, data: Record<string, any>, requiredVariables: string[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const variable of requiredVariables) {
      if (!(variable in data) || data[variable] === undefined || data[variable] === null) {
        missing.push(variable);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get template statistics
   */
  public getTemplateStats(): {
    totalTemplates: number;
    engineStats: { size: number; hits: number; misses: number; hitRate: number };
    repositoryStats: { size: number; hitRate: number };
  } {
    const engineStats = this.engine.getCacheStats();
    const repositoryStats = this.repository.getCacheStats();
    const templateCounts = this.repository.getTemplateCounts();

    return {
      totalTemplates: templateCounts.total,
      engineStats,
      repositoryStats
    };
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.engine.clearCache();
    this.repository.clearCache();
    
    log.info('All template caches cleared', 
      createCommunicationContext('template_service_clear_caches', {})
    );
  }

  /**
   * Validate template syntax
   */
  public validateTemplateSyntax(template: string): { valid: boolean; error?: string } {
    return this.engine.validateTemplate(template);
  }

  /**
   * Extract variables from template
   */
  public extractVariables(template: string): string[] {
    return this.engine.extractVariables(template);
  }

  /**
   * Get template by channel and category
   */
  public getTemplatesByCategory(channel: CommunicationChannel, category: string): CommunicationTemplate[] {
    return this.repository.getAvailableTemplates(channel, category);
  }

  /**
   * Check if template exists
   */
  public async hasTemplate(templateId: string): Promise<boolean> {
    return await this.repository.hasTemplate(templateId);
  }

  /**
   * Get template preview (render with sample data)
   */
  public async getTemplatePreview(templateId: string, sampleData?: Record<string, any>): Promise<TemplateRenderResult> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      return {
        success: false,
        error: `Template '${templateId}' not found`,
        source: 'code'
      };
    }

    // Generate sample data if not provided
    const data = sampleData || this.generateSampleData(template);
    
    return this.renderTemplate({
      templateId,
      data,
      channel: template.channel,
      useCache: true
    });
  }

  /**
   * Generate sample data for template
   */
  private generateSampleData(template: CommunicationTemplate): Record<string, any> {
    const sampleData: Record<string, any> = {};
    
    for (const variable of template.variables) {
      switch (variable) {
        case 'firstName':
          sampleData[variable] = 'John';
          break;
        case 'lastName':
          sampleData[variable] = 'Doe';
          break;
        case 'email':
          sampleData[variable] = 'john.doe@example.com';
          break;
        case 'phone':
          sampleData[variable] = '+1234567890';
          break;
        case 'baseUrl':
          sampleData[variable] = 'http://localhost:3001';
          break;
        case 'patientName':
          sampleData[variable] = 'Jane Smith';
          break;
        case 'fromHospital':
          sampleData[variable] = 'General Hospital';
          break;
        case 'toHospital':
          sampleData[variable] = 'City Medical Center';
          break;
        case 'priority':
          sampleData[variable] = 'medium';
          break;
        case 'transferId':
          sampleData[variable] = 'TXN-12345';
          break;
        case 'reason':
          sampleData[variable] = 'Specialized care required';
          break;
        case 'resetToken':
          sampleData[variable] = 'abc123def456';
          break;
        case 'message':
          sampleData[variable] = 'This is a sample message';
          break;
        default:
          sampleData[variable] = `Sample ${variable}`;
      }
    }

    return sampleData;
  }
}
