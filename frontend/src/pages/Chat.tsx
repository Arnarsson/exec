import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { useWebSocket } from '@/hooks/useWebSocket'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    toolCalls?: string[]
    category?: string
    priority?: string
  }
}

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

// Initial executive assistant greeting
const initialMessage: ChatMessage = {
  id: 'initial_1',
  role: 'assistant',
  content: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}! I'm your Executive Assistant powered by AG-UI protocol.\n\nI can help you with:\n📅 Calendar management and scheduling\n📧 Email summarization and responses\n📋 Task and project management\n🔍 Research and analysis\n💼 Decision support\n\nWhat would you like me to help you with today?`,
  timestamp: new Date().toISOString(),
  metadata: {
    category: 'general'
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [activeTool, setActiveTool] = useState<ToolCall | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { socket, isConnected, sendMessage, connectionError } = useWebSocket('ws://localhost:8080')
  
  console.log('Chat component - WebSocket status:', { isConnected, connectionError })

  // Listen for AG-UI events from WebSocket
  useEffect(() => {
    if (!socket) return
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('AG-UI Event received:', data)
        
        // Handle different AG-UI event types
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
              // Tool completed, add result message
              const toolResultMessage: ChatMessage = {
                id: `tool_${Date.now()}`,
                role: 'assistant',
                content: `🔧 Completed: ${data.toolCallName || activeTool.toolName}`,
                timestamp: new Date().toISOString(),
                metadata: {
                  category: 'tool',
                  toolCalls: [activeTool.toolName]
                }
              }
              setMessages(prev => [...prev, toolResultMessage])
              setActiveTool(null)
            }
            break
            
          case 'CalendarUpdate':
            // Handle calendar updates from n8n webhooks
            const calendarMessage: ChatMessage = {
              id: `calendar_${Date.now()}`,
              role: 'system',
              content: `📅 Calendar ${data.action}: ${data.events?.length || 0} events updated`,
              timestamp: new Date().toISOString(),
              metadata: {
                category: 'calendar',
                events: data.events
              }
            }
            setMessages(prev => [...prev, calendarMessage])
            break
            
          case 'EmailUpdate':
            // Handle email updates from n8n webhooks
            const emailMessage: ChatMessage = {
              id: `email_${Date.now()}`,
              role: 'system',
              content: `📧 Email update: ${data.emails?.length || 0} new emails${data.summary ? ` - ${data.summary}` : ''}`,
              timestamp: new Date().toISOString(),
              metadata: {
                category: 'email',
                emails: data.emails,
                summary: data.summary
              }
            }
            setMessages(prev => [...prev, emailMessage])
            break
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    socket.addEventListener('message', handleMessage)
    return () => socket.removeEventListener('message', handleMessage)
  }, [socket, streamingMessage, activeTool])

  // Auto-scroll to bottom when new messages arrive
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
      metadata: {
        category: detectMessageCategory(input)
      }
    }

    setMessages(prev => [...prev, userMessage])
    const messageToSend = input
    setInput('')

    // Send message to AG-UI backend via WebSocket
    try {
      const agUIMessage = {
        type: 'ChatMessage',
        messageId: userMessage.id,
        content: messageToSend,
        role: 'user',
        timestamp: userMessage.timestamp,
        context: {
          executiveProfile: 'CEO Sarah Chen',
          timezone: 'PST',
          workingHours: '08:00-18:00'
        }
      }
      
      sendMessage(agUIMessage)
      console.log('Sent AG-UI message:', agUIMessage)
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: 'Failed to send message. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
        metadata: { category: 'error' }
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }
  
  const detectMessageCategory = (message: string): string => {
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('calendar') || lowerMessage.includes('meeting') || lowerMessage.includes('schedule')) {
      return 'calendar'
    }
    if (lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('message')) {
      return 'email'
    }
    if (lowerMessage.includes('task') || lowerMessage.includes('project') || lowerMessage.includes('todo')) {
      return 'tasks'
    }
    if (lowerMessage.includes('research') || lowerMessage.includes('analyze') || lowerMessage.includes('find')) {
      return 'research'
    }
    return 'general'
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleVoiceInput = () => {
    setIsListening(!isListening)
    // Voice recognition would be implemented here
  }

  const getMessageIcon = (category?: string) => {
    switch (category) {
      case 'calendar': return '📅'
      case 'email': return '📧'
      case 'tasks': return '📋'
      case 'research': return '🔍'
      default: return '💭'
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200" style={{background: 'white'}}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              💬 Executive Assistant Chat
            </h1>
            <p className="text-gray-600 mt-1">
              AG-UI Protocol • Real-time streaming • Tool execution
            </p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            {activeTool && (
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-blue-800">
                  🔧 {activeTool.toolName}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#22c55e' : '#ef4444'
              }}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'AG-UI Connected' : 'Disconnected'}
              </span>
            </div>
            
            {connectionError && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                {connectionError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Message bubble */}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'message-user ml-auto'
                    : message.role === 'system'
                    ? 'message-system'
                    : 'message-assistant'
                }`}
              >
                {/* Tool indicator */}
                {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
                  <div className="flex items-center mb-2 text-xs opacity-75">
                    <span className="mr-1">✨</span>
                    Using tools: {message.metadata.toolCalls.join(', ')}
                  </div>
                )}
                
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              
              {/* Message metadata */}
              <div className={`flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <span className="mr-2">{getMessageIcon(message.metadata?.category)}</span>
                <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
              </div>
            </div>
            
            {/* Avatar */}
            <div className={`flex-shrink-0 ${message.role === 'user' ? 'order-1 ml-3' : 'order-2 mr-3'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {message.role === 'user' ? 'You' : 'AI'}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && !streamingMessage.isComplete && (
          <div className="flex justify-start">
            <div className="max-w-[70%]">
              <div className="message-assistant px-4 py-3 rounded-2xl">
                <div className="flex items-center mb-2 text-xs opacity-75">
                  <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                  Typing...
                </div>
                <p className="text-sm leading-relaxed">{streamingMessage.content}</p>
              </div>
            </div>
            <div className="flex-shrink-0 mr-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                AI
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[70%]">
              <div className="message-assistant px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Assistant is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-end space-x-3">
          {/* Additional actions */}
          <div className="flex space-x-2">
            <button
              onClick={toggleVoiceInput}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
            
            <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              📷
            </button>
            
            <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              📎
            </button>
          </div>

          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[48px] max-h-32"
              placeholder="Ask me anything about your schedule, emails, tasks, or need help with research..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || !isConnected}
              className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ✈️
            </button>
          </div>
        </div>

        {/* Quick suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "📅 Show my calendar for today",
            "📧 Summarize my inbox", 
            "📋 Create a high-priority task",
            "🤝 Find time for a team meeting",
            "🔍 Research latest industry trends",
            "💰 Review Q4 budget status"
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              disabled={!isConnected}
              className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        {!isConnected && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              🔄 Connecting to AG-UI backend... Make sure the backend server is running on port 8080.
            </div>
          </div>
        )}

        {/* Voice input indicator */}
        {isListening && (
          <div className="mt-3 flex items-center justify-center">
            <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-red-600 dark:text-red-400">Listening...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
