"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGUIStream = void 0;
exports.createAGUIStream = createAGUIStream;
const uuid_1 = require("uuid");
const emitter_1 = require("./emitter");
class AGUIStream {
    threadId;
    runId;
    constructor(threadId) {
        this.threadId = threadId || (0, uuid_1.v4)();
        this.runId = (0, uuid_1.v4)();
    }
    startRun() {
        const event = {
            type: 'RunStarted',
            threadId: this.threadId,
            runId: this.runId,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    finishRun() {
        const event = {
            type: 'RunFinished',
            threadId: this.threadId,
            runId: this.runId,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    errorRun(message, code) {
        const event = {
            type: 'RunError',
            message,
            code,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    startStep(stepName) {
        const event = {
            type: 'StepStarted',
            stepName,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    finishStep(stepName) {
        const event = {
            type: 'StepFinished',
            stepName,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    async streamMessage(content, role = 'assistant', chunkSize = 10) {
        const messageId = (0, uuid_1.v4)();
        const startEvent = {
            type: 'TextMessageStart',
            messageId,
            role,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(startEvent);
        for (let i = 0; i < content.length; i += chunkSize) {
            const delta = content.slice(i, i + chunkSize);
            const contentEvent = {
                type: 'TextMessageContent',
                messageId,
                delta,
                timestamp: new Date().toISOString()
            };
            emitter_1.aguiEventEmitter.emitAGUIEvent(contentEvent);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        const endEvent = {
            type: 'TextMessageEnd',
            messageId,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(endEvent);
        return messageId;
    }
    async streamToolCall(toolName, args, parentMessageId, chunkSize = 20) {
        const toolCallId = (0, uuid_1.v4)();
        const argsString = JSON.stringify(args, null, 2);
        const startEvent = {
            type: 'ToolCallStart',
            toolCallId,
            toolCallName: toolName,
            parentMessageId,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(startEvent);
        for (let i = 0; i < argsString.length; i += chunkSize) {
            const delta = argsString.slice(i, i + chunkSize);
            const argsEvent = {
                type: 'ToolCallArgs',
                toolCallId,
                delta,
                timestamp: new Date().toISOString()
            };
            emitter_1.aguiEventEmitter.emitAGUIEvent(argsEvent);
            await new Promise(resolve => setTimeout(resolve, 30));
        }
        const endEvent = {
            type: 'ToolCallEnd',
            toolCallId,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(endEvent);
        return toolCallId;
    }
    sendStateSnapshot(state) {
        const event = {
            type: 'StateSnapshot',
            snapshot: state,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    sendStateDelta(operations) {
        const event = {
            type: 'StateDelta',
            delta: operations,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    sendMessagesSnapshot(messages) {
        const event = {
            type: 'MessagesSnapshot',
            messages,
            timestamp: new Date().toISOString()
        };
        emitter_1.aguiEventEmitter.emitAGUIEvent(event);
    }
    getIds() {
        return {
            threadId: this.threadId,
            runId: this.runId
        };
    }
    newRun() {
        this.runId = (0, uuid_1.v4)();
    }
}
exports.AGUIStream = AGUIStream;
function createAGUIStream(threadId) {
    return new AGUIStream(threadId);
}
//# sourceMappingURL=stream.js.map