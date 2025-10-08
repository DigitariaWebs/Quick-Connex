import { NextRequest, NextResponse } from 'next/server';
import { TemplateValidator } from '@/lib/templates/template-validator';

// Note: Template validation endpoints are for development use and don't require authentication

/**
 * POST /api/templates/validate - Validate a template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templatePath, data } = body;

    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template path is required' },
        { status: 400 }
      );
    }

    const validator = TemplateValidator.getInstance();
    const result = validator.validateTemplate(templatePath, data);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Template validation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/templates/validate?templatePath=... - Validate a template with sample data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templatePath = searchParams.get('templatePath');

    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template path is required' },
        { status: 400 }
      );
    }

    const validator = TemplateValidator.getInstance();
    const result = validator.validateTemplate(templatePath);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Template validation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
