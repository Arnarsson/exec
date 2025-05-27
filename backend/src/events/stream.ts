/**
 * AG-UI Stream Helper
 * Provides convenient methods for streaming AG-UI events
 */

import { v4 as uuidv4 } from 'uuid';
import { aguiEventEmitter } from './emitter';
import {
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
  MessagesSnapshotEvent,
  ExecutiveState
} from '../types/ag-ui';

export class AGUIStream {
  private threadId: string;
  private runId: string;

  constructor(threadId?: string) {
    this.threadId = threadId || uuidv4();
    this.runId = uuidv4();
  }

  /**
   * Start a new agent run
   */
  startRun(): void {
    const event: RunStartedEvent = {
      type: 'RunStarted',
      threadId: this.threadId,
      runId: this.runId,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Finish the current agent run
   */
  finishRun(): void {
    const event: RunFinishedEvent = {
      type: 'RunFinished',
      threadId: this.threadId,
      runId: this.runId,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Report an error in the current run
   */
  errorRun(message: string, code?: string): void {
    const event: RunErrorEvent = {
      type: 'RunError',
      message,
      code,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Start a step within the current run
   */
  startStep(stepName: string): void {
    const event: StepStartedEvent = {
      type: 'StepStarted',
      stepName,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Finish a step within the current run
   */
  finishStep(stepName: string): void {
    const event: StepFinishedEvent = {
      type: 'StepFinished',
      stepName,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Stream a text message
   */
  async streamMessage(
    content: string, 
    role: 'assistant' | 'user' | 'system' = 'assistant',
    chunkSize: number = 10
  ): Promise<string> {
    const messageId = uuidv4();

    // Start message
    const startEvent: TextMessageStartEvent = {
      type: 'TextMessageStart',
      messageId,
      role,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(startEvent);

    // Stream content in chunks
    for (let i = 0; i < content.length; i += chunkSize) {
      const delta = content.slice(i, i + chunkSize);
      
      const contentEvent: TextMessageContentEvent = {
        type: 'TextMessageContent',
        messageId,
        delta,
        timestamp: new Date().toISOString()
      };
      aguiEventEmitter.emitAGUIEvent(contentEvent);

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // End message
    const endEvent: TextMessageEndEvent = {
      type: 'TextMessageEnd',
      messageId,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(endEvent);

    return messageId;
  }

  /**
   * Stream a tool call
   */
  async streamToolCall(
    toolName: string,
    args: any,
    parentMessageId?: string,
    chunkSize: number = 20
  ): Promise<string> {
    const toolCallId = uuidv4();
    const argsString = JSON.stringify(args, null, 2);

    // Start tool call
    const startEvent: ToolCallStartEvent = {
      type: 'ToolCallStart',
      toolCallId,
      toolCallName: toolName,
      parentMessageId,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(startEvent);

    // Stream arguments in chunks
    for (let i = 0; i < argsString.length; i += chunkSize) {
      const delta = argsString.slice(i, i + chunkSize);
      
      const argsEvent: ToolCallArgsEvent = {
        type: 'ToolCallArgs',
        toolCallId,
        delta,
        timestamp: new Date().toISOString()
      };
      aguiEventEmitter.emitAGUIEvent(argsEvent);

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // End tool call
    const endEvent: ToolCallEndEvent = {
      type: 'ToolCallEnd',
      toolCallId,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(endEvent);

    return toolCallId;
  }

  /**
   * Send a complete state snapshot
   */
  sendStateSnapshot(state: ExecutiveState): void {
    const event: StateSnapshotEvent = {
      type: 'StateSnapshot',
      snapshot: state,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Send a state delta (JSON Patch operations)
   */
  sendStateDelta(operations: Array<{
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: any;
    from?: string;
  }>): void {
    const event: StateDeltaEvent = {
      type: 'StateDelta',
      delta: operations,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Send messages snapshot
   */
  sendMessagesSnapshot(messages: Array<{
    id: string;
    role: 'assistant' | 'user' | 'system';
    content: string;
    timestamp: string;
  }>): void {
    const event: MessagesSnapshotEvent = {
      type: 'MessagesSnapshot',
      messages,
      timestamp: new Date().toISOString()
    };
    aguiEventEmitter.emitAGUIEvent(event);
  }

  /**
   * Get current thread and run IDs
   */
  getIds(): { threadId: string; runId: string } {
    return {
      threadId: this.threadId,
      runId: this.runId
    };
  }

  /**
   * Create a new run ID (for subsequent runs in the same thread)
   */
  newRun(): void {
    this.runId = uuidv4();
  }
}

/**
 * Helper function to create a new AG-UI stream
 */
export function createAGUIStream(threadId?: string): AGUIStream {
  return new AGUIStream(threadId);
}
