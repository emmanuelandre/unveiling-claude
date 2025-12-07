import type {
  LLMProvider,
  Message,
  ChatOptions,
  StreamChunk,
  Tool,
  ToolCall,
  ModelInfo,
  ProviderName,
} from '../types.js';

export abstract class BaseProvider implements LLMProvider {
  abstract name: ProviderName;

  abstract chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk>;

  supportsTools(): boolean {
    return true;
  }

  abstract formatTools(tools: Tool[]): unknown;
  abstract parseToolCalls(response: unknown): ToolCall[];
  abstract getModels(): ModelInfo[];
  abstract getDefaultModel(): string;
  abstract getMaxContextTokens(model: string): number;

  protected normalizeMessages(messages: Message[]): Message[] {
    return messages.map((msg) => ({
      ...msg,
      content: typeof msg.content === 'string' ? msg.content : msg.content,
    }));
  }
}
