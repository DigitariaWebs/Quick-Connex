import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export interface ValidationError {
  type: 'handlebars' | 'html' | 'variable' | 'file';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  templatePath: string;
  validatedAt: Date;
}

export interface TemplateMetadata {
  variables: string[];
  helpers: string[];
  partials: string[];
  hasConditionals: boolean;
  hasLoops: boolean;
}

/**
 * Template validation service for checking template syntax and structure
 */
export class TemplateValidator {
  private static instance: TemplateValidator;

  private constructor() {}

  public static getInstance(): TemplateValidator {
    if (!TemplateValidator.instance) {
      TemplateValidator.instance = new TemplateValidator();
    }
    return TemplateValidator.instance;
  }

  /**
   * Validate a template file
   */
  public validateTemplate(templatePath: string, data?: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Check if template file exists
      const fullPath = path.join(process.cwd(), 'src', 'templates', templatePath);
      if (!fs.existsSync(fullPath)) {
        errors.push({
          type: 'file',
          message: `Template file not found: ${templatePath}`,
          severity: 'error'
        });
        return this.createValidationResult(templatePath, errors, warnings);
      }

      // Read template content
      const templateContent = fs.readFileSync(fullPath, 'utf-8');

      // Validate Handlebars syntax
      const handlebarsErrors = this.validateHandlebars(templateContent, templatePath);
      errors.push(...handlebarsErrors.filter(e => e.severity === 'error'));
      warnings.push(...handlebarsErrors.filter(e => e.severity === 'warning'));

      // Validate HTML structure
      const htmlErrors = this.validateHTML(templateContent, templatePath);
      errors.push(...htmlErrors.filter(e => e.severity === 'error'));
      warnings.push(...htmlErrors.filter(e => e.severity === 'warning'));

      // Validate variables if data is provided
      if (data) {
        const variableErrors = this.validateVariables(templateContent, data, templatePath);
        errors.push(...variableErrors.filter(e => e.severity === 'error'));
        warnings.push(...variableErrors.filter(e => e.severity === 'warning'));
      }

    } catch (error) {
      errors.push({
        type: 'file',
        message: `Error reading template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }

    return this.createValidationResult(templatePath, errors, warnings);
  }

  /**
   * Validate Handlebars syntax
   */
  private validateHandlebars(content: string, templatePath: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      // Try to compile the template
      Handlebars.compile(content);
    } catch (error) {
      if (error instanceof Error) {
        // Parse error message for line/column info
        const lineMatch = error.message.match(/Parse error on line (\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1]) : undefined;

        errors.push({
          type: 'handlebars',
          message: `Handlebars syntax error: ${error.message}`,
          line,
          severity: 'error'
        });
      }
    }

    // Check for common Handlebars issues
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for unclosed blocks
      const openBlocks = (line.match(/\{\{#/g) || []).length;
      const closeBlocks = (line.match(/\{\{\//g) || []).length;
      
      if (openBlocks > closeBlocks) {
        // Check if there's a corresponding closing block
        const hasClosingBlock = this.findClosingBlock(lines, index);
        if (!hasClosingBlock) {
          errors.push({
            type: 'handlebars',
            message: `Unclosed Handlebars block starting at line ${lineNumber}`,
            line: lineNumber,
            severity: 'error'
          });
        }
      }

      // Check for malformed expressions
      const malformedExpressions = line.match(/\{\{[^}]*$/g);
      if (malformedExpressions) {
        errors.push({
          type: 'handlebars',
          message: `Malformed Handlebars expression at line ${lineNumber}`,
          line: lineNumber,
          severity: 'error'
        });
      }

      // Check for empty expressions
      const emptyExpressions = line.match(/\{\{\s*\}\}/g);
      if (emptyExpressions) {
        errors.push({
          type: 'handlebars',
          message: `Empty Handlebars expression at line ${lineNumber}`,
          line: lineNumber,
          severity: 'warning'
        });
      }
    });

    return errors;
  }

  /**
   * Validate HTML structure
   */
  private validateHTML(content: string, templatePath: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // For now, skip HTML validation for templates with complex formatting
    // This is because the multi-line style attributes in our templates
    // make it difficult to parse correctly with a simple regex approach
    
    // Basic checks for obvious issues
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for unclosed tags on the same line
      const openCount = (line.match(/</g) || []).length;
      const closeCount = (line.match(/>/g) || []).length;
      
      if (openCount !== closeCount) {
        // This might be a multi-line tag, which is common in our templates
        // Skip this check for now
      }

      // Check for obvious malformed tags
      const malformedTags = line.match(/<[^>]*$/g);
      if (malformedTags && !line.trim().endsWith('>')) {
        errors.push({
          type: 'html',
          message: `Potentially malformed HTML tag at line ${lineNumber}`,
          line: lineNumber,
          severity: 'warning'
        });
      }
    });

    // Check for basic HTML structure
    if (!content.includes('<html>') && !content.includes('<HTML>')) {
      errors.push({
        type: 'html',
        message: 'Template should contain <html> tag',
        severity: 'warning'
      });
    }

    if (!content.includes('<body>') && !content.includes('<BODY>')) {
      errors.push({
        type: 'html',
        message: 'Template should contain <body> tag',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Validate template variables against provided data
   */
  private validateVariables(content: string, data: Record<string, any>, templatePath: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Extract all variables from template
    const variables = this.extractVariables(content);
    
    // Check for missing variables
    variables.forEach(variable => {
      if (!(variable in data)) {
        errors.push({
          type: 'variable',
          message: `Variable '${variable}' is used in template but not provided in data`,
          severity: 'warning'
        });
      }
    });

    // Check for unused data properties
    Object.keys(data).forEach(key => {
      if (!variables.includes(key)) {
        errors.push({
          type: 'variable',
          message: `Data property '${key}' is provided but not used in template`,
          severity: 'warning'
        });
      }
    });

    return errors;
  }

  /**
   * Extract all variables from a Handlebars template
   */
  private extractVariables(content: string): string[] {
    const variables: string[] = [];
    
    // Match {{variable}} patterns (but not {{#if}}, {{/if}}, etc.)
    const matches = content.match(/\{\{([^#\/][^}]*)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const variable = match.replace(/\{\{|\}\}/g, '').trim();
        
        // Skip helpers and special keywords
        if (!this.isHelper(variable) && !this.isSpecialKeyword(variable)) {
          // Extract variable name (handle nested properties like user.name)
          const varName = variable.split('.')[0].trim();
          if (varName && !variables.includes(varName)) {
            variables.push(varName);
          }
        }
      });
    }

    return variables;
  }

  /**
   * Get template metadata
   */
  public getTemplateMetadata(templatePath: string): TemplateMetadata {
    try {
      const fullPath = path.join(process.cwd(), 'src', 'templates', templatePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      const variables = this.extractVariables(content);
      const helpers = this.extractHelpers(content);
      const partials = this.extractPartials(content);
      const hasConditionals = content.includes('{{#if') || content.includes('{{#unless');
      const hasLoops = content.includes('{{#each') || content.includes('{{#with');

      return {
        variables,
        helpers,
        partials,
        hasConditionals,
        hasLoops
      };
    } catch (error) {
      return {
        variables: [],
        helpers: [],
        partials: [],
        hasConditionals: false,
        hasLoops: false
      };
    }
  }

  /**
   * Extract helpers from template
   */
  private extractHelpers(content: string): string[] {
    const helpers: string[] = [];
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    
    if (matches) {
      matches.forEach(match => {
        const expression = match.replace(/\{\{|\}\}/g, '').trim();
        if (this.isHelper(expression)) {
          const helperName = expression.split(' ')[0];
          if (!helpers.includes(helperName)) {
            helpers.push(helperName);
          }
        }
      });
    }

    return helpers;
  }

  /**
   * Extract partials from template
   */
  private extractPartials(content: string): string[] {
    const partials: string[] = [];
    const matches = content.match(/\{\{>\s*([^}]+)\s*\}\}/g);
    
    if (matches) {
      matches.forEach(match => {
        const partialName = match.replace(/\{\{>\s*|\s*\}\}/g, '').trim();
        if (!partials.includes(partialName)) {
          partials.push(partialName);
        }
      });
    }

    return partials;
  }

  /**
   * Check if a tag is self-closing
   */
  private isSelfClosingTag(tagName: string): boolean {
    const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    return selfClosingTags.includes(tagName.toLowerCase());
  }

  /**
   * Check if an expression is a helper
   */
  private isHelper(expression: string): boolean {
    const helpers = ['if', 'unless', 'each', 'with', 'eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'and', 'or', 'not', 'lowercase', 'uppercase'];
    const firstWord = expression.split(' ')[0];
    return helpers.includes(firstWord);
  }

  /**
   * Check if an expression is a special keyword
   */
  private isSpecialKeyword(expression: string): boolean {
    const keywords = ['this', 'root', '@index', '@key', '@first', '@last'];
    return keywords.includes(expression);
  }

  /**
   * Find closing block for an opening block
   */
  private findClosingBlock(lines: string[], startIndex: number): boolean {
    const startLine = lines[startIndex];
    const blockMatch = startLine.match(/\{\{#(\w+)/);
    if (!blockMatch) return false;

    const blockName = blockMatch[1];
    let depth = 1;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const openBlocks = (line.match(new RegExp(`\\{\\{#${blockName}`, 'g')) || []).length;
      const closeBlocks = (line.match(new RegExp(`\\{\\{/${blockName}`, 'g')) || []).length;
      
      depth += openBlocks - closeBlocks;
      
      if (depth === 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create validation result
   */
  private createValidationResult(templatePath: string, errors: ValidationError[], warnings: ValidationError[]): ValidationResult {
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      templatePath,
      validatedAt: new Date()
    };
  }
}

// Export default instance
export default TemplateValidator;
