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
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
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
              background: message.role === 'user' ? '#f2f2f2' : 'transparent',
              borderLeft: message.role === 'system' ? '2px solid #ff0000' : 'none',
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
                color: '#666'
              }}>
                {message.role === 'user' ? 'YOU' : message.role === 'system' ? 'SYSTEM' : 'ASSISTANT'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>
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
                color: '#666',
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
                color: '#666'
              }}>
                ASSISTANT
              </span>
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.7rem',
                color: '#ff0000'
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
              color: '#666'
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
          borderTop: '1px solid #e5e5e5',
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
              color: '#666'
            }}>
              {memoryLoading ? '● SEARCHING MEMORY...' : '● MEMORY INSIGHTS'}
            </span>
            <button
              onClick={() => setShowMemoryPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: '#666',
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
                    background: '#fafafa',
                    border: '1px solid #e5e5e5',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#000'
                    e.currentTarget.style.background = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e5e5'
                    e.currentTarget.style.background = '#fafafa'
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
                      color: '#000'
                    }}>
                      {suggestion.title}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      background: suggestion.relevance >= 70 ? '#000' : '#666',
                      color: '#fff'
                    }}>
                      {suggestion.relevance}%
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#666',
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
                    color: '#999',
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
      <div style={{ borderTop: '2px solid #000', paddingTop: '2rem' }}>
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
              color: '#666',
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
            "Show my calendar for today",
            "Summarize my inbox",
            "Create a high-priority task",
            "Find time for a team meeting",
            "Research latest industry trends",
            "Review Q4 budget status"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              disabled={!isConnected}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid #000',
                background: 'transparent',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (isConnected) {
                  e.currentTarget.style.background = '#000'
                  e.currentTarget.style.color = '#fff'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#000'
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
            background: '#f2f2f2',
            fontSize: '0.85rem',
            borderLeft: '2px solid #ff0000'
          }}>
            <span className="swiss-urgent">!</span> Connecting to AG-UI backend... Ensure the server is running on port 8080.
          </div>
        )}

        {connectionError && (
          <div style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            color: '#ff0000',
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
