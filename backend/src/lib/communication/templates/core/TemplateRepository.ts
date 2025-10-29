/**
 * Template Repository
 * 
 * Manages template loading with hybrid storage (code + database).
 */

import { CommunicationTemplate } from '../../../../types/communication';
import { CommunicationTemplate as CommunicationTemplateModel } from '../../../../models/CommunicationTemplate';
import { log } from '../../../logging';
import { createCommunicationContext } from '../../utils/logger';

interface CachedTemplate {
  template: CommunicationTemplate;
  cachedAt: Date;
}

export class TemplateRepository {
  private static instance: TemplateRepository;
  private codeTemplates: Map<string, CommunicationTemplate>;
  private cache: Map<string, CachedTemplate>;
  private cacheConfig: {
    ttl: number; // Time to live in milliseconds
    maxSize: number;
  };

  private constructor() {
    this.codeTemplates = new Map();
    this.cache = new Map();
    this.cacheConfig = {
      ttl: 3600000, // 1 hour
      maxSize: 1000
    };
  }

  public static getInstance(): TemplateRepository {
    if (!TemplateRepository.instance) {
      TemplateRepository.instance = new TemplateRepository();
    }
    return TemplateRepository.instance;
  }

  /**
   * Load template with fallback chain: Cache -> Database -> Code
   */
  public async getTemplate(templateId: string): Promise<CommunicationTemplate | null> {
    try {
      // Check cache first
      const cached = this.cache.get(templateId);
      if (cached && this.isCacheValid(cached)) {
        log.debug('Template loaded from cache', 
          createCommunicationContext('template_repository_cache_hit', {
            templateId
          })
        );
        return cached.template;
      }

      // Try database (optional override)
      const dbTemplate = await this.loadFromDatabase(templateId);
      if (dbTemplate) {
        this.cacheTemplate(templateId, dbTemplate);
        log.debug('Template loaded from database', 
          createCommunicationContext('template_repository_db_load', {
            templateId,
            version: dbTemplate.version
          })
        );
        return dbTemplate;
      }

      // Fallback to code templates
      const codeTemplate = this.loadFromCode(templateId);
      if (codeTemplate) {
        this.cacheTemplate(templateId, codeTemplate);
        log.debug('Template loaded from code', 
          createCommunicationContext('template_repository_code_load', {
            templateId
          })
        );
        return codeTemplate;
      }

      log.warn('Template not found', 
        createCommunicationContext('template_repository_not_found', {
          templateId
        })
      );
      return null;
    } catch (error) {
      log.error('Failed to load template', 
        createCommunicationContext('template_repository_load_error', {
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      return null;
    }
  }

  /**
   * Load template from database (optional override)
   */
  private async loadFromDatabase(templateId: string): Promise<CommunicationTemplate | null> {
    try {
      const dbTemplate = await CommunicationTemplateModel.findActiveById(templateId);
      if (!dbTemplate) return null;

      // Convert Mongoose document to our interface
      const template: CommunicationTemplate = {
        id: dbTemplate.id,
        name: dbTemplate.name,
        channel: dbTemplate.channel,
        category: dbTemplate.category,
        text: dbTemplate.text,
        variables: dbTemplate.variables,
        isActive: dbTemplate.isActive,
        version: dbTemplate.version,
        createdAt: dbTemplate.createdAt,
        updatedAt: dbTemplate.updatedAt,
        ...(dbTemplate.subject && { subject: dbTemplate.subject }),
        ...(dbTemplate.html && { html: dbTemplate.html })
      };

      return template;
    } catch (error) {
      log.error('Database template load failed', 
        createCommunicationContext('template_repository_db_error', {
          templateId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
      return null;
    }
  }

  /**
   * Load template from code definitions
   */
  private loadFromCode(templateId: string): CommunicationTemplate | null {
    return this.codeTemplates.get(templateId) || null;
  }

  /**
   * Register code templates on initialization
   */
  public registerCodeTemplates(templates: CommunicationTemplate[]): void {
    this.codeTemplates.clear();
    
    for (const template of templates) {
      this.codeTemplates.set(template.id, template);
    }

    log.info('Code templates registered', 
      createCommunicationContext('template_repository_code_register', {
        templateCount: templates.length,
        templateIds: templates.map(t => t.id)
      })
    );
  }

  /**
   * Cache a template
   */
  private cacheTemplate(templateId: string, template: CommunicationTemplate): void {
    // Check cache size limit
    if (this.cache.size >= this.cacheConfig.maxSize) {
      this.evictOldestCacheEntry();
    }

    this.cache.set(templateId, {
      template,
      cachedAt: new Date()
    });
  }

  /**
   * Check if cached template is still valid
   */
  private isCacheValid(cached: CachedTemplate): boolean {
    const age = Date.now() - cached.cachedAt.getTime();
    return age < this.cacheConfig.ttl;
  }

  /**
   * Evict the oldest cache entry
   */
  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (cached.cachedAt.getTime() < oldestTime) {
        oldestTime = cached.cachedAt.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      log.debug('Evicted oldest cache entry', 
        createCommunicationContext('template_repository_cache_evict', {
          templateId: oldestKey
        })
      );
    }
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    
    log.info('Template cache cleared', 
      createCommunicationContext('template_repository_cache_clear', {
        clearedEntries: cacheSize
      })
    );
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    const totalRequests = this.cache.size; // Simplified for now
    const hitRate = totalRequests > 0 ? 100 : 0; // Simplified calculation
    
    return {
      size: this.cache.size,
      hitRate
    };
  }

  /**
   * Get all available templates
   */
  public getAvailableTemplates(channel?: string, category?: string): CommunicationTemplate[] {
    const templates: CommunicationTemplate[] = [];
    
    // Add code templates
    for (const template of Array.from(this.codeTemplates.values())) {
      if (this.matchesFilter(template, channel, category)) {
        templates.push(template);
      }
    }

    // Add cached templates (avoid duplicates)
    for (const cached of Array.from(this.cache.values())) {
      if (this.matchesFilter(cached.template, channel, category)) {
        const exists = templates.some(t => t.id === cached.template.id);
        if (!exists) {
          templates.push(cached.template);
        }
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Check if template matches filter criteria
   */
  private matchesFilter(template: CommunicationTemplate, channel?: string, category?: string): boolean {
    if (!template.isActive) return false;
    if (channel && template.channel !== channel) return false;
    if (category && template.category !== category) return false;
    return true;
  }

  /**
   * Get template by ID from any source
   */
  public async getTemplateById(templateId: string): Promise<CommunicationTemplate | null> {
    return this.getTemplate(templateId);
  }

  /**
   * Check if template exists
   */
  public async hasTemplate(templateId: string): Promise<boolean> {
    const template = await this.getTemplate(templateId);
    return template !== null;
  }

  /**
   * Get template count by source
   */
  public getTemplateCounts(): { code: number; cache: number; total: number } {
    const codeCount = this.codeTemplates.size;
    const cacheCount = this.cache.size;
    const total = Math.max(codeCount, cacheCount); // Simplified calculation
    
    return { code: codeCount, cache: cacheCount, total };
  }
}
