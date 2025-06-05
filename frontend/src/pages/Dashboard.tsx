import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useExecutiveState } from '@/hooks/useExecutiveState'
import { executiveService } from '@/services/executiveService'

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todaysMetrics, setTodaysMetrics] = useState({
    meetings: 0,
    emailsProcessed: 0,
    decisionsRequired: 0,
    projectsMoved: 0
  })
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([])
  const [emailSummary, setEmailSummary] = useState({
    unread: 0,
    important: 0,
    urgent: 0,
    topSenders: [] as string[]
  })
  const [pendingDecisions, setPendingDecisions] = useState<any[]>([])
  const [activeProjects, setActiveProjects] = useState<any[]>([])
  
  const { state: executiveState } = useExecutiveState()
  
  // Get real user profile or default to authenticated user
  const executiveProfile = executiveState?.profile || {
    name: 'Executive User',
    email: 'user@company.com',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferences: {
      workingHours: { start: '08:00', end: '18:00' },
      communicationStyle: 'professional' as const,
      priorityLevel: 'high' as const,
      autoApprovalLimits: {
        calendar: false,
        email: false,
        documents: false
      }
    }
  }
  
  // Fetch real data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch real calendar agenda
        const agenda = await executiveService.getCalendarAgenda()
        setUpcomingMeetings(agenda.slice(0, 3)) // Get next 3 meetings
        setTodaysMetrics(prev => ({ ...prev, meetings: agenda.length }))
        
        // Fetch real email summary
        const emailData = await executiveService.getEmailSummary()
        setEmailSummary({
          unread: emailData.unreadCount,
          important: emailData.importantCount,
          urgent: emailData.importantCount, // Assuming important emails are urgent
          topSenders: emailData.categories?.slice(0, 3).map(cat => cat.name) || []
        })
        setTodaysMetrics(prev => ({ ...prev, emailsProcessed: emailData.totalEmails }))
        
        // Fetch real tasks/projects
        const tasks = await executiveService.getTasks()
        const projects = tasks.filter((task: any) => task.type === 'project').slice(0, 3)
        setActiveProjects(projects)
        setTodaysMetrics(prev => ({ 
          ...prev, 
          projectsMoved: tasks.filter((t: any) => t.status === 'completed').length,
          decisionsRequired: tasks.filter((t: any) => t.priority === 'high' && t.status === 'pending').length
        }))
        
        // Get pending decisions from high priority tasks
        const decisions = tasks
          .filter((task: any) => task.priority === 'high' && task.status === 'pending')
          .slice(0, 3)
          .map((task: any) => ({
            id: task.id,
            title: task.title,
            urgency: task.priority,
            deadline: task.deadline ? format(new Date(task.deadline), 'MMM d') : 'No deadline',
            requester: task.assignee || 'System'
          }))
        setPendingDecisions(decisions)
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        // Fallback to minimal data structure
        setTodaysMetrics({
          meetings: 0,
          emailsProcessed: 0,
          decisionsRequired: 0,
          projectsMoved: 0
        })
      }
    }
    
    fetchDashboardData()
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  
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
              Executive Assistant • {format(currentTime, 'EEEE, MMMM d, yyyy')}
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
              <div className="text-sm text-gray-600">Emails Processed</div>
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
              <div className="text-sm text-gray-600">Decisions Required</div>
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
              <div className="text-sm text-gray-600">Projects Advanced</div>
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
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg" style={{background: '#f8fafc'}}>
                <div>
                  <div className="font-medium text-sm">{meeting.title}</div>
                  <div className="text-xs text-gray-500">{meeting.time} • {meeting.duration}</div>
                  <div className="text-xs text-gray-400">{meeting.attendees[0]} {meeting.attendees.length > 1 && `+${meeting.attendees.length - 1}`}</div>
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
            ))}
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
                <div className="text-2xl font-bold text-red-600">{emailSummary.unread}</div>
                <div className="text-xs text-gray-500">Unread</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{emailSummary.important}</div>
                <div className="text-xs text-gray-500">Important</div>
              </div>
            </div>
            
            <div style={{background: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>
              <div className="font-medium text-sm text-red-800">🚨 {emailSummary.urgent} Urgent Emails</div>
              <div className="text-xs text-red-600">Require immediate attention</div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Top Senders Today:</div>
              {emailSummary.topSenders.map((sender, i) => (
                <div key={i} className="text-xs text-gray-600 mb-1">• {sender}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Decisions */}
        <div className="ea-card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              ⚡ Pending Decisions
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {pendingDecisions.map((decision) => (
              <div key={decision.id} className="p-3 rounded-lg border border-gray-200">
                <div className="font-medium text-sm mb-1">{decision.title}</div>
                <div className="text-xs text-gray-500 mb-2">From: {decision.requester}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">{decision.deadline}</div>
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
            ))}
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="ea-card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
            🚀 Active Projects
            <span className="text-sm font-normal text-gray-500">{activeProjects.length} projects</span>
          </h3>
        </div>
        <div className="p-4">
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
                  <div>Next: {project.nextMilestone}</div>
                  <div>Due: {project.dueDate}</div>
                </div>
              </div>
            ))}
          </div>
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
