import { useState, useRef, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChatMessage } from '@/types'
import { getWsUrl, getMemoryUrl } from '@/config/api'

interface StreamingMessage {
  messageId: string
  content: string
  role: 'assistant' | 'user' | 'system'
  isComplete: boolean
}

interface ToolCall {
  toolCallId: string
  toolName: string
  arguments: string
  isComplete: boolean
}

interface MemoryResult {
  id: string
  title: string
  snippet: string
  ts_start: string
  _score: number
  type: string
}

interface MemorySuggestion {
  id: string
  title: string
  snippet: string
  date: string
  relevance: number
}

// Initial executive assistant greeting
const initialMessage: ChatMessage = {
  id: 'initial_1',
  role: 'assistant',
  content: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}! I'm your Executive Assistant powered by AG-UI protocol.\n\nI can help you with:\n• Calendar management and scheduling\n• Email summarization and responses\n• Task and project management\n• Research and analysis\n• Decision support\n\nWhat would you like me to help you with today?`,
  timestamp: new Date().toISOString(),
  metadata: {
    category: 'general'
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [activeTool, setActiveTool] = useState<ToolCall | null>(null)
  const [memorySuggestions, setMemorySuggestions] = useState<MemorySuggestion[]>([])
  const [memoryLoading, setMemoryLoading] = useState(false)
  const [showMemoryPanel, setShowMemoryPanel] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { socket, isConnected, sendMessage, connectionError } = useWebSocket(getWsUrl())

  // Debounced memory search as user types
  const searchMemory = useCallback(async (query: string) => {
    if (query.length < 3) {
      setMemorySuggestions([])
      return
    }

    setMemoryLoading(true)
    try {
      // Use GET endpoint with query params - matches server_http.py /search endpoint
      const response = await fetch(`${getMemoryUrl()}/search?q=${encodeURIComponent(query)}&limit=5`)

      if (!response.ok) throw new Error('Memory search failed')

      const data = await response.json()
      const suggestions: MemorySuggestion[] = (data.results || []).map((result: MemoryResult) => ({
        id: result.id,
        title: result.title || 'Conversation',
        snippet: result.snippet || '',
        date: result.ts_start ? format(new Date(result.ts_start), 'MMM d, yyyy') : 'Unknown',
        relevance: Math.round((result._score || 0) * 100)
      }))

      setMemorySuggestions(suggestions)
    } catch (error) {
      console.warn('Memory search error:', error)
      setMemorySuggestions([])
    } finally {
      setMemoryLoading(false)
    }
  }, [])

  // Trigger memory search when input changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (input.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchMemory(input)
      }, 500) // Debounce 500ms
    } else {
      setMemorySuggestions([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [input, searchMemory])

  // Listen for AG-UI events from WebSocket
  useEffect(() => {
    if (!socket) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('AG-UI Event received:', data)

        switch (data.type) {
          case 'TextMessageStart':
            setStreamingMessage({
              messageId: data.messageId,
              content: '',
              role: data.role || 'assistant',
              isComplete: false
            })
            setIsTyping(true)
            break

          case 'TextMessageContent':
            setStreamingMessage(prev =>
              prev && prev.messageId === data.messageId
                ? { ...prev, content: prev.content + data.delta }
                : prev
            )
            break

          case 'TextMessageEnd':
            if (streamingMessage) {
              const completedMessage: ChatMessage = {
                id: data.messageId,
                role: streamingMessage.role,
                content: streamingMessage.content,
                timestamp: new Date().toISOString(),
                metadata: { category: 'general' }
              }
              setMessages(prev => [...prev, completedMessage])
              setStreamingMessage(null)
              setIsTyping(false)
            }
            break

          case 'ToolCallStart':
            setActiveTool({
              toolCallId: data.toolCallId,
              toolName: data.toolCallName,
              arguments: '',
              isComplete: false
            })
            break

          case 'ToolCallArgs':
            setActiveTool(prev =>
              prev && prev.toolCallId === data.toolCallId
                ? { ...prev, arguments: prev.arguments + data.delta }
                : prev
            )
            break

          case 'ToolCallEnd':
            if (activeTool) {
              const toolResultMessage: ChatMessage = {
                id: `tool_${Date.now()}`,
                role: 'assistant',
                content: `Completed: ${data.toolCallName || activeTool.toolName}`,
                timestamp: new Date().toISOString(),
                metadata: {
                  category: 'general',
                  toolCalls: [activeTool.toolName]
                }
              }
              setMessages(prev => [...prev, toolResultMessage])
              setActiveTool(null)
            }
            break
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    socket.addEventListener('message', handleMessage)
    return () => socket.removeEventListener('message', handleMessage)
  }, [socket, streamingMessage, activeTool])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  const handleSendMessage = async () => {
    if (!input.trim() || !isConnected) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      metadata: { category: 'general' }
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = input
    setInput('')

    try {
      // Include memory context if available
      const memoryContext = memorySuggestions.length > 0
        ? memorySuggestions.slice(0, 3).map(s => ({
            title: s.title,
            snippet: s.snippet,
            date: s.date,
            relevance: s.relevance
          }))
        : undefined

      const agUIMessage = {
        type: 'ChatMessage',
        messageId: userMessage.id,
        content: messageToSend,
        role: 'user',
        timestamp: userMessage.timestamp,
        context: {
          executiveProfile: 'Sven Arnarsson',
          timezone: 'PST',
          workingHours: '08:00-18:00',
          memoryContext
        }
      }

      sendMessage(agUIMessage)

      // Clear memory suggestions after sending
      setMemorySuggestions([])
    } catch (error) {
      console.error('Error sending message:', error)

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: 'Failed to send message. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
        metadata: { category: 'general' }
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div style={{ height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="swiss-hero" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div>
          <p className="swiss-hero-subtitle">Command Interface</p>
          <h1 style={{ fontSize: '2rem' }}>Executive Assistant</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="swiss-status">
            {isConnected ? '● CONNECTED' : '○ OFFLINE'}
          </div>
          {activeTool && (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
              EXECUTING: {activeTool.toolName.toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }} className="scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '1.5rem',
              padding: message.role === 'user' ? '1rem 1.5rem' : '1rem 0',
              background: message.role === 'user' ? 'var(--surface)' : 'transparent',
              borderLeft: message.role === 'system' ? '2px solid var(--accent)' : 'none',
              paddingLeft: message.role === 'system' ? '1rem' : undefined
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)'
              }}>
                {message.role === 'user' ? 'YOU' : message.role === 'system' ? 'SYSTEM' : 'ASSISTANT'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {format(new Date(message.timestamp), 'HH:mm')}
              </span>
            </div>
            <p style={{
              fontSize: '0.95rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap'
            }}>
              {message.content}
            </p>
            {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
              <div style={{
                marginTop: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Tools: {message.metadata.toolCalls.join(', ')}
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && !streamingMessage.isComplete && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted)'
              }}>
                ASSISTANT
              </span>
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.7rem',
                color: 'var(--accent)'
              }}>
                ● STREAMING
              </span>
            </div>
            <p style={{
              fontSize: '0.95rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap'
            }}>
              {streamingMessage.content}
            </p>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !streamingMessage && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem 0' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted)'
            }}>
              ASSISTANT IS THINKING...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Memory Insights Panel */}
      {showMemoryPanel && (memorySuggestions.length > 0 || memoryLoading) && (
        <div style={{
          borderTop: '1px solid var(--surface)',
          padding: '1rem 0',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted)'
            }}>
              {memoryLoading ? '● SEARCHING MEMORY...' : '● MEMORY INSIGHTS'}
            </span>
            <button
              onClick={() => setShowMemoryPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: 'var(--muted)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Hide
            </button>
          </div>

          {!memoryLoading && memorySuggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {memorySuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  onClick={() => {
                    setInput(prev => prev + ` [ref: ${suggestion.title}]`)
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-hover)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--fg)'
                    e.currentTarget.style.background = 'var(--surface-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--surface-hover)'
                    e.currentTarget.style.background = 'var(--surface)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--fg)'
                    }}>
                      {suggestion.title}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      background: suggestion.relevance >= 70 ? 'var(--fg)' : 'var(--muted)',
                      color: 'var(--bg)'
                    }}>
                      {suggestion.relevance}%
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted)',
                    margin: 0,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {suggestion.snippet}
                  </p>
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'var(--muted)',
                    marginTop: '0.25rem',
                    display: 'block'
                  }}>
                    {suggestion.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div style={{ borderTop: '2px solid var(--fg)', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            className="swiss-input"
            style={{ flex: 1 }}
            placeholder="Enter command or question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || !isConnected}
            className="swiss-btn swiss-btn-primary"
            style={{ padding: '1rem 2rem' }}
          >
            Send
          </button>
        </div>

        {/* Memory toggle when panel is hidden */}
        {!showMemoryPanel && (
          <button
            onClick={() => setShowMemoryPanel(true)}
            style={{
              marginTop: '0.75rem',
              background: 'none',
              border: 'none',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--muted)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: 0
            }}
          >
            ● Show Memory Insights
          </button>
        )}

        {/* Quick commands */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            "Calendar today",
            "Summarize inbox",
            "New task",
            "Find meeting time",
            "Research trends",
            "Budget status"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              disabled={!isConnected}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                border: '1px solid var(--fg)',
                background: 'transparent',
                color: 'var(--fg)',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (isConnected) {
                  e.currentTarget.style.background = 'var(--fg)'
                  e.currentTarget.style.color = 'var(--bg)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--fg)'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {!isConnected && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'var(--surface)',
            fontSize: '0.85rem',
            borderLeft: '2px solid var(--accent)'
          }}>
            <span className="swiss-urgent">!</span> Connecting to AG-UI backend... Ensure the server is running on port 8080.
          </div>
        )}

        {connectionError && (
          <div style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Error: {connectionError}
          </div>
        )}
      </div>
    </div>
  )
}
