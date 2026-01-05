// API Configuration - reads from environment variables
// Defaults to localhost for development

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
  memoryUrl: import.meta.env.VITE_MEMORY_URL || 'http://localhost:8765',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};

// Helper functions for easy access
export const getApiUrl = () => config.apiUrl;
export const getWsUrl = () => config.wsUrl;
export const getMemoryUrl = () => config.memoryUrl;
export const getGoogleClientId = () => config.googleClientId;
