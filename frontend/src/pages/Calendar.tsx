import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { getApiUrl, getMemoryUrl } from '@/config/api'

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: string;
  attendees?: { email: string }[];
  description?: string;
}

interface MemoryResult {
  id: string;
  title: string;
  snippet: string;
  _score: number;
}

type ViewFilter = 'all' | 'today' | 'week' | 'month';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [showNewEventForm, setShowNewEventForm] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventTime, setNewEventTime] = useState('09:00')
  const [newEventDuration, setNewEventDuration] = useState('60')
  const [memorySuggestions, setMemorySuggestions] = useState<MemoryResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')

  // Check Google auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/auth/status`)
        if (response.ok) {
          const data = await response.json()
          setGoogleConnected(data.authenticated)
          if (data.authenticated) {
            fetchEvents()
          }
        }
      } catch (error) {
        console.warn('Google auth not available')
      }
    }
    checkAuth()
  }, [])

  // Fetch calendar events from Google
  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      // Use the range endpoint to get events for the current month
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const response = await fetch(
        `${getApiUrl()}/api/calendar/range?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}&limit=100`
      )
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.warn('Failed to fetch calendar events')
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch when month changes
  useEffect(() => {
    if (googleConnected) {
      fetchEvents()
    }
  }, [currentDate, googleConnected])

  // Search memory for meeting-related content
  const searchMemoryForMeetings = useCallback(async () => {
    try {
      const response = await fetch(`${getMemoryUrl()}/search?q=meeting schedule calendar&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setMemorySuggestions(data.results || [])
      }
    } catch {
      // Memory service not available
    }
  }, [])

  useEffect(() => {
    searchMemoryForMeetings()
  }, [searchMemoryForMeetings])

  // Get days for calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Calculate padding days for the start of the month
  const startPadding = monthStart.getDay()
  const paddingDays = Array(startPadding).fill(null)

  // Filter events based on view and search
  const todayEvents = events.filter(e => isToday(new Date(e.start.dateTime)))

  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())
  const thisWeekEvents = events.filter(e => {
    const eventDate = new Date(e.start.dateTime)
    return eventDate >= weekStart && eventDate <= weekEnd
  })

  // Get filtered events based on view filter and search
  const getFilteredEvents = () => {
    let filtered = events

    // Apply view filter
    switch (viewFilter) {
      case 'today':
        filtered = todayEvents
        break
      case 'week':
        filtered = thisWeekEvents
        break
      case 'month':
        filtered = events
        break
      default:
        filtered = events
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.summary.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.attendees?.some(a => a.email.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  const filteredEvents = getFilteredEvents()

  // Filter events for selected date
  const selectedDateEvents = events.filter(event =>
    isSameDay(new Date(event.start.dateTime), selectedDate)
  )

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event =>
      isSameDay(new Date(event.start.dateTime), day)
    )
  }

  // Add new event (mock - would connect to Google Calendar API)
  const addNewEvent = () => {
    if (!newEventTitle.trim()) return

    const startDateTime = new Date(selectedDate)
    const [hours, minutes] = newEventTime.split(':')
    startDateTime.setHours(parseInt(hours), parseInt(minutes))

    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(newEventDuration))

    const newEvent: CalendarEvent = {
      id: `local_${Date.now()}`,
      summary: newEventTitle,
      start: { dateTime: startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() }
    }

    setEvents(prev => [...prev, newEvent])
    setNewEventTitle('')
    setShowNewEventForm(false)
  }

  // Handle stat click to set filter
  const handleStatClick = (filter: ViewFilter) => {
    setViewFilter(filter === viewFilter ? 'all' : filter)
  }

  return (
    <div>
      {/* Header */}
      <header className="swiss-hero" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div>
          <p className="swiss-hero-subtitle">Schedule Management</p>
          <h1 style={{ fontSize: '2rem' }}>Calendar</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: googleConnected ? '#16a34a' : '#666'
          }}>
            {googleConnected ? '● GOOGLE SYNCED' : '○ LOCAL ONLY'}
          </span>
          <button
            onClick={() => setShowNewEventForm(true)}
            className="swiss-btn swiss-btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            + NEW EVENT
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search events by title, location, or attendee..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="swiss-input"
          style={{ maxWidth: '500px' }}
        />
      </div>

      {/* Clickable Stats/Filters */}
      <section className="swiss-metric-grid" style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => handleStatClick('today')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: viewFilter === 'today' ? '#000' : 'transparent',
            color: viewFilter === 'today' ? '#fff' : undefined,
            border: viewFilter === 'today' ? '2px solid #000' : '1px solid #e5e5e5',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: viewFilter === 'today' ? '#ccc' : undefined }}>
            Today
          </span>
          <span className="swiss-metric-value" style={{ color: viewFilter === 'today' ? '#fff' : undefined }}>
            {String(todayEvents.length).padStart(2, '0')}
          </span>
        </button>
        <button
          onClick={() => handleStatClick('week')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: viewFilter === 'week' ? '#000' : 'transparent',
            color: viewFilter === 'week' ? '#fff' : undefined,
            border: viewFilter === 'week' ? '2px solid #000' : '1px solid #e5e5e5',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: viewFilter === 'week' ? '#ccc' : undefined }}>
            This Week
          </span>
          <span className="swiss-metric-value" style={{ color: viewFilter === 'week' ? '#fff' : undefined }}>
            {String(thisWeekEvents.length).padStart(2, '0')}
          </span>
        </button>
        <button
          onClick={() => handleStatClick('month')}
          className="swiss-metric"
          style={{
            cursor: 'pointer',
            background: viewFilter === 'month' ? '#000' : 'transparent',
            color: viewFilter === 'month' ? '#fff' : undefined,
            border: viewFilter === 'month' ? '2px solid #000' : '1px solid #e5e5e5',
            transition: 'all 0.15s ease'
          }}
        >
          <span className="swiss-metric-label" style={{ color: viewFilter === 'month' ? '#ccc' : undefined }}>
            This Month
          </span>
          <span className="swiss-metric-value" style={{ color: viewFilter === 'month' ? '#fff' : undefined }}>
            {String(events.length).padStart(2, '0')}
          </span>
        </button>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Showing</span>
          <span className="swiss-metric-value">{String(filteredEvents.length).padStart(2, '0')}</span>
        </div>
      </section>

      {/* Active Filter Indicator */}
      {(viewFilter !== 'all' || searchQuery) && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active filters:
          </span>
          {viewFilter !== 'all' && (
            <button
              onClick={() => setViewFilter('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                background: '#000',
                color: '#fff',
                border: 'none',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              {viewFilter} ×
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
                background: '#000',
                color: '#fff',
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
            onClick={() => { setViewFilter('all'); setSearchQuery(''); }}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'transparent',
              border: '1px solid #ccc',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* New Event Form */}
      {showNewEventForm && (
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
              New Event — {format(selectedDate, 'EEEE, MMMM d')}
            </span>
            <button
              onClick={() => setShowNewEventForm(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              ×
            </button>
          </div>

          <input
            type="text"
            placeholder="Event title..."
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            className="swiss-input"
            style={{ marginBottom: '1rem' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#666',
                marginBottom: '0.5rem'
              }}>
                Time
              </label>
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
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
                Duration
              </label>
              <select
                value={newEventDuration}
                onChange={(e) => setNewEventDuration(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid #000',
                  background: 'transparent',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          <button
            onClick={addNewEvent}
            disabled={!newEventTitle.trim()}
            className="swiss-btn swiss-btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Add Event
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="swiss-grid">
        {/* Calendar Grid */}
        <section>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 className="swiss-section-title" style={{ marginBottom: 0 }}>
              {format(currentDate, 'MMMM yyyy').toUpperCase()}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => navigateMonth('prev')}
                className="swiss-btn"
                style={{ padding: '0.5rem 1rem' }}
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="swiss-btn"
                style={{ padding: '0.5rem 1rem' }}
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="swiss-btn"
                style={{ padding: '0.5rem 1rem' }}
              >
                →
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderTop: '1px solid #000',
            borderLeft: '1px solid #000'
          }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div
                key={day}
                style={{
                  padding: '0.75rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  borderRight: '1px solid #000',
                  borderBottom: '1px solid #000',
                  background: '#f2f2f2'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderLeft: '1px solid #000'
          }}>
            {/* Padding days */}
            {paddingDays.map((_, idx) => (
              <div
                key={`pad-${idx}`}
                style={{
                  height: '80px',
                  borderRight: '1px solid #000',
                  borderBottom: '1px solid #000',
                  background: '#fafafa'
                }}
              />
            ))}

            {/* Calendar days */}
            {calendarDays.map(day => {
              const dayEvents = getEventsForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isDayToday = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  style={{
                    height: '80px',
                    padding: '0.5rem',
                    border: 'none',
                    borderRight: '1px solid #000',
                    borderBottom: '1px solid #000',
                    background: isSelected ? '#000' : isDayToday ? '#f2f2f2' : 'transparent',
                    color: isSelected ? '#fff' : isCurrentMonth ? '#000' : '#999',
                    textAlign: 'left',
                    verticalAlign: 'top',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: isDayToday ? 700 : 400
                  }}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div style={{
                      marginTop: '0.25rem',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: isSelected ? '#ff0000' : '#000'
                    }}>
                      {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Selected Day Details or Filtered List */}
        <section>
          {viewFilter !== 'all' || searchQuery ? (
            <>
              <h2 className="swiss-section-title">
                {viewFilter === 'today' ? "TODAY'S EVENTS" :
                 viewFilter === 'week' ? "THIS WEEK'S EVENTS" :
                 searchQuery ? `SEARCH: "${searchQuery.toUpperCase()}"` :
                 "ALL EVENTS"}
              </h2>

              {filteredEvents.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#666',
                  border: '1px dashed #ccc'
                }}>
                  <p>No events match your filter</p>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <div key={event.id} className="swiss-item">
                    <div style={{ flex: 1 }}>
                      <strong className="swiss-item-title">{event.summary}</strong>
                      <div className="swiss-item-meta">
                        {format(new Date(event.start.dateTime), 'EEE, MMM d')} · {format(new Date(event.start.dateTime), 'HH:mm')} — {format(new Date(event.end.dateTime), 'HH:mm')}
                        {event.location && ` / ${event.location}`}
                      </div>
                      {event.attendees && event.attendees.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                          {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <h2 className="swiss-section-title">
                {format(selectedDate, 'EEEE, MMMM d').toUpperCase()}
              </h2>

              {selectedDateEvents.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#666',
                  border: '1px dashed #ccc'
                }}>
                  <p style={{ marginBottom: '1rem' }}>No events scheduled</p>
                  <button
                    onClick={() => setShowNewEventForm(true)}
                    className="swiss-btn"
                    style={{ padding: '0.5rem 1.5rem' }}
                  >
                    + Add Event
                  </button>
                </div>
              ) : (
                selectedDateEvents.map(event => (
                  <div key={event.id} className="swiss-item">
                    <div style={{ flex: 1 }}>
                      <strong className="swiss-item-title">{event.summary}</strong>
                      <div className="swiss-item-meta">
                        {format(new Date(event.start.dateTime), 'HH:mm')} — {format(new Date(event.end.dateTime), 'HH:mm')}
                        {event.location && ` / ${event.location}`}
                      </div>
                      {event.attendees && event.attendees.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                          {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Memory Suggestions */}
          {memorySuggestions.length > 0 && !searchQuery && viewFilter === 'all' && (
            <div style={{ marginTop: '3rem' }}>
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
