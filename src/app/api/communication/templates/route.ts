/**
 * Communication Templates API Endpoint
 * 
 * This endpoint handles communication template management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeOrManager, handleAuthError, createSuccessResponse } from '@/lib/auth/auth-utils';
import CommunicationService from '@/lib/communication/core/communication-service';
import { CommunicationChannel } from '@/types/communication';

// GET /api/communication/templates - Get communication templates
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as CommunicationChannel;
    const category = searchParams.get('category');

    const communicationService = new CommunicationService();
    let templates = await communicationService.getTemplates(channel);

    // Filter by category if specified
    if (category) {
      templates = templates.filter(template => template.category === category);
    }

    return createSuccessResponse({
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        channel: template.channel,
        category: template.category,
        subject: template.subject,
        text: template.text,
        html: template.html,
        variables: template.variables,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })),
    });

  } catch (error) {
    console.error('Error getting communication templates:', error);
    return handleAuthError(error);
  }
}

// POST /api/communication/templates - Render template with data
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await requireEmployeeOrManager();

    const body = await request.json();
    const { templateId, data } = body;

    if (!templateId || !data) {
      return NextResponse.json({ error: 'Missing required fields: templateId, data' }, { status: 400 });
    }

    const communicationService = new CommunicationService();
    const renderedContent = await communicationService.renderTemplate(templateId, data);

    return createSuccessResponse({
      templateId,
      content: renderedContent,
    });

  } catch (error) {
    console.error('Error rendering template:', error);
    return handleAuthError(error);
  }
}
