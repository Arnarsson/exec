import express from 'express';
import { google } from 'googleapis';

const router = express.Router();

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
);

// Authentication status endpoint
router.get('/status', async (req, res) => {
  try {
    // Check if we have stored credentials
    const hasCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    
    // In a real app, you'd check if the user is authenticated via session/JWT
    // For now, return basic status
    res.json({
      authenticated: false, // Change this based on actual auth state
      hasGoogleCredentials: hasCredentials,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({
      error: 'Failed to get authentication status',
      timestamp: new Date().toISOString()
    });
  }
});

// Start Google OAuth flow
router.get('/google', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    res.json({
      authUrl,
      message: 'Redirect to this URL to authorize with Google',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      error: 'Failed to initiate Google authentication',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        error: 'Authorization code not provided',
        timestamp: new Date().toISOString()
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // In a real app, you'd save the tokens and user info to a database
    console.log('User authenticated:', userInfo.data.email);

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=error`);
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    // In a real app, you'd clear the session/JWT token
    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Failed to logout',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;