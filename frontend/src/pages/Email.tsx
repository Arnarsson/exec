import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { getApiUrl, getMemoryUrl } from '@/config/api'

interface EmailMessage {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  category: 'primary' | 'social' | 'promotions' | 'updates';
  body?: string;
}

interface MemoryResult {
  id: string;
  title: string;
  snippet: string;
  _score: number;
}

export default function Email() {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [googleConnected, setGoogleConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [memorySuggestions, setMemorySuggestions] = useState<MemoryResult[]>([])

  // Compose state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')

  // Check Google auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/auth/status`)
        if (response.ok) {
          const data = await response.json()
          setGoogleConnected(data.authenticated)
          if (data.authenticated) {
            fetchEmails()
          }
        }
      } catch (error) {
        console.warn('Google auth not available')
      }
    }
    checkAuth()
  }, [])

  // Fetch emails from Gmail
  const fetchEmails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${getApiUrl()}/gmail/messages`)
      if (response.ok) {
        const data = await response.json()
        setEmails(data.messages || [])
      }
    } catch (error) {
      console.warn('Failed to fetch emails')
    } finally {
      setIsLoading(false)
    }
  }

  // Search memory for email-related content
  const searchMemoryForEmails = useCallback(async () => {
    try {
      const response = await fetch(`${getMemoryUrl()}/search?q=email communication message&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setMemorySuggestions(data.results || [])
      }
    } catch {
      // Memory service not available
    }
  }, [])

  useEffect(() => {
    searchMemoryForEmails()
  }, [searchMemoryForEmails])

  // Filter emails
  const filteredEmails = emails.filter(email => {
    const matchesSearch = !searchQuery ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' ||
      (selectedCategory === 'unread' && !email.isRead) ||
      (selectedCategory === 'starred' && email.isStarred) ||
      (selectedCategory === 'important' && email.isImportant) ||
      email.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Stats
  const stats = {
    total: emails.length,
    unread: emails.filter(e => !e.isRead).length,
    starred: emails.filter(e => e.isStarred).length,
    important: emails.filter(e => e.isImportant).length
  }

  // Mark email as read
  const markAsRead = (emailId: string) => {
    setEmails(prev => prev.map(e =>
      e.id === emailId ? { ...e, isRead: true } : e
    ))
  }

  // Toggle star
  const toggleStar = (emailId: string) => {
    setEmails(prev => prev.map(e =>
      e.id === emailId ? { ...e, isStarred: !e.isStarred } : e
    ))
  }

  // Delete email
  const deleteEmail = (emailId: string) => {
    setEmails(prev => prev.filter(e => e.id !== emailId))
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <header className="swiss-hero" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div>
          <p className="swiss-hero-subtitle">Communications</p>
          <h1 style={{ fontSize: '2rem' }}>Email</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: googleConnected ? '#16a34a' : '#666'
          }}>
            {googleConnected ? '● GMAIL SYNCED' : '○ LOCAL ONLY'}
          </span>
          <button
            onClick={() => setShowCompose(true)}
            className="swiss-btn swiss-btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            + COMPOSE
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="swiss-metric-grid" style={{ marginBottom: '3rem' }}>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Total</span>
          <span className="swiss-metric-value">{String(stats.total).padStart(2, '0')}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Unread</span>
          <span className="swiss-metric-value" style={{ color: stats.unread > 0 ? '#ff0000' : undefined }}>
            {String(stats.unread).padStart(2, '0')}
          </span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Starred</span>
          <span className="swiss-metric-value">{String(stats.starred).padStart(2, '0')}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Important</span>
          <span className="swiss-metric-value">{String(stats.important).padStart(2, '0')}</span>
        </div>
      </section>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '2px solid #000',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              New Message
            </span>
            <button
              onClick={() => setShowCompose(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              ×
            </button>
          </div>

          <input
            type="email"
            placeholder="To..."
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
            className="swiss-input"
            style={{ marginBottom: '0.75rem' }}
          />

          <input
            type="text"
            placeholder="Subject..."
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            className="swiss-input"
            style={{ marginBottom: '0.75rem' }}
          />

          <textarea
            placeholder="Message..."
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              border: '1px solid #000',
              background: 'transparent',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '150px',
              marginBottom: '1rem'
            }}
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => {
                // Would send email via Gmail API
                setShowCompose(false)
                setComposeTo('')
                setComposeSubject('')
                setComposeBody('')
              }}
              disabled={!composeTo.trim() || !composeSubject.trim()}
              className="swiss-btn swiss-btn-primary"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Send
            </button>
            <button
              onClick={() => setShowCompose(false)}
              className="swiss-btn"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="swiss-input"
          style={{ marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'starred', label: 'Starred' },
            { id: 'important', label: 'Important' },
            { id: 'primary', label: 'Primary' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #000',
                background: selectedCategory === cat.id ? '#000' : 'transparent',
                color: selectedCategory === cat.id ? '#fff' : '#000',
                cursor: 'pointer'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="swiss-grid">
        {/* Email List */}
        <section>
          <h2 className="swiss-section-title">Inbox ({filteredEmails.length})</h2>

          {!googleConnected && emails.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              <p style={{ marginBottom: '1rem' }}>Gmail not connected</p>
              <p style={{ fontSize: '0.85rem' }}>
                Go to Settings → Integrations to connect your Gmail account
              </p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#666',
              border: '1px dashed #ccc'
            }}>
              <p>No emails match your search</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <div
                key={email.id}
                onClick={() => {
                  setSelectedEmail(email)
                  markAsRead(email.id)
                }}
                className="swiss-item"
                style={{
                  cursor: 'pointer',
                  background: selectedEmail?.id === email.id ? '#f2f2f2' : 'transparent',
                  opacity: email.isRead ? 0.7 : 1
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(email.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      {email.isStarred ? '★' : '☆'}
                    </button>
                    <strong style={{
                      fontSize: '0.95rem',
                      fontWeight: email.isRead ? 400 : 700
                    }}>
                      {email.sender}
                    </strong>
                    {email.isImportant && (
                      <span className="swiss-urgent" style={{ fontSize: '0.7rem' }}>!</span>
                    )}
                    {!email.isRead && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#ff0000'
                      }} />
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: email.isRead ? 400 : 600,
                    marginBottom: '0.25rem'
                  }}>
                    {email.subject}
                  </div>
                  <div className="swiss-item-meta" style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {email.preview}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#666',
                  whiteSpace: 'nowrap',
                  marginLeft: '1rem'
                }}>
                  {format(new Date(email.timestamp), 'MMM d')}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Email Details */}
        <section>
          {selectedEmail ? (
            <>
              <h2 className="swiss-section-title">Message</h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {selectedEmail.subject}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      From: {selectedEmail.sender} &lt;{selectedEmail.senderEmail}&gt;
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.25rem' }}>
                      {format(new Date(selectedEmail.timestamp), 'EEEE, MMMM d, yyyy \'at\' HH:mm')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleStar(selectedEmail.id)}
                      className="swiss-btn"
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      {selectedEmail.isStarred ? '★' : '☆'}
                    </button>
                    <button
                      onClick={() => deleteEmail(selectedEmail.id)}
                      className="swiss-btn"
                      style={{ padding: '0.5rem 1rem', color: '#ff0000' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: '#fafafa',
                border: '1px solid #eee',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                marginBottom: '1.5rem'
              }}>
                {selectedEmail.body || selectedEmail.preview}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setComposeTo(selectedEmail.senderEmail)
                    setComposeSubject(`Re: ${selectedEmail.subject}`)
                    setShowCompose(true)
                  }}
                  className="swiss-btn swiss-btn-primary"
                  style={{ padding: '0.75rem 1.5rem' }}
                >
                  Reply
                </button>
                <button className="swiss-btn" style={{ padding: '0.75rem 1.5rem' }}>
                  Forward
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="swiss-section-title">Select Message</h2>
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: '#666',
                border: '1px dashed #ccc'
              }}>
                <p>Click an email to view its contents</p>
              </div>

              {/* Memory Suggestions */}
              {memorySuggestions.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#666',
                    marginBottom: '1rem'
                  }}>
                    Related from Memory
                  </h3>
                  {memorySuggestions.slice(0, 3).map(suggestion => (
                    <div
                      key={suggestion.id}
                      className="swiss-surface"
                      style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}
                    >
                      <strong>{suggestion.title}</strong>
                      <div style={{ color: '#666', marginTop: '0.25rem' }}>
                        {suggestion.snippet.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          padding: '0.75rem 1.5rem',
          background: '#000',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          Syncing...
        </div>
      )}
    </div>
  )
}
