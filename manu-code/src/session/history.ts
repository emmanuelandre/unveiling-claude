import type { Message, ToolCall, ToolResult } from '../types.js';

export class ConversationHistory {
  private messages: Message[] = [];
  private maxMessages: number;

  constructor(maxMessages = 100) {
    this.maxMessages = maxMessages;
  }

  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
    });
    this.trim();
  }

  addAssistantMessage(content: string, toolCalls?: ToolCall[]): void {
    this.messages.push({
      role: 'assistant',
      content,
      toolCalls,
    });
    this.trim();
  }

  addToolResults(results: ToolResult[]): void {
    this.messages.push({
      role: 'tool',
      content: '',
      toolResults: results,
    });
    this.trim();
  }

  addSystemMessage(content: string): void {
    // System messages go at the beginning
    this.messages.unshift({
      role: 'system',
      content,
    });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getLastMessage(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  clear(): void {
    // Keep system messages
    this.messages = this.messages.filter((m) => m.role === 'system');
  }

  // Compact the history by summarizing older messages
  compact(summary: string): void {
    const systemMessages = this.messages.filter((m) => m.role === 'system');
    const recentMessages = this.messages.slice(-10);

    this.messages = [
      ...systemMessages,
      {
        role: 'assistant',
        content: `[Previous conversation summary: ${summary}]`,
      },
      ...recentMessages,
    ];
  }

  undoLast(): boolean {
    if (this.messages.length === 0) return false;

    const last = this.messages[this.messages.length - 1];
    if (last.role === 'system') return false;

    this.messages.pop();

    // Also remove the preceding user message if we removed assistant response
    if (last.role === 'assistant' || last.role === 'tool') {
      const newLast = this.messages[this.messages.length - 1];
      if (newLast && newLast.role === 'user') {
        this.messages.pop();
      }
    }

    return true;
  }

  toJSON(): Message[] {
    return this.messages;
  }

  fromJSON(messages: Message[]): void {
    this.messages = messages;
    this.trim();
  }

  private trim(): void {
    // Keep system messages and last N messages
    const systemMessages = this.messages.filter((m) => m.role === 'system');
    const otherMessages = this.messages.filter((m) => m.role !== 'system');

    if (otherMessages.length > this.maxMessages) {
      const trimmed = otherMessages.slice(-this.maxMessages);
      this.messages = [...systemMessages, ...trimmed];
    }
  }
}

// Singleton instance
let instance: ConversationHistory | null = null;

export function getConversationHistory(): ConversationHistory {
  if (!instance) {
    instance = new ConversationHistory();
  }
  return instance;
}

export function resetConversationHistory(): void {
  if (instance) {
    instance.clear();
  }
}
