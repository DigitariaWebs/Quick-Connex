import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

/**
 * Template loader utility for loading and rendering HTML templates
 */
export class TemplateLoader {
  private static instance: TemplateLoader;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  private constructor() {
    // Register Handlebars helpers
    this.registerHelpers();
  }

  public static getInstance(): TemplateLoader {
    if (!TemplateLoader.instance) {
      TemplateLoader.instance = new TemplateLoader();
    }
    return TemplateLoader.instance;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Helper for conditional rendering
    Handlebars.registerHelper('if', function(this: any, conditional, options) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    // Helper for equality comparison
    Handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Helper for lowercase
    Handlebars.registerHelper('lowercase', function(str) {
      return str ? str.toLowerCase() : '';
    });

    // Helper for uppercase
    Handlebars.registerHelper('uppercase', function(str) {
      return str ? str.toUpperCase() : '';
    });
  }

  /**
   * Load template from file system
   */
  private loadTemplate(templatePath: string): string {
    try {
      const fullPath = path.join(process.cwd(), 'src', 'lib', 'communication', 'templates', 'files', templatePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Error loading template ${templatePath}:`, error);
      throw new Error(`Template not found: ${templatePath}`);
    }
  }

  /**
   * Get compiled template (with caching)
   */
  private getCompiledTemplate(templatePath: string): HandlebarsTemplateDelegate {
    if (this.templateCache.has(templatePath)) {
      return this.templateCache.get(templatePath)!;
    }

    const templateSource = this.loadTemplate(templatePath);
    const compiledTemplate = Handlebars.compile(templateSource);
    this.templateCache.set(templatePath, compiledTemplate);
    
    return compiledTemplate;
  }

  /**
   * Render template with data
   */
  public renderTemplate(templatePath: string, data: Record<string, any>): string {
    const compiledTemplate = this.getCompiledTemplate(templatePath);
    return compiledTemplate(data);
  }

  /**
   * Convert HTML to plain text for email fallback
   * Handles common HTML elements and converts them to readable text
   */
  public htmlToText(html: string): string {
    let text = html;
    
    // Convert links to plain text with URL
    text = text.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)');
    
    // Convert headings to plain text with line breaks
    text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n');
    
    // Convert paragraphs to text with line breaks
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
    
    // Convert line breaks
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Convert lists
    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    text = text.replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n');
    
    // Convert divs with line breaks
    text = text.replace(/<\/div>/gi, '\n');
    
    // Convert strong/bold
    text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
    
    // Convert emphasis/italic
    text = text.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '_$2_');
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Normalize whitespace - collapse multiple spaces/newlines
    text = text.replace(/[ \t]+/g, ' '); // Multiple spaces to single
    text = text.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Multiple newlines to double
    text = text.replace(/^\s+|\s+$/gm, ''); // Trim each line
    
    return text.trim();
  }

  /**
   * Render template and return both HTML and plain text versions
   */
  public renderTemplateWithText(templatePath: string, data: Record<string, any>): { html: string; text: string } {
    const html = this.renderTemplate(templatePath, data);
    const text = this.htmlToText(html);
    return { html, text };
  }

  /**
   * Clear template cache (useful for development)
   */
  public clearCache(): void {
    this.templateCache.clear();
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates(): string[] {
    const templatesDir = path.join(process.cwd(), 'src', 'lib', 'communication', 'templates', 'files');
    const templates: string[] = [];

    const scanDirectory = (dir: string, relativePath: string = '') => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath, path.join(relativePath, item));
          } else if (item.endsWith('.html')) {
            templates.push(path.join(relativePath, item));
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    };

    scanDirectory(templatesDir);
    return templates;
  }
}

// Export default instance
export default TemplateLoader;
