import { useState, useEffect, useRef, useCallback } from 'react'
import { AGUIEvent, WSMessage } from '@/types'

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  lastEvent: AGUIEvent | null;
  sendMessage: (message: any) => void;
  connectionError: string | null;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<AGUIEvent | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && isConnected) {
      const wsMessage: WSMessage = {
        id: `msg_${Date.now()}`,
        type: 'request',
        data: { content: message },
        timestamp: new Date().toISOString()
      }
      socketRef.current.send(JSON.stringify(wsMessage))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }, [isConnected])

  const connect = useCallback(() => {
    try {
      console.log('🔌 Attempting WebSocket connection to:', url)
      
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        console.log('🌐 WebSocket connected to AG-UI backend')
        setIsConnected(true)
        setConnectionError(null)
        setReconnectAttempts(0)
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage
          console.log('📡 WebSocket message received:', message)
          
          if (message.type === 'event' && message.data) {
            setLastEvent(message.data as AGUIEvent)
            
            // Dispatch custom events for other components to listen to
            const customEvent = new CustomEvent('ag-ui-event', { 
              detail: message.data 
            })
            window.dispatchEvent(customEvent)
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        
        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connect()
          }, delay)
        } else if (reconnectAttempts >= 5) {
          setConnectionError('Maximum reconnection attempts reached')
        }
      }

      socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setConnectionError('websocket error')
        setIsConnected(false)
      }

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error)
      setConnectionError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [url, reconnectAttempts])

  useEffect(() => {
    connect()

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up WebSocket connection')
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting')
        socketRef.current = null
      }
    }
  }, [connect])

  return {
    socket: socketRef.current,
    isConnected,
    lastEvent,
    sendMessage,
    connectionError
  }
}

// Hook for subscribing to specific AG-UI event types
export function useAGUIEvent(
  eventType: string,
  handler: (event: AGUIEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent
      const aguiEvent = customEvent.detail as AGUIEvent
      if (aguiEvent.type === eventType) {
        handler(aguiEvent)
      }
    }

    window.addEventListener('ag-ui-event', handleEvent as EventListener)

    return () => {
      window.removeEventListener('ag-ui-event', handleEvent as EventListener)
    }
  }, [eventType, ...dependencies])
}

// Hook for AG-UI streaming messages
export function useAGUIStreaming() {
  const [streamingMessage, setStreamingMessage] = useState<{
    messageId: string;
    content: string;
    role: 'assistant' | 'user' | 'system';
    isComplete: boolean;
  } | null>(null)

  useAGUIEvent('TextMessageStart', (event: any) => {
    setStreamingMessage({
      messageId: event.messageId,
      content: '',
      role: event.role,
      isComplete: false
    })
  })

  useAGUIEvent('TextMessageContent', (event: any) => {
    setStreamingMessage(prev => 
      prev && prev.messageId === event.messageId
        ? { ...prev, content: prev.content + event.delta }
        : prev
    )
  })

  useAGUIEvent('TextMessageEnd', (event: any) => {
    setStreamingMessage(prev => 
      prev && prev.messageId === event.messageId
        ? { ...prev, isComplete: true }
        : prev
    )

    // Clear streaming message after a short delay
    setTimeout(() => {
      setStreamingMessage(null)
    }, 100)
  })

  return streamingMessage
}

// Hook for tool call events
export function useAGUIToolCalls() {
  const [activeTool, setActiveTool] = useState<{
    toolCallId: string;
    toolName: string;
    arguments: string;
    isComplete: boolean;
  } | null>(null)

  useAGUIEvent('ToolCallStart', (event: any) => {
    setActiveTool({
      toolCallId: event.toolCallId,
      toolName: event.toolCallName,
      arguments: '',
      isComplete: false
    })
  })

  useAGUIEvent('ToolCallArgs', (event: any) => {
    setActiveTool(prev => 
      prev && prev.toolCallId === event.toolCallId
        ? { ...prev, arguments: prev.arguments + event.delta }
        : prev
    )
  })

  useAGUIEvent('ToolCallEnd', (event: any) => {
    setActiveTool(prev => 
      prev && prev.toolCallId === event.toolCallId
        ? { ...prev, isComplete: true }
        : prev
    )

    // Clear tool call after completion
    setTimeout(() => {
      setActiveTool(null)
    }, 2000)
  })

  return activeTool
}
