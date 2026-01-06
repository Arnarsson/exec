import express from 'express';
import { getGoogleAuthService } from '../services/GoogleAuthService';

const router = express.Router();
const googleAuth = getGoogleAuthService();

// Authentication status endpoint
router.get('/status', async (req, res) => {
  try {
    const hasCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const accounts = googleAuth.listAccounts();
    const isAuthenticated = accounts.length > 0;
    // Return first account email for backward compatibility
    const email = accounts.length > 0 ? accounts[0].email : null;

    res.json({
      authenticated: isAuthenticated,
      email: email || null,
      hasGoogleCredentials: hasCredentials,
      accounts,
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

// List all connected accounts
router.get('/accounts', async (req, res) => {
  try {
    const accounts = googleAuth.listAccounts();
    res.json({
      success: true,
      accounts,
      count: accounts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('List accounts error:', error);
    res.status(500).json({
      error: 'Failed to list accounts',
      timestamp: new Date().toISOString(),
    });
  }
});

// Start Google OAuth flow
router.get('/google', (req, res) => {
  try {
    // Generate unique account ID for new accounts
    const accountId = req.query.accountId as string || `account_${Date.now()}`;
    const authUrl = googleAuth.generateAuthUrl(accountId);

    res.json({
      authUrl,
      accountId,
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
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        error: 'Authorization code not provided',
        timestamp: new Date().toISOString(),
      });
    }

    // Use state as accountId if provided, otherwise generate one
    const accountId = (state as string) || `account_${Date.now()}`;

    // Exchange code for tokens and save them
    const { email } = await googleAuth.handleCallback(code as string, accountId);
    console.log('[Auth] User authenticated:', email, 'Account:', accountId);

    // Redirect to frontend with success
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?auth=success&account=${accountId}`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?auth=error`);
  }
});

// Logout endpoint - supports specific account or all
router.post('/logout', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (accountId) {
      // Logout specific account
      await googleAuth.revokeAccess(accountId);
      res.json({
        success: true,
        message: `Account ${accountId} logged out successfully`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Logout all accounts
      const accounts = googleAuth.listAccounts();
      for (const account of accounts) {
        await googleAuth.revokeAccess(account.id);
      }
      res.json({
        success: true,
        message: 'All accounts logged out successfully',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Failed to logout',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
