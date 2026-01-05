import { useState, useEffect } from 'react'

interface IntegrationStatus {
  authenticated: boolean;
  hasGoogleCredentials: boolean;
  timestamp: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('integrations')
  const [googleStatus, setGoogleStatus] = useState<IntegrationStatus | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync meetings and schedule events',
      status: 'disconnected'
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Read and manage email communications',
      status: 'disconnected'
    },
    {
      id: 'memory',
      name: 'Memory System',
      description: 'RAG-powered conversation history',
      status: 'connected',
      lastSync: new Date().toISOString()
    }
  ])

  const tabs = [
    { id: 'integrations', label: 'Integrations' },
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
  ]

  // Check Google auth status
  const checkGoogleAuth = async () => {
    try {
      setGoogleLoading(true)
      const response = await fetch('http://localhost:3001/auth/status')
      if (!response.ok) throw new Error('Auth service unavailable')
      const data = await response.json()
      setGoogleStatus(data)

      // Update integration statuses based on Google auth
      if (data.authenticated) {
        setIntegrations(prev => prev.map(i =>
          (i.id === 'google-calendar' || i.id === 'gmail')
            ? { ...i, status: 'connected', lastSync: data.timestamp }
            : i
        ))
      }
      setGoogleError(null)
    } catch (error) {
      console.warn('Google auth check failed:', error)
      setGoogleError('Google services offline')
    } finally {
      setGoogleLoading(false)
    }
  }

  // Start Google OAuth flow
  const connectGoogle = async () => {
    try {
      const response = await fetch('http://localhost:3001/auth/google')
      if (!response.ok) throw new Error('Failed to start authentication')
      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Google auth error:', error)
      setGoogleError('Failed to connect to Google')
    }
  }

  // Check memory service status
  const checkMemoryStatus = async () => {
    try {
      const response = await fetch('http://localhost:8765/stats')
      if (response.ok) {
        setIntegrations(prev => prev.map(i =>
          i.id === 'memory'
            ? { ...i, status: 'connected', lastSync: new Date().toISOString() }
            : i
        ))
      }
    } catch {
      setIntegrations(prev => prev.map(i =>
        i.id === 'memory' ? { ...i, status: 'error' } : i
      ))
    }
  }

  useEffect(() => {
    checkGoogleAuth()
    checkMemoryStatus()
  }, [])

  return (
    <div>
      {/* Header */}
      <header className="swiss-hero" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div>
          <p className="swiss-hero-subtitle">Configuration</p>
          <h1 style={{ fontSize: '2rem' }}>System Settings</h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '3rem',
        borderBottom: '1px solid #000'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 2rem',
              background: activeTab === tab.id ? '#000' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#000',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #ff0000' : '2px solid transparent',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div>
          <h2 className="swiss-section-title">Connected Services</h2>

          {/* Google Auth Status */}
          {googleError && (
            <div style={{
              padding: '1rem',
              marginBottom: '2rem',
              background: '#f2f2f2',
              borderLeft: '2px solid #ff0000',
              fontSize: '0.85rem'
            }}>
              {googleError} — Google Calendar and Gmail require the auth service on port 3001
            </div>
          )}

          {/* Integration Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {integrations.map(integration => (
              <div
                key={integration.id}
                className="swiss-item"
                style={{
                  padding: '1.5rem',
                  border: '1px solid #000',
                  background: integration.status === 'connected' ? '#fafafa' : 'transparent'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{integration.name}</strong>
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      border: '1px solid',
                      borderColor: integration.status === 'connected' ? '#16a34a' :
                                  integration.status === 'error' ? '#ff0000' : '#000',
                      color: integration.status === 'connected' ? '#16a34a' :
                             integration.status === 'error' ? '#ff0000' : '#000',
                      background: integration.status === 'connected' ? '#dcfce7' : 'transparent'
                    }}>
                      {integration.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {integration.description}
                  </div>
                  {integration.lastSync && integration.status === 'connected' && (
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                      Last sync: {new Date(integration.lastSync).toLocaleString()}
                    </div>
                  )}
                </div>

                <div>
                  {integration.id === 'google-calendar' || integration.id === 'gmail' ? (
                    <button
                      onClick={connectGoogle}
                      disabled={googleLoading}
                      className="swiss-btn"
                      style={{
                        padding: '0.5rem 1.5rem',
                        opacity: googleLoading ? 0.6 : 1
                      }}
                    >
                      {integration.status === 'connected' ? 'Reconnect' : 'Connect'}
                    </button>
                  ) : integration.id === 'memory' ? (
                    <button
                      onClick={checkMemoryStatus}
                      className="swiss-btn"
                      style={{ padding: '0.5rem 1.5rem' }}
                    >
                      Refresh
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Setup Instructions */}
          <div style={{ marginTop: '3rem' }}>
            <h2 className="swiss-section-title">Setup Requirements</h2>
            <div className="swiss-surface" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Google Integration
                </strong>
                <ul style={{ marginTop: '0.75rem', marginLeft: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
                  <li>Backend auth server running on port 3001</li>
                  <li>Google OAuth credentials configured</li>
                  <li>Calendar and Gmail API scopes enabled</li>
                </ul>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Memory System
                </strong>
                <ul style={{ marginTop: '0.75rem', marginLeft: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
                  <li>Memory HTTP server on port 8765</li>
                  <li>Qdrant vector database running</li>
                  <li>SQLite database with indexed conversations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div>
          <h2 className="swiss-section-title">Executive Profile</h2>

          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                Full Name
              </label>
              <input
                type="text"
                defaultValue="Sven Arnarsson"
                className="swiss-input"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                Title
              </label>
              <input
                type="text"
                defaultValue="Founder & CEO"
                className="swiss-input"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                Company
              </label>
              <input
                type="text"
                defaultValue="Arnarsson Ventures"
                className="swiss-input"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                Email
              </label>
              <input
                type="email"
                defaultValue="sven@arnarsson.ventures"
                className="swiss-input"
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                Timezone
              </label>
              <select
                defaultValue="America/Los_Angeles"
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid #000',
                  background: 'transparent',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              >
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <button className="swiss-btn swiss-btn-primary" style={{ padding: '1rem 2rem' }}>
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div>
          <h2 className="swiss-section-title">System Preferences</h2>

          <div style={{ maxWidth: '600px' }}>
            {/* Working Hours */}
            <div style={{ marginBottom: '3rem' }}>
              <h3 style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem',
                fontWeight: 600
              }}>
                Working Hours
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#666',
                    marginBottom: '0.5rem'
                  }}>
                    Start
                  </label>
                  <input
                    type="time"
                    defaultValue="09:00"
                    className="swiss-input"
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#666',
                    marginBottom: '0.5rem'
                  }}>
                    End
                  </label>
                  <input
                    type="time"
                    defaultValue="18:00"
                    className="swiss-input"
                  />
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div style={{ marginBottom: '3rem' }}>
              <h3 style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem',
                fontWeight: 600
              }}>
                Notifications
              </h3>

              {[
                { id: 'email', label: 'Email Notifications', checked: true },
                { id: 'calendar', label: 'Calendar Reminders', checked: true },
                { id: 'tasks', label: 'Task Deadlines', checked: true },
                { id: 'memory', label: 'Memory Suggestions', checked: false },
              ].map(pref => (
                <div
                  key={pref.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 0',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  <span style={{ fontSize: '0.9rem' }}>{pref.label}</span>
                  <label style={{ position: 'relative', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      defaultChecked={pref.checked}
                      style={{
                        width: '20px',
                        height: '20px',
                        accentColor: '#000'
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>

            {/* Communication Style */}
            <div style={{ marginBottom: '3rem' }}>
              <h3 style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem',
                fontWeight: 600
              }}>
                AI Communication Style
              </h3>
              <select
                defaultValue="professional"
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid #000',
                  background: 'transparent',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              >
                <option value="formal">Formal — Structured and detailed</option>
                <option value="professional">Professional — Clear and efficient</option>
                <option value="direct">Direct — Concise and action-oriented</option>
                <option value="casual">Casual — Friendly and conversational</option>
              </select>
            </div>

            <button className="swiss-btn swiss-btn-primary" style={{ padding: '1rem 2rem' }}>
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
