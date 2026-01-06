/**
 * Google Auth Service
 * Shared OAuth2 client with automatic token refresh.
 * Central authentication handler for Calendar and Gmail services.
 */

import { google, Auth } from 'googleapis';
import { getTokenStore, GoogleTokens } from './TokenStore';

export class GoogleAuthService {
  private oauth2Client: Auth.OAuth2Client;
  private tokenStore = getTokenStore();

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
    );

    // Set up token refresh listener
    this.oauth2Client.on('tokens', (tokens) => {
      console.log('[GoogleAuthService] Token refresh event received');
      // Token refresh is now handled per-user in refreshTokens method
    });
  }

  /**
   * List all connected accounts
   */
  listAccounts(): Array<{ id: string; email?: string; updatedAt: string }> {
    return this.tokenStore.listAccounts();
  }

  /**
   * Get the OAuth2 client (for initiating auth flow)
   */
  getOAuth2Client(): Auth.OAuth2Client {
    return this.oauth2Client;
  }

  /**
   * Generate the authorization URL
   */
  generateAuthUrl(accountId?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: accountId, // Pass accountId as state to preserve through OAuth flow
    });
  }

  /**
   * Exchange authorization code for tokens and save them
   */
  async handleCallback(code: string, userId: string = 'default'): Promise<{ email?: string }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || undefined;

    // Save tokens
    this.tokenStore.saveTokens(userId, tokens as GoogleTokens, email);

    console.log(`[GoogleAuthService] User authenticated: ${email}`);
    return { email };
  }

  /**
   * Get an authenticated client for a user
   * Automatically loads stored tokens and refreshes if needed
   */
  async getAuthenticatedClient(userId: string = 'default'): Promise<Auth.OAuth2Client> {
    const tokens = this.tokenStore.getTokens(userId);

    if (!tokens) {
      throw new Error('Not authenticated');
    }

    // Set credentials
    this.oauth2Client.setCredentials(tokens);

    // Check if token needs refresh
    if (this.isTokenExpired(tokens)) {
      console.log('[GoogleAuthService] Token expired, refreshing...');
      await this.refreshTokens(userId);
    }

    return this.oauth2Client;
  }

  /**
   * Check if access token is expired or about to expire
   */
  private isTokenExpired(tokens: GoogleTokens): boolean {
    if (!tokens.expiry_date) {
      return false; // Can't determine, assume valid
    }
    // Refresh if expiring in next 5 minutes
    const bufferMs = 5 * 60 * 1000;
    return Date.now() > tokens.expiry_date - bufferMs;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshTokens(userId: string): Promise<void> {
    const tokens = this.tokenStore.getTokens(userId);
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Update stored tokens
      this.tokenStore.updateTokens(userId, {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      });

      this.oauth2Client.setCredentials(credentials);
      console.log('[GoogleAuthService] Tokens refreshed successfully');
    } catch (error) {
      console.error('[GoogleAuthService] Token refresh failed:', error);
      // Clear invalid tokens
      this.tokenStore.deleteTokens(userId);
      throw new Error('Token refresh failed. Please re-authenticate.');
    }
  }

  /**
   * Revoke access and clear stored tokens
   */
  async revokeAccess(userId: string = 'default'): Promise<void> {
    const tokens = this.tokenStore.getTokens(userId);

    if (tokens?.access_token) {
      try {
        await this.oauth2Client.revokeToken(tokens.access_token);
        console.log('[GoogleAuthService] Token revoked with Google');
      } catch (error) {
        console.warn('[GoogleAuthService] Token revocation failed:', error);
        // Continue anyway to clear local tokens
      }
    }

    this.tokenStore.deleteTokens(userId);
    console.log('[GoogleAuthService] User logged out:', userId);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(userId: string = 'default'): boolean {
    return this.tokenStore.hasTokens(userId);
  }

  /**
   * Get user email
   */
  getUserEmail(userId: string = 'default'): string | undefined {
    return this.tokenStore.getEmail(userId);
  }
}

// Singleton instance
let googleAuthService: GoogleAuthService | null = null;

export function getGoogleAuthService(): GoogleAuthService {
  if (!googleAuthService) {
    googleAuthService = new GoogleAuthService();
  }
  return googleAuthService;
}

export default GoogleAuthService;
