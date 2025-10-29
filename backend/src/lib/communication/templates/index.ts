/**
 * Communication Templates
 * 
 * Template system for communication messages with Handlebars support.
 */

// Core template system
export { TemplateEngine } from './core/TemplateEngine';
export { TemplateRepository } from './core/TemplateRepository';
export { TemplateService } from './core/TemplateService';

// Template definitions
export { EMAIL_TEMPLATES } from './definitions/email-templates';
export { SMS_TEMPLATES } from './definitions/sms-templates';

// Legacy exports for backward compatibility
export { createEmailFromNotification, generateEmailHTML } from './email-templates';
export { createSMSFromNotification, generateSMSText, getSMSTemplates, renderSMSTemplate } from './sms-templates';

// Convenience exports
export const getTemplateService = () => {
  const { TemplateService } = require('./core/TemplateService');
  return TemplateService.getInstance();
};
export const getTemplateRepository = () => {
  const { TemplateRepository } = require('./core/TemplateRepository');
  return TemplateRepository.getInstance();
};
export const getTemplateEngine = () => {
  const { TemplateEngine } = require('./core/TemplateEngine');
  return TemplateEngine.getInstance();
};