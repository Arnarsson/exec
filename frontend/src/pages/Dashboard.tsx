import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface MemoryStats {
  imported_conversations: number;
  stored_memories: number;
  total_threads: number;
  total_embedded: number;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null)
  const [memoryLoading, setMemoryLoading] = useState(true)
  const [memoryError, setMemoryError] = useState<string | null>(null)

  const executiveProfile = {
    name: 'Sven Arnarsson',
    title: 'Founder & CEO',
    company: 'Arnarsson Ventures',
  }

  const todaysMetrics = {
    meetings: 7,
    inbound: 45,
    actions: 3,
    velocity: '92%'
  }

  const upcomingMeetings = [
    {
      id: '1',
      title: 'Board Strategy Review',
      time: '10:00 — 12:00',
      attendees: 'J. SMITH +2',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Product Launch',
      time: '14:00 — 15:00',
      attendees: 'MARKETING',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Investor Call: Series B',
      time: '16:30 — 17:15',
      attendees: 'A. HOROWITZ',
      priority: 'high'
    }
  ]

  const pendingDecisions = [
    {
      id: '1',
      title: 'Q1 Marketing Budget',
      meta: 'Value: $2.5M / From: CMO'
    },
    {
      id: '2',
      title: 'Partnership: Microsoft',
      meta: 'Reviewing Legal Clauses'
    },
    {
      id: '3',
      title: 'Senior Engineer Hire',
      meta: 'Hiring Pipeline / V.P. ENG'
    }
  ]

  const emailSummary = {
    unread: 23,
    priority: 8,
    urgentNote: '2 Urgent legal threads require verification.'
  }

  const activeProjects = [
    { name: 'Q4 Roadmap', progress: 75 },
    { name: 'Series B Fundraising', progress: 90 }
  ]

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchMemoryStats = async () => {
      try {
        setMemoryLoading(true)
        setMemoryError(null)
        const response = await fetch('http://localhost:8765/stats')
        if (!response.ok) throw new Error('Memory service unavailable')
        const data = await response.json()
        setMemoryStats(data)
      } catch (error) {
        console.warn('Failed to fetch memory stats:', error)
        setMemoryError('Memory service offline')
      } finally {
        setMemoryLoading(false)
      }
    }

    fetchMemoryStats()
    const interval = setInterval(fetchMemoryStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      {/* Hero Header */}
      <header className="swiss-hero">
        <div>
          <p className="swiss-hero-subtitle">
            {format(currentTime, 'dd MMM yyyy').toUpperCase()} / {format(currentTime, 'EEEE').toUpperCase()}
          </p>
          <h1>{executiveProfile.name}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="swiss-time">{format(currentTime, 'HH:mm')}</div>
          <div className="swiss-status">● SYSTEM ACTIVE</div>
        </div>
      </header>

      {/* Metrics Grid */}
      <section className="swiss-metric-grid">
        <div className="swiss-metric">
          <span className="swiss-metric-label">Meetings</span>
          <span className="swiss-metric-value">{String(todaysMetrics.meetings).padStart(2, '0')}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Inbound</span>
          <span className="swiss-metric-value">{todaysMetrics.inbound}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Actions</span>
          <span className="swiss-metric-value">{String(todaysMetrics.actions).padStart(2, '0')}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Velocity</span>
          <span className="swiss-metric-value">{todaysMetrics.velocity}</span>
        </div>
      </section>

      {/* Main Grid */}
      <div className="swiss-grid">
        {/* Agenda */}
        <section>
          <h2 className="swiss-section-title">Agenda</h2>
          {upcomingMeetings.map((meeting) => (
            <div key={meeting.id} className="swiss-item">
              <div>
                <strong className="swiss-item-title">{meeting.title}</strong>
                <div className="swiss-item-meta">{meeting.time} / {meeting.attendees}</div>
              </div>
              <span className={`swiss-badge ${meeting.priority === 'high' ? 'swiss-badge-high' : ''}`}>
                {meeting.priority === 'high' ? 'Priority' : 'Routine'}
              </span>
            </div>
          ))}
        </section>

        {/* Pending Logic */}
        <section>
          <h2 className="swiss-section-title">Pending Logic</h2>
          {pendingDecisions.map((decision) => (
            <div key={decision.id} className="swiss-item">
              <div>
                <strong className="swiss-item-title">{decision.title}</strong>
                <div className="swiss-item-meta">{decision.meta}</div>
              </div>
              <span className="swiss-urgent">DECIDE</span>
            </div>
          ))}
        </section>
      </div>

      {/* Second Grid */}
      <div className="swiss-grid">
        {/* Communications */}
        <section>
          <h2 className="swiss-section-title">Communications</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.5rem 0' }}>
            <span>Unread Volume</span>
            <strong>{emailSummary.unread}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.5rem 0' }}>
            <span>Priority Thread</span>
            <strong>{emailSummary.priority}</strong>
          </div>
          <div className="swiss-surface" style={{ marginTop: '1.5rem' }}>
            <span className="swiss-urgent">!</span> {emailSummary.urgentNote}
          </div>
        </section>

        {/* Active Tracks */}
        <section>
          <h2 className="swiss-section-title">Active Tracks</h2>
          {activeProjects.map((project, idx) => (
            <div key={idx} style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <span>{project.name}</span>
                <span>{project.progress}%</span>
              </div>
              <div className="swiss-progress-container">
                <div className="swiss-progress-fill" style={{ width: `${project.progress}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Memory Intelligence */}
      <section style={{ marginBottom: '4rem' }}>
        <h2 className="swiss-section-title">Memory Intelligence</h2>
        {memoryLoading ? (
          <div style={{ padding: '2rem 0', color: '#666' }}>Loading memory stats...</div>
        ) : memoryError ? (
          <div style={{ padding: '2rem 0', color: '#666' }}>{memoryError}</div>
        ) : memoryStats ? (
          <>
            <div className="swiss-metric-grid" style={{ marginBottom: '2rem' }}>
              <div className="swiss-metric">
                <span className="swiss-metric-label">Conversations</span>
                <span className="swiss-metric-value">{memoryStats.imported_conversations.toLocaleString()}</span>
              </div>
              <div className="swiss-metric">
                <span className="swiss-metric-label">Threads</span>
                <span className="swiss-metric-value">{memoryStats.total_threads.toLocaleString()}</span>
              </div>
              <div className="swiss-metric">
                <span className="swiss-metric-label">Embedded</span>
                <span className="swiss-metric-value">{memoryStats.total_embedded.toLocaleString()}</span>
              </div>
              <div className="swiss-metric">
                <span className="swiss-metric-label">Memories</span>
                <span className="swiss-metric-value">{memoryStats.stored_memories.toLocaleString()}</span>
              </div>
            </div>
            <div className="swiss-surface">
              <strong>Memory Powers Your Assistant</strong>
              <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
                Ask "Brief me on [topic]" for executive summaries. Proactive context surfaces relevant past conversations.
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* Action Bar */}
      <div className="swiss-action-bar">
        <button className="swiss-btn swiss-btn-primary">New Entry</button>
        <button className="swiss-btn">Comms</button>
        <button className="swiss-btn">Analytics</button>
        <button className="swiss-btn">Command</button>
      </div>
    </div>
  )
}
