import express from 'express';
import { getGoogleAuthService } from '../services/GoogleAuthService';

const router = express.Router();
const googleAuth = getGoogleAuthService();

// Authentication status endpoint
router.get('/status', async (req, res) => {
  try {
    const hasCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const isAuthenticated = googleAuth.isAuthenticated('default');
    const email = googleAuth.getUserEmail('default');

    res.json({
      authenticated: isAuthenticated,
      email: email || null,
      hasGoogleCredentials: hasCredentials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({
      error: 'Failed to get authentication status',
      timestamp: new Date().toISOString(),
    });
  }
});

// Start Google OAuth flow
router.get('/google', (req, res) => {
  try {
    const authUrl = googleAuth.generateAuthUrl();

    res.json({
      authUrl,
      message: 'Redirect to this URL to authorize with Google',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      error: 'Failed to initiate Google authentication',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
      });
    }

    // Exchange code for tokens and save them
    const { email } = await googleAuth.handleCallback(code as string, 'default');
    console.log('[Auth] User authenticated:', email);

    // Redirect to frontend with success
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=success`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?auth=error`);
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    await googleAuth.revokeAccess('default');

    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Failed to logout',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
