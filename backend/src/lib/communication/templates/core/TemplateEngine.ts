/**
 * Template Engine
 * 
 * Handlebars-based template engine with caching and helper functions.
 */

import * as Handlebars from 'handlebars';
import { log } from '../../../logging';
import { createCommunicationContext } from '../../utils/logger';

export class TemplateEngine {
  private static instance: TemplateEngine;
  private compiledCache: Map<string, HandlebarsTemplateDelegate>;
  private cacheStats: { hits: number; misses: number };

  private constructor() {
    this.compiledCache = new Map();
    this.cacheStats = { hits: 0, misses: 0 };
    this.registerHelpers();
  }

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  /**
   * Register Handlebars helpers for common operations
   */
  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      if (!date) return '';
      
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'time':
          return d.toLocaleTimeString();
        case 'datetime':
          return d.toLocaleString();
        default:
          return d.toLocaleDateString();
      }
    });

    // String capitalization helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str || typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // String truncation helper
    Handlebars.registerHelper('truncate', (str: string, length: number, suffix = '...') => {
      if (!str || typeof str !== 'string') return '';
      if (str.length <= length) return str;
      return str.substring(0, length - suffix.length) + suffix;
    });

    // Conditional helper for urgent messages
    Handlebars.registerHelper('ifUrgent', function(this: any, priority: string, options: any) {
      if (priority === 'urgent') {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Conditional helper for high priority
    Handlebars.registerHelper('ifHighPriority', function(this: any, priority: string, options: any) {
      if (priority === 'urgent' || priority === 'high') {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Format phone number helper
    Handlebars.registerHelper('formatPhone', (phone: string) => {
      if (!phone) return '';
      // Basic phone formatting - can be enhanced
      return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    });

    // Format currency helper
    Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'USD') => {
      if (typeof amount !== 'number') return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Safe HTML helper (escapes HTML)
    Handlebars.registerHelper('safe', (str: string) => {
      if (!str) return '';
      return new Handlebars.SafeString(str);
    });

    // Conditional helper for email vs SMS
    Handlebars.registerHelper('ifEmail', function(this: any, channel: string, options: any) {
      if (channel === 'email') {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Conditional helper for SMS
    Handlebars.registerHelper('ifSMS', function(this: any, channel: string, options: any) {
      if (channel === 'sms') {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    log.debug('Handlebars helpers registered', 
      createCommunicationContext('template_engine_helpers_registered', {
        helpers: [
          'formatDate', 'capitalize', 'truncate', 'ifUrgent', 'ifHighPriority',
          'formatPhone', 'formatCurrency', 'safe', 'ifEmail', 'ifSMS'
        ]
      })
    );
  }

  /**
   * Compile a template string and cache the result
   */
  public compile(template: string, templateId?: string): HandlebarsTemplateDelegate {
    const cacheKey = templateId || template;
    
    // Check cache first
    if (this.compiledCache.has(cacheKey)) {
      this.cacheStats.hits++;
      log.debug('Template compiled from cache', 
        createCommunicationContext('template_engine_cache_hit', {
          templateId: cacheKey
        })
      );
      return this.compiledCache.get(cacheKey)!;
    }

    try {
      const compiled = Handlebars.compile(template);
      this.compiledCache.set(cacheKey, compiled);
      this.cacheStats.misses++;
      
      log.debug('Template compiled and cached', 
        createCommunicationContext('template_engine_compile', {
          templateId: cacheKey,
          templateLength: template.length
        })
      );
      
      return compiled;
    } catch (error) {
      log.error('Template compilation failed', 
        createCommunicationContext('template_engine_compile_error', {
          templateId: cacheKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw new Error(`Template compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render a template string with data
   */
  public render(template: string, data: Record<string, any>, templateId?: string): string {
    try {
      const compiled = this.compile(template, templateId);
      return this.renderCompiled(compiled, data);
    } catch (error) {
      log.error('Template rendering failed', 
        createCommunicationContext('template_engine_render_error', {
          templateId: templateId || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw error;
    }
  }

  /**
   * Render a compiled template with data
   */
  public renderCompiled(compiled: HandlebarsTemplateDelegate, data: Record<string, any>): string {
    try {
      const result = compiled(data);
      
      log.debug('Template rendered successfully', 
        createCommunicationContext('template_engine_render_success', {
          resultLength: result.length
        })
      );
      
      return result;
    } catch (error) {
      log.error('Compiled template rendering failed', 
        createCommunicationContext('template_engine_render_compiled_error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the compilation cache
   */
  public clearCache(): void {
    const cacheSize = this.compiledCache.size;
    this.compiledCache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
    
    log.info('Template cache cleared', 
      createCommunicationContext('template_engine_cache_cleared', {
        clearedTemplates: cacheSize
      })
    );
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
    
    return {
      size: this.compiledCache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Validate template syntax
   */
  public validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown template error'
      };
    }
  }

  /**
   * Extract variables from template
   */
  public extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const variableRegex = /\{\{([^#\/][^}]*)\}\}/g;
    let match;
    
    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1]?.trim();
      if (!variable) continue;
      // Remove helpers and modifiers
      const cleanVariable = variable.split(' ')[0]?.split('.')[0];
      if (cleanVariable && !cleanVariable.startsWith('@')) {
        variables.add(cleanVariable);
      }
    }
    
    return Array.from(variables);
  }
}
