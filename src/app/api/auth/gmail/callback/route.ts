/**
 * Gmail OAuth Callback Endpoint
 * 
 * This endpoint handles the OAuth2 callback from Google
 * and exchanges the authorization code for tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// GET /api/auth/gmail/callback - Handle OAuth2 callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(
        `<html>
          <body>
            <h1>Gmail OAuth Error</h1>
            <p>Error: ${error}</p>
            <p>Please try again.</p>
            <a href="/api/auth/gmail">Start OAuth Flow</a>
          </body>
        </html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    if (!code) {
      return new NextResponse(
        `<html>
          <body>
            <h1>Gmail OAuth Error</h1>
            <p>No authorization code received.</p>
            <a href="/api/auth/gmail">Start OAuth Flow</a>
          </body>
        </html>`,
        { 
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
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

    // Test the tokens by getting user profile
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    // Display success page with tokens
    return new NextResponse(
      `<html>
        <body>
          <h1>✅ Gmail OAuth Success!</h1>
          <p><strong>Email:</strong> ${profile.data.emailAddress}</p>
          <h2>Tokens (save these to your .env.local file):</h2>
          <div style="background: #f5f5f5; padding: 10px; margin: 10px 0; font-family: monospace;">
            <p><strong>Access Token:</strong></p>
            <textarea readonly style="width: 100%; height: 60px;">${tokens.access_token}</textarea>
            <p><strong>Refresh Token:</strong></p>
            <textarea readonly style="width: 100%; height: 60px;">${tokens.refresh_token}</textarea>
          </div>
          <h3>Add these to your .env.local file:</h3>
          <div style="background: #e8f5e8; padding: 10px; margin: 10px 0; font-family: monospace;">
            <p>GMAIL_ACCESS_TOKEN=${tokens.access_token}</p>
            <p>GMAIL_REFRESH_TOKEN=${tokens.refresh_token}</p>
          </div>
          <p><a href="/api/auth/gmail">Start New OAuth Flow</a></p>
        </body>
      </html>`,
      { 
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

  } catch (error) {
    console.error('Gmail OAuth callback error:', error);
    return new NextResponse(
      `<html>
        <body>
          <h1>Gmail OAuth Error</h1>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <a href="/api/auth/gmail">Try Again</a>
        </body>
      </html>`,
      { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}
