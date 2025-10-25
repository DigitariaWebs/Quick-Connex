import { NextRequest, NextResponse } from 'next/server';
import { TemplateLoader, TemplateValidator } from '@/lib/communication';

// Note: Template list endpoint is for development use and doesn't require authentication

/**
 * GET /api/templates/list - Get list of available templates with metadata
 */
export async function GET(request: NextRequest) {
  try {
    const templateLoader = TemplateLoader.getInstance();
    const templateValidator = TemplateValidator.getInstance();
    
    const templates = templateLoader.getAvailableTemplates();
    
    const templatesWithMetadata = templates.map(templatePath => {
      const metadata = templateValidator.getTemplateMetadata(templatePath);
      const validation = templateValidator.validateTemplate(templatePath);
      
      return {
        path: templatePath,
        name: templatePath.split('/').pop()?.replace('.html', '') || templatePath,
        category: templatePath.split('/')[0] || 'uncategorized',
        metadata,
        validation: {
          isValid: validation.isValid,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length
        }
      };
    });

    return NextResponse.json({
      success: true,
      templates: templatesWithMetadata,
      total: templates.length
    });

  } catch (error) {
    console.error('Template list error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
