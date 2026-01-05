/**
 * Token Store Service
 * File-based OAuth token storage with simple encryption.
 * Persists tokens across backend restarts via Docker volume.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface GoogleTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string;
  expiry_date?: number | null;
}

interface TokenData {
  [userId: string]: {
    tokens: GoogleTokens;
    email?: string;
    updatedAt: string;
  };
}

export class TokenStore {
  private filePath: string;
  private encryptionKey: string;

  constructor(dataDir?: string) {
    // Default to /app/data in Docker, ./data locally
    const baseDir = dataDir || process.env.TOKEN_STORE_PATH ||
      (process.env.NODE_ENV === 'production' ? '/app/data' : './data');

    // Ensure directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    this.filePath = path.join(baseDir, 'tokens.json');

    // Use env var or generate consistent key from client secret
    this.encryptionKey = process.env.TOKEN_ENCRYPTION_KEY ||
      this.deriveKey(process.env.GOOGLE_CLIENT_SECRET || 'default-dev-key');
  }

  /**
   * Derive a 32-byte key from a secret
   */
  private deriveKey(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32);
  }

  /**
   * Encrypt sensitive token data
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt token data
   */
  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('[TokenStore] Decryption error:', error);
      return '';
    }
  }

  /**
   * Read token data from file
   */
  private readFile(): TokenData {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {};
      }
      const encrypted = fs.readFileSync(this.filePath, 'utf8');
      if (!encrypted) return {};

      const decrypted = this.decrypt(encrypted);
      if (!decrypted) return {};

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[TokenStore] Error reading tokens file:', error);
      return {};
    }
  }

  /**
   * Write token data to file
   */
  private writeFile(data: TokenData): void {
    try {
      const json = JSON.stringify(data, null, 2);
      const encrypted = this.encrypt(json);
      fs.writeFileSync(this.filePath, encrypted, 'utf8');
    } catch (error) {
      console.error('[TokenStore] Error writing tokens file:', error);
      throw new Error('Failed to persist tokens');
    }
  }

  /**
   * Save tokens for a user
   */
  saveTokens(userId: string, tokens: GoogleTokens, email?: string): void {
    const data = this.readFile();
    data[userId] = {
      tokens,
      email,
      updatedAt: new Date().toISOString(),
    };
    this.writeFile(data);
    console.log(`[TokenStore] Tokens saved for user: ${userId}`);
  }

  /**
   * Get tokens for a user
   */
  getTokens(userId: string): GoogleTokens | null {
    const data = this.readFile();
    const userData = data[userId];
    if (!userData) {
      return null;
    }
    return userData.tokens;
  }

  /**
   * Get user email
   */
  getEmail(userId: string): string | undefined {
    const data = this.readFile();
    return data[userId]?.email;
  }

  /**
   * Delete tokens for a user
   */
  deleteTokens(userId: string): void {
    const data = this.readFile();
    if (data[userId]) {
      delete data[userId];
      this.writeFile(data);
      console.log(`[TokenStore] Tokens deleted for user: ${userId}`);
    }
  }

  /**
   * Check if tokens exist for a user
   */
  hasTokens(userId: string): boolean {
    const tokens = this.getTokens(userId);
    return tokens !== null && (!!tokens.access_token || !!tokens.refresh_token);
  }

  /**
   * Update tokens (e.g., after refresh)
   */
  updateTokens(userId: string, tokens: Partial<GoogleTokens>): void {
    const existingTokens = this.getTokens(userId);
    if (!existingTokens) {
      throw new Error('No existing tokens to update');
    }

    const updatedTokens: GoogleTokens = {
      ...existingTokens,
      ...tokens,
    };

    this.saveTokens(userId, updatedTokens, this.getEmail(userId));
  }

  /**
   * List all user IDs with stored tokens
   */
  listUsers(): string[] {
    const data = this.readFile();
    return Object.keys(data);
  }
}

// Singleton instance
let tokenStore: TokenStore | null = null;

export function getTokenStore(): TokenStore {
  if (!tokenStore) {
    tokenStore = new TokenStore();
  }
  return tokenStore;
}

export default TokenStore;
