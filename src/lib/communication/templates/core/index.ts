/**
 * Communication Template Core Utilities
 * 
 * Handlebars-based template management system for loading,
 * validating, and previewing email templates.
 */

export { TemplateLoader } from './TemplateLoader';
export { TemplateValidator } from './TemplateValidator';
export { TemplatePreviewService } from './TemplatePreviewService';

// Re-export types
export type {
  ValidationError,
  ValidationResult,
  TemplateMetadata
} from './TemplateValidator';

export type {
  PreviewData,
  PreviewResult,
  SampleDataGenerator
} from './TemplatePreviewService';

