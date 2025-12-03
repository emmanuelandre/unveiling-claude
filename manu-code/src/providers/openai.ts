import OpenAI from 'openai';
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

const OPENAI_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', maxContextTokens: 128000, maxOutputTokens: 16384 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxContextTokens: 128000, maxOutputTokens: 16384 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxContextTokens: 128000, maxOutputTokens: 4096 },
  { id: 'o1', name: 'O1', maxContextTokens: 200000, maxOutputTokens: 100000 },
  { id: 'o1-mini', name: 'O1 Mini', maxContextTokens: 128000, maxOutputTokens: 65536 },
];

export class OpenAIProvider extends BaseProvider {
  name = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey?: string, baseUrl?: string) {
    super();
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new ProviderError('OPENAI_API_KEY is not set', 'openai');
    }
    this.client = new OpenAI({
      apiKey: key,
      baseURL: baseUrl || process.env.OPENAI_BASE_URL,
    });
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const model = options.model || this.getDefaultModel();
    const maxTokens = options.maxTokens || 8192;

    const openaiMessages = this.convertMessages(messages, options.systemPrompt);

    try {
      const streamOptions: OpenAI.ChatCompletionCreateParamsStreaming = {
        model,
        max_tokens: maxTokens,
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
      };

      if (options.tools && options.tools.length > 0) {
        streamOptions.tools = this.formatTools(options.tools) as OpenAI.ChatCompletionTool[];
      }

      if (options.temperature !== undefined) {
        streamOptions.temperature = options.temperature;
      }

      const stream = await this.client.chat.completions.create(streamOptions);

      const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          yield { type: 'text', text: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCalls.get(tc.index) || { id: '', name: '', arguments: '' };

            if (tc.id) {
              existing.id = tc.id;
              yield {
                type: 'tool_call_start',
                toolCallId: tc.id,
                toolCallName: tc.function?.name || '',
              };
            }
            if (tc.function?.name) {
              existing.name = tc.function.name;
            }
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
              yield {
                type: 'tool_call_delta',
                toolCallInput: tc.function.arguments,
              };
            }

            toolCalls.set(tc.index, existing);
          }
        }

        // Check for finish reason
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
          // Emit completed tool calls
          for (const tc of toolCalls.values()) {
            let input: Record<string, unknown> = {};
            try {
              input = JSON.parse(tc.arguments || '{}');
            } catch {
              // Invalid JSON, use empty object
            }
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id,
                name: tc.name,
                input,
              },
            };
          }
        }

        // Usage info
        if (chunk.usage) {
          yield {
            type: 'done',
            usage: {
              inputTokens: chunk.usage.prompt_tokens,
              outputTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            },
          };
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  formatTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties || {},
          required: tool.parameters.required || [],
        },
      },
    }));
  }

  parseToolCalls(response: unknown): ToolCall[] {
    // For OpenAI, tool calls are parsed during streaming
    return [];
  }

  getModels(): ModelInfo[] {
    return OPENAI_MODELS;
  }

  getDefaultModel(): string {
    return 'gpt-4o';
  }

  getMaxContextTokens(model: string): number {
    const modelInfo = OPENAI_MODELS.find((m) => m.id === model);
    return modelInfo?.maxContextTokens || 128000;
  }

  private convertMessages(
    messages: Message[],
    systemPrompt?: string
  ): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        result.push({
          role: 'system',
          content: typeof msg.content === 'string' ? msg.content : this.contentToString(msg.content),
        });
        continue;
      }

      if (msg.role === 'tool') {
        if (msg.toolResults) {
          for (const tr of msg.toolResults) {
            result.push({
              role: 'tool',
              tool_call_id: tr.id,
              content: tr.output,
            });
          }
        }
        continue;
      }

      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const content = typeof msg.content === 'string' ? msg.content : this.contentToString(msg.content);
        result.push({
          role: 'assistant',
          content: content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.input),
            },
          })),
        });
        continue;
      }

      if (msg.role === 'user') {
        const content = this.convertUserContent(msg.content);
        result.push({ role: 'user', content });
        continue;
      }

      if (msg.role === 'assistant') {
        result.push({
          role: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : this.contentToString(msg.content),
        });
      }
    }

    return result;
  }

  private convertUserContent(
    content: string | ContentBlock[]
  ): string | OpenAI.ChatCompletionContentPart[] {
    if (typeof content === 'string') {
      return content;
    }

    return content.map((block) => {
      if (block.type === 'text' && block.text) {
        return { type: 'text' as const, text: block.text };
      }
      if (block.type === 'image' && block.image) {
        return {
          type: 'image_url' as const,
          image_url: {
            url: `data:${block.image.mediaType};base64,${block.image.base64}`,
          },
        };
      }
      return { type: 'text' as const, text: '' };
    });
  }

  private contentToString(content: ContentBlock[]): string {
    return content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text!)
      .join('\n');
  }
}
