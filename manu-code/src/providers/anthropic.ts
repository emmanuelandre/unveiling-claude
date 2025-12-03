import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  ChatOptions,
  StreamChunk,
  Tool,
  ToolCall,
  ModelInfo,
  ContentBlock,
} from '../types.js';
import { BaseProvider } from './base.js';
import { ProviderError } from '../utils/errors.js';

const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', maxContextTokens: 200000, maxOutputTokens: 8192 },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', maxContextTokens: 200000, maxOutputTokens: 8192 },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', maxContextTokens: 200000, maxOutputTokens: 8192 },
];

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey?: string, baseUrl?: string) {
    super();
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new ProviderError('ANTHROPIC_API_KEY is not set', 'anthropic');
    }
    this.client = new Anthropic({
      apiKey: key,
      baseURL: baseUrl || process.env.ANTHROPIC_BASE_URL,
    });
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || 8192;

    // Separate system message from conversation
    const systemPrompt = options.systemPrompt || this.extractSystemPrompt(messages);
    const conversationMessages = this.convertMessages(messages.filter((m) => m.role !== 'system'));

    try {
      const streamOptions: Anthropic.MessageCreateParams = {
        model,
        max_tokens: maxTokens,
        messages: conversationMessages,
        stream: true,
      };

      if (systemPrompt) {
        streamOptions.system = systemPrompt;
      }

      if (options.tools && options.tools.length > 0) {
        streamOptions.tools = this.formatTools(options.tools) as Anthropic.Tool[];
      }

      if (options.temperature !== undefined) {
        streamOptions.temperature = options.temperature;
      }

      const stream = this.client.messages.stream(streamOptions);

      let currentToolCall: Partial<ToolCall> | null = null;
      let toolCallInputJson = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            currentToolCall = {
              id: block.id,
              name: block.name,
            };
            toolCallInputJson = '';
            yield {
              type: 'tool_call_start',
              toolCallId: block.id,
              toolCallName: block.name,
            };
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            yield { type: 'text', text: delta.text };
          } else if (delta.type === 'input_json_delta') {
            toolCallInputJson += delta.partial_json;
            yield {
              type: 'tool_call_delta',
              toolCallInput: delta.partial_json,
            };
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolCall) {
            try {
              currentToolCall.input = JSON.parse(toolCallInputJson || '{}');
            } catch {
              currentToolCall.input = {};
            }
            yield {
              type: 'tool_call',
              toolCall: currentToolCall as ToolCall,
            };
            currentToolCall = null;
            toolCallInputJson = '';
          }
        } else if (event.type === 'message_delta') {
          if (event.usage) {
            yield {
              type: 'done',
              usage: {
                inputTokens: 0, // Will be updated from final message
                outputTokens: event.usage.output_tokens,
                totalTokens: event.usage.output_tokens,
              },
            };
          }
        }
      }

      // Get final message for complete usage
      const finalMessage = await stream.finalMessage();
      yield {
        type: 'done',
        usage: {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
        },
      };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  formatTools(tools: Tool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters.properties || {},
        required: tool.parameters.required || [],
      },
    }));
  }

  parseToolCalls(response: unknown): ToolCall[] {
    // For Anthropic, tool calls are parsed during streaming
    return [];
  }

  getModels(): ModelInfo[] {
    return ANTHROPIC_MODELS;
  }

  getDefaultModel(): string {
    return 'claude-sonnet-4-20250514';
  }

  getMaxContextTokens(model: string): number {
    const modelInfo = ANTHROPIC_MODELS.find((m) => m.id === model);
    return modelInfo?.maxContextTokens || 200000;
  }

  private extractSystemPrompt(messages: Message[]): string | undefined {
    const systemMessage = messages.find((m) => m.role === 'system');
    if (systemMessage) {
      return typeof systemMessage.content === 'string'
        ? systemMessage.content
        : systemMessage.content
            .filter((b): b is ContentBlock & { text: string } => b.type === 'text' && !!b.text)
            .map((b) => b.text)
            .join('\n');
    }
    return undefined;
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool') {
        // Tool results need to be associated with the previous assistant message
        if (msg.toolResults) {
          result.push({
            role: 'user',
            content: msg.toolResults.map((tr) => ({
              type: 'tool_result' as const,
              tool_use_id: tr.id,
              content: tr.output,
              is_error: tr.isError,
            })),
          });
        }
        continue;
      }

      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const content: Anthropic.ContentBlock[] = [];

        // Add text content if present
        if (typeof msg.content === 'string' && msg.content) {
          content.push({ type: 'text', text: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              content.push({ type: 'text', text: block.text });
            }
          }
        }

        // Add tool use blocks
        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.input,
          });
        }

        result.push({ role: 'assistant', content });
        continue;
      }

      // Regular message
      const content = typeof msg.content === 'string' ? msg.content : this.convertContent(msg.content);

      result.push({
        role: msg.role as 'user' | 'assistant',
        content,
      });
    }

    return result;
  }

  private convertContent(blocks: ContentBlock[]): Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> {
    return blocks.map((block) => {
      if (block.type === 'text' && block.text) {
        return { type: 'text' as const, text: block.text };
      }
      if (block.type === 'image' && block.image) {
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: block.image.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: block.image.base64,
          },
        };
      }
      return { type: 'text' as const, text: '' };
    });
  }
}
