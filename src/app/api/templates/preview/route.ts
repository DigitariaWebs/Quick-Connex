import { NextRequest, NextResponse } from 'next/server';
import { TemplatePreviewService } from '@/lib/communication';

// Note: Template preview endpoints are for development use and don't require authentication

/**
 * POST /api/templates/preview - Generate template preview
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templatePath, customData, withValidation } = body;

    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template path is required' },
        { status: 400 }
      );
    }

    const previewService = TemplatePreviewService.getInstance();
    
    if (withValidation) {
      const previewHtml = previewService.generatePreviewWithValidation(templatePath, customData);
      return new NextResponse(previewHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } else {
      const result = previewService.generatePreview(templatePath, customData);
      return NextResponse.json({
        success: true,
        result
      });
    }

  } catch (error) {
    console.error('Template preview error:', error);
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
 * GET /api/templates/preview?templatePath=... - Generate template preview with sample data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templatePath = searchParams.get('templatePath');
    const withValidation = searchParams.get('withValidation') === 'true';

    if (!templatePath) {
      return NextResponse.json(
        { error: 'Template path is required' },
        { status: 400 }
      );
    }

    const previewService = TemplatePreviewService.getInstance();
    
    if (withValidation) {
      const previewHtml = previewService.generatePreviewWithValidation(templatePath);
      return new NextResponse(previewHtml, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    } else {
      const result = previewService.generatePreview(templatePath);
      return NextResponse.json({
        success: true,
        result
      });
    }

  } catch (error) {
    console.error('Template preview error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
