/**
 * AG-UI Event Emitter
 * Handles real-time streaming of AG-UI protocol events
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AGUIEvent, WSMessage } from '../types/ag-ui';

export class AGUIEventEmitter extends EventEmitter {
  private connections: Map<string, any> = new Map();
  private messageHistory: WSMessage[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    super();
    this.setMaxListeners(0); // Unlimited listeners
  }

  /**
   * Register a WebSocket connection
   */
  addConnection(id: string, ws: any): void {
    this.connections.set(id, ws);
    console.log(`AG-UI connection added: ${id}`);

    // Send recent message history to new connection
    this.sendMessageHistory(id);

    // Handle connection close
    ws.on('close', () => {
      this.removeConnection(id);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for connection ${id}:`, error);
      this.removeConnection(id);
    });
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(id: string): void {
    this.connections.delete(id);
    console.log(`AG-UI connection removed: ${id}`);
  }

  /**
   * Emit an AG-UI event to all connected clients
   */
  emitAGUIEvent(event: AGUIEvent): void {
    const message: WSMessage = {
      id: uuidv4(),
      type: 'event',
      data: event,
      timestamp: new Date().toISOString()
    };

    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = message.timestamp;
    }

    // Store in history
    this.addToHistory(message);

    // Broadcast to all connections
    this.broadcast(message);

    // Emit internally for other components
    this.emit('ag-ui-event', event);
  }

  /**
   * Send a response to a specific connection
   */
  sendResponse(connectionId: string, data: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`Connection not found: ${connectionId}`);
      return;
    }

    const message: WSMessage = {
      id: uuidv4(),
      type: 'response',
      data,
      timestamp: new Date().toISOString()
    };

    this.sendMessage(connection, message);
  }

  /**
   * Broadcast message to all connections
   */
  private broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.connections.forEach((ws, id) => {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(messageStr);
        } else {
          // Remove dead connections
          this.removeConnection(id);
        }
      } catch (error) {
        console.error(`Error broadcasting to connection ${id}:`, error);
        this.removeConnection(id);
      }
    });
  }

  /**
   * Send message to specific connection
   */
  private sendMessage(ws: any, message: WSMessage): void {
    try {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  /**
   * Add message to history
   */
  private addToHistory(message: WSMessage): void {
    this.messageHistory.push(message);
    
    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Send recent message history to a connection
   */
  private sendMessageHistory(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Send last 50 messages
    const recentMessages = this.messageHistory.slice(-50);
    
    recentMessages.forEach(message => {
      this.sendMessage(connection, message);
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all connection IDs
   */
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }
}

// Singleton instance
export const aguiEventEmitter = new AGUIEventEmitter();
