import axios from 'axios';
import { OKR, OKRDashboardData, OKRProgress } from '../types/okr';

const API_BASE_URL = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://localhost:3001';

// Create axios instance with default config
const okrApi = axios.create({
  baseURL: `${API_BASE_URL}/api/okr`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
okrApi.interceptors.request.use(
  (config) => {
    console.log(`[OKR-API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('[OKR-API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
okrApi.interceptors.response.use(
  (response) => {
    console.log(`[OKR-API] Response ${response.status}:`, response.data);
    return response;
  },
  (error) => {
    console.error('[OKR-API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class OKRApiService {
  // Get dashboard data
  async getDashboardData(ownerId?: string): Promise<OKRDashboardData> {
    try {
      const params = ownerId ? { ownerId } : {};
      const response = await okrApi.get('/dashboard', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      throw new Error('Failed to load OKR dashboard');
    }
  }

  // Get all OKRs
  async getOKRs(ownerId?: string): Promise<OKR[]> {
    try {
      const params = ownerId ? { ownerId } : {};
      const response = await okrApi.get('/list', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch OKRs:', error);
      throw new Error('Failed to load OKRs');
    }
  }

  // Get specific OKR
  async getOKR(id: string): Promise<OKR> {
    try {
      const response = await okrApi.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch OKR ${id}:`, error);
      throw new Error('Failed to load OKR');
    }
  }

  // Create new OKR
  async createOKR(okrData: Partial<OKR>): Promise<OKR> {
    try {
      const response = await okrApi.post('/create', okrData);
      return response.data;
    } catch (error) {
      console.error('Failed to create OKR:', error);
      throw new Error('Failed to create OKR');
    }
  }

  // Update OKR progress
  async updateProgress(
    okrId: string, 
    progress: number, 
    source: OKRProgress['source'] = 'MANUAL', 
    details?: any
  ): Promise<OKRProgress> {
    try {
      const response = await okrApi.put(`/${okrId}/progress`, {
        progress,
        source,
        details
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to update progress for OKR ${okrId}:`, error);
      throw new Error('Failed to update progress');
    }
  }

  // Send chat command
  async sendChatCommand(command: string, context?: any): Promise<string> {
    try {
      const response = await okrApi.post('/chat-command', {
        command,
        context
      });
      return response.data.response;
    } catch (error) {
      console.error('Failed to process chat command:', error);
      throw new Error('Failed to process command');
    }
  }

  // Manually sync GitHub repository
  async syncGitHub(repoName: string, ownerId?: string): Promise<void> {
    try {
      await okrApi.post('/sync-github', {
        repoName,
        ownerId
      });
    } catch (error) {
      console.error(`Failed to sync GitHub repo ${repoName}:`, error);
      throw new Error('Failed to sync GitHub repository');
    }
  }

  // Initialize demo data
  async initializeDemoData(): Promise<void> {
    try {
      await okrApi.post('/init-demo-data');
    } catch (error) {
      console.error('Failed to initialize demo data:', error);
      throw new Error('Failed to initialize demo data');
    }
  }

  // Test GitHub webhook
  async testGitHubWebhook(options?: {
    repoName?: string;
    commitMessage?: string;
    authorName?: string;
  }): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/api/webhooks/test-github`, options || {});
    } catch (error) {
      console.error('Failed to test GitHub webhook:', error);
      throw new Error('Failed to test GitHub webhook');
    }
  }

  // Health check (includes OKR system status)
  async getHealthStatus(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Failed to get health status:', error);
      throw new Error('Failed to get system status');
    }
  }
}

// Export singleton instance
export const okrApiService = new OKRApiService();

// Export default for easy imports
export default okrApiService;