import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { executiveService } from '@/services/executiveService'
import toast from 'react-hot-toast'

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
}

interface CalendarEventData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  priority: string;
}

interface EmailSummaryData {
  totalEmails: number;
  unreadCount: number;
  importantCount: number;
  recentEmails: Array<{
    from: string;
    subject: string;
    priority: string;
  }>;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [meetings, setMeetings] = useState<CalendarEventData[]>([])
  const [emailSummary, setEmailSummary] = useState<EmailSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Real executive assistant data
  const executiveProfile = {
    name: 'Executive',
    title: 'Chief Executive Officer',
    company: 'TechVentures Inc.',
    timezone: 'PST',
    workingHours: { start: '08:00', end: '18:00' }
  }

  // Load real data from APIs
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Load tasks, calendar, and email data in parallel
        const [tasksResponse, calendarResponse, emailResponse] = await Promise.all([
          executiveService.getTasks(),
          executiveService.getCalendarAgenda(),
          executiveService.getEmailSummary()
        ])
        
        setTasks(tasksResponse || [])
        setMeetings(calendarResponse as any || [])
        setEmailSummary(emailResponse as any)
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    
    loadDashboardData()
  }, [])
  
  // Calculate metrics from real data
  const todaysMetrics = {
    meetings: meetings.length,
    emailsProcessed: emailSummary?.totalEmails || 0,
    decisionsRequired: tasks.filter(t => t.priority === 'high' && t.status === 'pending').length,
    projectsMoved: tasks.filter(t => t.status === 'completed').length
  }
  
  // Convert calendar events to meeting format
  const upcomingMeetings = meetings.slice(0, 3).map(meeting => ({
    id: meeting.id,
    title: meeting.title,
    time: format(new Date(meeting.startTime), 'h:mm a'),
    duration: '1 hour', // Default duration
    attendees: meeting.attendees || [],
    priority: meeting.priority || 'medium',
    status: 'confirmed'
  }))
  
  // Email data from API
  const emailData = {
    unread: emailSummary?.unreadCount || 0,
    important: emailSummary?.importantCount || 0,
    urgent: emailSummary?.recentEmails?.filter(e => e.priority === 'high').length || 0,
    topSenders: emailSummary?.recentEmails?.map(e => e.from.split('@')[0]).slice(0, 3) || []
  }
  
  // Convert tasks to projects format
  const activeProjects = tasks.slice(0, 3).map(task => ({
    id: task.id,
    name: task.title,
    status: task.status === 'completed' ? 'ahead' : task.status === 'in-progress' ? 'on-track' : 'at-risk',
    progress: task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 25,
    nextMilestone: 'Next action required',
    dueDate: format(new Date(task.dueDate), 'MMM d')
  }))
  
  // Pending decisions from high priority tasks
  const pendingDecisions = tasks
    .filter(t => t.priority === 'high' && t.status === 'pending')
    .slice(0, 3)
    .map(task => ({
      id: task.id,
      title: task.title,
      urgency: task.priority,
      deadline: format(new Date(task.dueDate), 'MMM d'),
      requester: 'Executive Assistant'
    }))

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }
  
  const getStatusColor = (status: 'on-track' | 'ahead' | 'at-risk' | string) => {
    switch(status) {
      case 'on-track': return '#22c55e'
      case 'ahead': return '#3b82f6'
      case 'at-risk': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '0.75rem',
        padding: '2rem',
        color: 'white'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {executiveProfile.name}
            </h1>
            <p style={{opacity: 0.9, marginTop: '0.5rem'}}>
              {executiveProfile.title} • {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <div style={{opacity: 0.8}} className="text-sm">Current Time</div>
            <div className="text-xl font-semibold">
              {format(currentTime, 'h:mm a')}
            </div>
            <div style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '1rem',
              fontSize: '0.75rem'
            }}>
              🟢 AI Assistant Active
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="ea-card p-4">
          <div className="flex items-center">
            <div style={{
              background: '#dbeafe',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              marginRight: '0.75rem'
            }}>
              📅
            </div>
            <div>
              <div className="text-sm text-gray-600">Today's Meetings</div>
              <div className="text-2xl font-bold text-blue-600">{todaysMetrics.meetings}</div>
            </div>
          </div>
        </div>
        
        <div className="ea-card p-4">
          <div className="flex items-center">
            <div style={{
              background: '#dcfce7',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              marginRight: '0.75rem'
            }}>
              📧
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Emails</div>
              <div className="text-2xl font-bold text-green-600">{todaysMetrics.emailsProcessed}</div>
            </div>
          </div>
        </div>
        
        <div className="ea-card p-4">
          <div className="flex items-center">
            <div style={{
              background: '#fef3c7',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              marginRight: '0.75rem'
            }}>
              ⚡
            </div>
            <div>
              <div className="text-sm text-gray-600">High Priority Tasks</div>
              <div className="text-2xl font-bold text-yellow-600">{todaysMetrics.decisionsRequired}</div>
            </div>
          </div>
        </div>
        
        <div className="ea-card p-4">
          <div className="flex items-center">
            <div style={{
              background: '#f3e8ff',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              marginRight: '0.75rem'
            }}>
              🚀
            </div>
            <div>
              <div className="text-sm text-gray-600">Completed Tasks</div>
              <div className="text-2xl font-bold text-purple-600">{todaysMetrics.projectsMoved}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Upcoming Meetings */}
        <div className="ea-card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              📅 Upcoming Meetings
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {upcomingMeetings.length > 0 ? upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg" style={{background: '#f8fafc'}}>
                <div>
                  <div className="font-medium text-sm">{meeting.title}</div>
                  <div className="text-xs text-gray-500">{meeting.time} • {meeting.duration}</div>
                  <div className="text-xs text-gray-400">
                    {meeting.attendees.length > 0 ? meeting.attendees[0] : 'No attendees'} 
                    {meeting.attendees.length > 1 && ` +${meeting.attendees.length - 1}`}
                  </div>
                </div>
                <div style={{
                  background: meeting.priority === 'high' ? '#fee2e2' : '#fef3c7',
                  color: meeting.priority === 'high' ? '#dc2626' : '#ca8a04',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {meeting.priority.toUpperCase()}
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-4">
                No upcoming meetings
              </div>
            )}
          </div>
        </div>

        {/* Email Summary */}
        <div className="ea-card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              📧 Email Intelligence
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{emailData.unread}</div>
                <div className="text-xs text-gray-500">Unread</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{emailData.important}</div>
                <div className="text-xs text-gray-500">Important</div>
              </div>
            </div>
            
            <div style={{background: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>
              <div className="font-medium text-sm text-red-800">🚨 {emailData.urgent} High Priority Emails</div>
              <div className="text-xs text-red-600">Require attention</div>
            </div>
            
            {emailData.topSenders.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Recent Senders:</div>
                {emailData.topSenders.map((sender, i) => (
                  <div key={i} className="text-xs text-gray-600 mb-1">• {sender}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Decisions */}
        <div className="ea-card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              ⚡ High Priority Tasks
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {pendingDecisions.length > 0 ? pendingDecisions.map((decision) => (
              <div key={decision.id} className="p-3 rounded-lg border border-gray-200">
                <div className="font-medium text-sm mb-1">{decision.title}</div>
                <div className="text-xs text-gray-500 mb-2">Assigned to: {decision.requester}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">Due: {decision.deadline}</div>
                  <div style={{
                    background: decision.urgency === 'high' ? '#fee2e2' : decision.urgency === 'medium' ? '#fef3c7' : '#f0f9ff',
                    color: decision.urgency === 'high' ? '#dc2626' : decision.urgency === 'medium' ? '#ca8a04' : '#2563eb',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem'
                  }}>
                    {decision.urgency.toUpperCase()}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 py-4">
                No high priority tasks
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="ea-card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
            🚀 Recent Tasks
            <span className="text-sm font-normal text-gray-500">{activeProjects.length} tasks shown</span>
          </h3>
        </div>
        <div className="p-4">
          {activeProjects.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {activeProjects.map((project) => (
                <div key={project.id} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{project.name}</div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: getStatusColor(project.status)
                    }}></div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div style={{background: '#f3f4f6', height: '6px', borderRadius: '3px'}}>
                      <div style={{
                        background: getStatusColor(project.status),
                        height: '100%',
                        width: `${project.progress}%`,
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    <div>Status: {project.status}</div>
                    <div>Due: {project.dueDate}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No recent tasks available
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <button className="ea-button-primary p-4 text-center">
          <div className="text-lg mb-1">📅</div>
          <div className="text-sm">Schedule Meeting</div>
        </button>
        <button className="ea-button-secondary p-4 text-center">
          <div className="text-lg mb-1">📧</div>
          <div className="text-sm">Draft Email</div>
        </button>
        <button className="ea-button-secondary p-4 text-center">
          <div className="text-lg mb-1">📊</div>
          <div className="text-sm">View Analytics</div>
        </button>
        <button className="ea-button-secondary p-4 text-center">
          <div className="text-lg mb-1">💬</div>
          <div className="text-sm">AI Chat</div>
        </button>
      </div>
    </div>
  )
}
