import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { 
  ExecutiveState, 
  APIResponse, 
  HealthCheck, 
  CalendarEvent, 
  EmailSummary,
  AvailabilitySlot,
  EmailDraft 
} from '@/types'

class ExecutiveService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:3001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-AG-UI-Client': 'executive-assistant-frontend'
      }
    })

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('❌ API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.data || error.message)
        
        // Handle common error cases
        if (error.response?.status === 401) {
          // Handle authentication error
          console.error('Authentication failed')
        } else if (error.response?.status >= 500) {
          // Handle server errors
          console.error('Server error occurred')
        }
        
        return Promise.reject(error)
      }
    )
  }

  // Health and Status
  async getHealth(): Promise<HealthCheck> {
    const response = await this.api.get<HealthCheck>('/health')
    return response.data
  }

  async getStatus(): Promise<any> {
    const response = await this.api.get('/api/status')
    return response.data
  }

  // Executive State Management
  async getState(): Promise<ExecutiveState> {
    const response = await this.api.get<{ executiveState: ExecutiveState }>('/api/status')
    return response.data.executiveState
  }

  async updateState(updates: Partial<ExecutiveState>): Promise<void> {
    await this.api.post('/api/state/update', updates)
  }

  // Calendar Operations
  async getCalendarAgenda(date?: string): Promise<CalendarEvent[]> {
    const params = date ? { date } : {}
    const response = await this.api.get<{ success: boolean; agenda: CalendarEvent[] }>('/api/calendar/agenda', { params })
    return response.data.agenda || []
  }

  async checkAvailability(
    startTime: string,
    endTime: string,
    timeZone: string = 'UTC'
  ): Promise<AvailabilitySlot[]> {
    const response = await this.api.post<APIResponse<AvailabilitySlot[]>>('/api/calendar/availability', {
      startTime,
      endTime,
      timeZone
    })
    return response.data.data || []
  }

  async scheduleMeeting(meeting: {
    title: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
    location?: string;
    description?: string;
    timeZone?: string;
  }): Promise<CalendarEvent> {
    const response = await this.api.post<APIResponse<CalendarEvent>>('/api/calendar/schedule', meeting)
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to schedule meeting')
    }
    return response.data.data
  }

  async cancelMeeting(eventId: string): Promise<void> {
    await this.api.delete(`/api/calendar/events/${eventId}`)
  }

  async findOptimalMeetingTime(params: {
    attendees: string[];
    duration: number;
    preferredStartHour?: number;
    preferredEndHour?: number;
    daysAhead?: number;
  }): Promise<AvailabilitySlot[]> {
    const response = await this.api.post<APIResponse<AvailabilitySlot[]>>('/api/calendar/find-time', params)
    return response.data.data || []
  }

  // Email Operations
  async getEmailSummary(): Promise<EmailSummary> {
    const response = await this.api.get<{ success: boolean; summary: EmailSummary }>('/api/email/summary')
    return response.data.summary || {
      totalEmails: 0,
      unreadCount: 0,
      importantCount: 0,
      categories: []
    }
  }

  async summarizeEmails(params?: {
    maxResults?: number;
    query?: string;
  }): Promise<any> {
    const response = await this.api.post<APIResponse>('/api/email/summarize', params)
    return response.data.data
  }

  async draftEmail(params: {
    emailId?: string;
    responseType?: 'reply' | 'forward' | 'new';
    instructions?: string;
    to?: string[];
    subject?: string;
  }): Promise<EmailDraft> {
    const response = await this.api.post<APIResponse<EmailDraft>>('/api/email/draft', params)
    if (!response.data.data) {
      throw new Error(response.data.error || 'Failed to draft email')
    }
    return response.data.data
  }

  async sendEmail(draft: EmailDraft): Promise<string> {
    const response = await this.api.post<APIResponse<{ messageId: string }>>('/api/email/send', { draft })
    if (!response.data.data?.messageId) {
      throw new Error(response.data.error || 'Failed to send email')
    }
    return response.data.data.messageId
  }

  async prioritizeInbox(): Promise<any> {
    const response = await this.api.post<APIResponse>('/api/email/prioritize')
    return response.data.data
  }

  // Task Management
  async createTask(task: {
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    deadline?: string;
  }): Promise<any> {
    const response = await this.api.post<APIResponse>('/api/tasks/create', task)
    return response.data.data
  }

  async getTasks(): Promise<any[]> {
    const response = await this.api.get<{ success: boolean; tasks: any[] }>('/api/tasks')
    return response.data.tasks || []
  }

  async updateTask(taskId: string, updates: any): Promise<void> {
    await this.api.patch(`/api/tasks/${taskId}`, updates)
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.api.delete(`/api/tasks/${taskId}`)
  }

  // Research and Analysis
  async performWebSearch(query: string): Promise<any> {
    const response = await this.api.post<APIResponse>('/api/research/search', { query })
    return response.data.data
  }

  async analyzeDocument(params: {
    url?: string;
    content?: string;
    type?: string;
  }): Promise<any> {
    const response = await this.api.post<APIResponse>('/api/research/analyze', params)
    return response.data.data
  }

  // Testing and Development
  async testEvent(eventType: string, content?: string): Promise<void> {
    await this.api.post('/api/test-events', {
      eventType,
      content
    })
  }

  // Integration Management
  async connectCalendar(params: {
    type: 'google' | 'outlook' | 'apple';
    credentials: any;
  }): Promise<void> {
    await this.api.post('/api/integrations/calendar/connect', params)
  }

  async connectEmail(params: {
    type: 'gmail' | 'outlook' | 'apple';
    credentials: any;
  }): Promise<void> {
    await this.api.post('/api/integrations/email/connect', params)
  }

  async disconnectIntegration(type: string, accountId: string): Promise<void> {
    await this.api.delete(`/api/integrations/${type}/${accountId}`)
  }

  // Utility Methods
  async uploadFile(file: File, type?: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    if (type) formData.append('type', type)

    const response = await this.api.post<APIResponse<{ fileId: string }>>('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (!response.data.data?.fileId) {
      throw new Error(response.data.error || 'Failed to upload file')
    }

    return response.data.data.fileId
  }

  async getFile(fileId: string): Promise<Blob> {
    const response = await this.api.get(`/api/files/${fileId}`, {
      responseType: 'blob'
    })
    return response.data
  }
}

// Create and export singleton instance
export const executiveService = new ExecutiveService()

// Export class for potential custom instances
export default ExecutiveService
