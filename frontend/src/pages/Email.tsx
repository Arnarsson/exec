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

type FilterType = 'all' | 'unread' | 'starred' | 'important';

export default function Email() {
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
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
      const response = await fetch(`${getApiUrl()}/api/gmail/inbox?limit=50`)
      if (response.ok) {
        const data = await response.json()
        // Map Gmail API response to frontend interface
        const mappedEmails: EmailMessage[] = (data.messages || []).map((msg: {
          id: string;
          subject: string;
          from: string;
          snippet: string;
          date: string;
          isUnread: boolean;
          labels: string[];
        }) => ({
          id: msg.id,
          subject: msg.subject || '(No subject)',
          sender: msg.from?.split('<')[0]?.trim() || 'Unknown',
          senderEmail: msg.from?.match(/<(.+)>/)?.[1] || msg.from || '',
          preview: msg.snippet || '',
          timestamp: msg.date || new Date().toISOString(),
          isRead: !msg.isUnread,
          isStarred: msg.labels?.includes('STARRED') || false,
          isImportant: msg.labels?.includes('IMPORTANT') || false,
          category: msg.labels?.includes('CATEGORY_SOCIAL') ? 'social' :
                    msg.labels?.includes('CATEGORY_PROMOTIONS') ? 'promotions' :
                    msg.labels?.includes('CATEGORY_UPDATES') ? 'updates' : 'primary'
        }))
        setEmails(mappedEmails)
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

  // Stats
  const stats = {
    total: emails.length,
    unread: emails.filter(e => !e.isRead).length,
    starred: emails.filter(e => e.isStarred).length,
    important: emails.filter(e => e.isImportant).length
  }

  // Filter emails based on active filter and search
  const getFilteredEmails = () => {
    let filtered = emails

    // Apply filter
    switch (activeFilter) {
      case 'unread':
        filtered = emails.filter(e => !e.isRead)
        break
      case 'starred':
        filtered = emails.filter(e => e.isStarred)
        break
      case 'important':
        filtered = emails.filter(e => e.isImportant)
        break
      default:
        filtered = emails
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(email =>
        email.subject.toLowerCase().includes(query) ||
        email.sender.toLowerCase().includes(query) ||
        email.senderEmail.toLowerCase().includes(query) ||
        email.preview.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  const filteredEmails = getFilteredEmails()

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

  // Handle stat click to toggle filter
  const handleStatClick = (filter: FilterType) => {
    setActiveFilter(filter === activeFilter ? 'all' : filter)
  }

  return (
    <div>
      {/* Header */}
      <header className="swiss-hero" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div>
          <p className="swiss-hero-subtitle">Communications</p>
          <h1 style={{ fontSize: '2rem' }}>Email</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.6rem',
            fontWeight: 800,
            color: googleConnected ? 'var(--success)' : 'var(--muted)'
          }}>
            {googleConnected ? '● SYNCED' : '○ LOCAL'}
          </span>
          <button
            onClick={() => fetchEmails()}
            className="swiss-btn"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem' }}
            disabled={isLoading}
          >
            {isLoading ? '...' : '↻'}
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="swiss-btn swiss-btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.65rem' }}
          >
            + NEW
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search emails by sender, subject, or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="swiss-input"
          style={{ maxWidth: '500px' }}
        />
      </div>

      {/* Clickable Stats/Filters */}
      <section className="swiss-metric-grid" style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => handleStatClick('all')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: activeFilter === 'all' ? 'var(--fg)' : 'transparent',
            color: activeFilter === 'all' ? 'var(--bg)' : undefined,
            border: activeFilter === 'all' ? '2px solid var(--fg)' : '1px solid var(--surface)',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: activeFilter === 'all' ? 'var(--muted)' : undefined }}>
            Total
          </span>
          <span className="swiss-metric-value" style={{ color: activeFilter === 'all' ? 'var(--bg)' : undefined }}>
            {String(stats.total).padStart(2, '0')}
          </span>
        </button>
        <button
          onClick={() => handleStatClick('unread')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: activeFilter === 'unread' ? 'var(--fg)' : 'transparent',
            color: activeFilter === 'unread' ? 'var(--bg)' : undefined,
            border: activeFilter === 'unread' ? '2px solid var(--fg)' : '1px solid var(--surface)',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: activeFilter === 'unread' ? 'var(--muted)' : undefined }}>
            Unread
          </span>
          <span className="swiss-metric-value" style={{ color: activeFilter === 'unread' ? 'var(--bg)' : (stats.unread > 0 ? 'var(--accent)' : undefined) }}>
            {String(stats.unread).padStart(2, '0')}
          </span>
        </button>
        <button
          onClick={() => handleStatClick('starred')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: activeFilter === 'starred' ? 'var(--fg)' : 'transparent',
            color: activeFilter === 'starred' ? 'var(--bg)' : undefined,
            border: activeFilter === 'starred' ? '2px solid var(--fg)' : '1px solid var(--surface)',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: activeFilter === 'starred' ? 'var(--muted)' : undefined }}>
            Starred
          </span>
          <span className="swiss-metric-value" style={{ color: activeFilter === 'starred' ? 'var(--bg)' : undefined }}>
            {String(stats.starred).padStart(2, '0')}
          </span>
        </button>
        <button
          onClick={() => handleStatClick('important')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: activeFilter === 'important' ? 'var(--fg)' : 'transparent',
            color: activeFilter === 'important' ? 'var(--bg)' : undefined,
            border: activeFilter === 'important' ? '2px solid var(--fg)' : '1px solid var(--surface)',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: activeFilter === 'important' ? 'var(--muted)' : undefined }}>
            Important
          </span>
          <span className="swiss-metric-value" style={{ color: activeFilter === 'important' ? 'var(--bg)' : undefined }}>
            {String(stats.important).padStart(2, '0')}
          </span>
        </button>
      </section>

      {/* Active Filter Indicator */}
      {(activeFilter !== 'all' || searchQuery) && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active filters:
          </span>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                background: 'var(--fg)',
                color: 'var(--bg)',
                border: 'none',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              {activeFilter} ×
            </button>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                background: 'var(--fg)',
                color: 'var(--bg)',
                border: 'none',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              "{searchQuery}" ×
            </button>
          )}
          <button
            onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'transparent',
              border: '1px solid var(--muted)',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            Clear all
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>
            Showing {filteredEmails.length} of {emails.length}
          </span>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '2px solid var(--fg)',
          background: 'var(--surface)'
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
              border: '1px solid var(--fg)',
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

      {/* Main Grid */}
      <div className="swiss-grid">
        {/* Email List */}
        <section>
          <h2 className="swiss-section-title">
            {activeFilter === 'all' ? 'INBOX' :
             activeFilter === 'unread' ? 'UNREAD' :
             activeFilter === 'starred' ? 'STARRED' :
             'IMPORTANT'} ({filteredEmails.length})
          </h2>

          {!googleConnected && emails.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--muted)',
              border: '1px dashed var(--muted)'
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
              color: 'var(--muted)',
              border: '1px dashed var(--muted)'
            }}>
              <p>No emails match your filter</p>
              {(activeFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                  className="swiss-btn"
                  style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
                >
                  Clear filters
                </button>
              )}
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
                  background: selectedEmail?.id === email.id ? 'var(--surface)' : 'transparent',
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
                        fontSize: '1rem',
                        color: email.isStarred ? 'var(--warning)' : 'var(--muted)'
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
                      <span style={{
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        fontSize: '0.6rem',
                        padding: '0.1rem 0.3rem',
                        fontWeight: 700
                      }}>!</span>
                    )}
                    {!email.isRead && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--info)'
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
                  color: 'var(--muted)',
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
              <h2 className="swiss-section-title">MESSAGE</h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {selectedEmail.subject}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                      From: {selectedEmail.sender} &lt;{selectedEmail.senderEmail}&gt;
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      {format(new Date(selectedEmail.timestamp), 'EEEE, MMMM d, yyyy \'at\' HH:mm')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => toggleStar(selectedEmail.id)}
                      className="swiss-btn"
                      style={{ padding: '0.5rem 1rem', color: selectedEmail.isStarred ? 'var(--warning)' : undefined }}
                    >
                      {selectedEmail.isStarred ? '★' : '☆'}
                    </button>
                    <button
                      onClick={() => deleteEmail(selectedEmail.id)}
                      className="swiss-btn"
                      style={{ padding: '0.5rem 1rem', color: 'var(--accent)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--surface)',
                border: '1px solid var(--surface)',
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
              <h2 className="swiss-section-title">SELECT MESSAGE</h2>
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                color: 'var(--muted)',
                border: '1px dashed var(--muted)'
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
                    color: 'var(--muted)',
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
                      <div style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
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
          background: 'var(--fg)',
          color: 'var(--bg)',
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
