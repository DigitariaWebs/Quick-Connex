/**
 * Communication Template Types
 * 
 * Template system types for email and SMS templates.
 */

import { CommunicationChannel, CommunicationContent } from './core.types';

/**
 * Template Variable Definition
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

/**
 * Template Category
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  channels: CommunicationChannel[];
  isActive: boolean;
}

/**
 * Template Rendering Context
 */
export interface TemplateRenderingContext {
  templateId: string;
  data: Record<string, any>;
  channel: CommunicationChannel;
  locale?: string;
  timezone?: string;
  userId?: string;
}

/**
 * Template Rendering Result
 */
export interface TemplateRenderingResult {
  success: boolean;
  content?: CommunicationContent;
  error?: string;
  warnings?: string[];
  variables?: {
    used: string[];
    missing: string[];
    unused: string[];
  };
}

/**
 * Template Validation Result
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: TemplateValidationWarning[];
}

/**
 * Template Validation Error
 */
export interface TemplateValidationError {
  type: 'syntax' | 'variable' | 'structure' | 'security';
  message: string;
  line?: number;
  column?: number;
  variable?: string;
}

/**
 * Template Validation Warning
 */
export interface TemplateValidationWarning {
  type: 'performance' | 'accessibility' | 'best_practice';
  message: string;
  suggestion?: string;
  line?: number;
  column?: number;
}

/**
 * Template Preview Options
 */
export interface TemplatePreviewOptions {
  templateId: string;
  sampleData?: Record<string, any>;
  channel: CommunicationChannel;
  locale?: string;
  timezone?: string;
  includeMetadata?: boolean;
}

/**
 * Template Preview Result
 */
export interface TemplatePreviewResult {
  success: boolean;
  preview?: {
    subject?: string;
    text: string;
    html?: string;
    metadata?: {
      variables: string[];
      characterCount: number;
      estimatedCost?: number;
    };
  };
  error?: string;
}

/**
 * Template Loader Interface
 */
export interface ITemplateLoader {
  loadTemplate(templateId: string): Promise<string>;
  loadTemplateFromFile(filePath: string): Promise<string>;
  renderTemplate(templateId: string, data: Record<string, any>): Promise<TemplateRenderingResult>;
  validateTemplate(templateId: string): Promise<TemplateValidationResult>;
  generatePreview(options: TemplatePreviewOptions): Promise<TemplatePreviewResult>;
  getAvailableTemplates(channel?: CommunicationChannel): Promise<string[]>;
  clearCache(): Promise<void>;
}

/**
 * Template Validator Interface
 */
export interface ITemplateValidator {
  validateTemplate(templateId: string, content: string): Promise<TemplateValidationResult>;
  validateVariables(templateId: string, variables: string[]): Promise<TemplateValidationResult>;
  validateSyntax(content: string, channel: CommunicationChannel): Promise<TemplateValidationResult>;
  validateSecurity(content: string): Promise<TemplateValidationResult>;
}

/**
 * Template Preview Service Interface
 */
export interface ITemplatePreviewService {
  generatePreview(options: TemplatePreviewOptions): Promise<TemplatePreviewResult>;
  generateSampleData(templateId: string): Promise<Record<string, any>>;
  getTemplateMetadata(templateId: string): Promise<{
    variables: TemplateVariable[];
    category: string;
    lastModified: Date;
    size: number;
  }>;
}

/**
 * Template Cache Configuration
 */
export interface TemplateCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of templates to cache
  cleanupInterval: number; // Cleanup interval in seconds
}

/**
 * Template File System Configuration
 */
export interface TemplateFileSystemConfig {
  basePath: string;
  emailPath: string;
  smsPath: string;
  allowedExtensions: string[];
  watchForChanges: boolean;
}

/**
 * Template Engine Configuration
 */
export interface TemplateEngineConfig {
  engine: 'handlebars' | 'mustache' | 'ejs' | 'nunjucks';
  options: Record<string, any>;
  helpers?: Record<string, Function>;
  filters?: Record<string, Function>;
  partials?: Record<string, string>;
}

/**
 * Template Compilation Result
 */
export interface TemplateCompilationResult {
  success: boolean;
  compiledTemplate?: Function;
  error?: string;
  warnings?: string[];
  metadata?: {
    variables: string[];
    dependencies: string[];
    size: number;
  };
}

/**
 * Template Render Options (Handlebars-specific)
 */
export interface TemplateRenderOptions {
  templateId: string;
  data: Record<string, any>;
  channel: CommunicationChannel;
  useCache?: boolean;
}

/**
 * Template Render Result (Handlebars-specific)
 */
export interface TemplateRenderResult {
  success: boolean;
  content?: CommunicationContent;
  error?: string;
  templateVersion?: number;
  source: 'code' | 'database' | 'cache';
}

