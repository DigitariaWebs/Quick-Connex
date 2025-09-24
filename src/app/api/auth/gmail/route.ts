/**
 * Gmail OAuth Authentication Endpoint
 * 
 * This endpoint handles Gmail API OAuth2 authentication flow
 * for getting access and refresh tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// GET /api/auth/gmail - Generate OAuth2 authorization URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'auth';

    if (action === 'auth') {
      // Generate OAuth2 authorization URL
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent', // Force consent screen to get refresh token
      });

      return NextResponse.json({
        success: true,
        data: {
          authUrl,
          message: 'Visit this URL to authorize Gmail API access',
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action',
    }, { status: 400 });

  } catch (error) {
    console.error('Gmail OAuth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Gmail OAuth URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST /api/auth/gmail - Exchange code for tokens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Test the tokens by getting user profile (optional)
    let userEmail = 'Unknown';
    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      userEmail = profile.data.emailAddress || 'Unknown';
    } catch (profileError) {
      console.log('Could not get user profile, but tokens are valid');
      // Tokens are still valid even if we can't get the profile
    }

    return NextResponse.json({
      success: true,
      data: {
        tokens,
        email: userEmail,
        message: 'Gmail API authentication successful',
      },
    });

  } catch (error) {
    console.error('Gmail token exchange error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to exchange authorization code for tokens',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
