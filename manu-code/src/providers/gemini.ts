import { GoogleGenerativeAI, SchemaType, type GenerativeModel, type Content, type Part, type FunctionDeclaration } from '@google/generative-ai';
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

const GEMINI_MODELS: ModelInfo[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', maxContextTokens: 1048576, maxOutputTokens: 8192 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', maxContextTokens: 2097152, maxOutputTokens: 8192 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', maxContextTokens: 1048576, maxOutputTokens: 8192 },
];

export class GeminiProvider extends BaseProvider {
  name = 'gemini' as const;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    super();
    const key = apiKey || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new ProviderError('GOOGLE_API_KEY is not set', 'gemini');
    }
    this.genAI = new GoogleGenerativeAI(key);
  }

  async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
    const modelId = options.model || this.getDefaultModel();

    const model = this.genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 8192,
        temperature: options.temperature,
      },
    });

    const { history, currentMessage, systemInstruction } = this.convertMessages(
      messages,
      options.systemPrompt
    );

    try {
      const chatOptions: Parameters<GenerativeModel['startChat']>[0] = {
        history,
      };

      if (systemInstruction) {
        chatOptions.systemInstruction = systemInstruction;
      }

      if (options.tools && options.tools.length > 0) {
        chatOptions.tools = [{ functionDeclarations: this.formatTools(options.tools) }];
      }

      const chat = model.startChat(chatOptions);

      const result = await chat.sendMessageStream(currentMessage);

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield { type: 'text', text };
        }

        // Check for function calls
        const functionCalls = chunk.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          for (const fc of functionCalls) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: fc.name,
                input: fc.args as Record<string, unknown>,
              },
            };
          }
        }

        // Update token counts if available
        if (chunk.usageMetadata) {
          inputTokens = chunk.usageMetadata.promptTokenCount || 0;
          outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
        }
      }

      // Get final usage
      const response = await result.response;
      if (response.usageMetadata) {
        inputTokens = response.usageMetadata.promptTokenCount || inputTokens;
        outputTokens = response.usageMetadata.candidatesTokenCount || outputTokens;
      }

      yield {
        type: 'done',
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  formatTools(tools: Tool[]): FunctionDeclaration[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: this.convertProperties(tool.parameters.properties || {}),
        required: tool.parameters.required || [],
      },
    }));
  }

  private convertProperties(properties: Record<string, unknown>): Record<string, { type: SchemaType; description?: string }> {
    const result: Record<string, { type: SchemaType; description?: string }> = {};
    for (const [key, value] of Object.entries(properties)) {
      const prop = value as { type?: string; description?: string };
      let schemaType = SchemaType.STRING;
      if (prop.type === 'number' || prop.type === 'integer') {
        schemaType = SchemaType.NUMBER;
      } else if (prop.type === 'boolean') {
        schemaType = SchemaType.BOOLEAN;
      } else if (prop.type === 'array') {
        schemaType = SchemaType.ARRAY;
      } else if (prop.type === 'object') {
        schemaType = SchemaType.OBJECT;
      }
      result[key] = {
        type: schemaType,
        description: prop.description,
      };
    }
    return result;
  }

  parseToolCalls(response: unknown): ToolCall[] {
    // For Gemini, tool calls are parsed during streaming
    return [];
  }

  getModels(): ModelInfo[] {
    return GEMINI_MODELS;
  }

  getDefaultModel(): string {
    return 'gemini-2.0-flash';
  }

  getMaxContextTokens(model: string): number {
    const modelInfo = GEMINI_MODELS.find((m) => m.id === model);
    return modelInfo?.maxContextTokens || 1048576;
  }

  private convertMessages(
    messages: Message[],
    systemPrompt?: string
  ): {
    history: Content[];
    currentMessage: string | Part[];
    systemInstruction?: string;
  } {
    const history: Content[] = [];
    let systemInstruction = systemPrompt;

    // Process all messages except the last user message
    const allMessages = [...messages];
    let lastUserMessage: Message | undefined;

    // Find the last user message
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].role === 'user') {
        lastUserMessage = allMessages[i];
        allMessages.splice(i, 1);
        break;
      }
    }

    for (const msg of allMessages) {
      if (msg.role === 'system') {
        const content =
          typeof msg.content === 'string' ? msg.content : this.contentToString(msg.content);
        systemInstruction = systemInstruction ? `${systemInstruction}\n${content}` : content;
        continue;
      }

      if (msg.role === 'tool') {
        // Tool results in Gemini are part of the function response
        if (msg.toolResults) {
          history.push({
            role: 'function',
            parts: msg.toolResults.map((tr) => ({
              functionResponse: {
                name: tr.id.split('-')[0], // Extract tool name from ID
                response: { result: tr.output },
              },
            })),
          });
        }
        continue;
      }

      if (msg.role === 'assistant') {
        const parts: Part[] = [];

        // Add text content
        if (typeof msg.content === 'string' && msg.content) {
          parts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text' && block.text) {
              parts.push({ text: block.text });
            }
          }
        }

        // Add function calls
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.input,
              },
            });
          }
        }

        if (parts.length > 0) {
          history.push({ role: 'model', parts });
        }
        continue;
      }

      if (msg.role === 'user') {
        history.push({
          role: 'user',
          parts: this.convertContentToParts(msg.content),
        });
      }
    }

    // Convert the last user message
    const currentMessage = lastUserMessage
      ? this.convertContentToParts(lastUserMessage.content)
      : [{ text: '' }];

    // Ensure currentMessage is never undefined
    let finalCurrentMessage: string | Part[];
    if (currentMessage.length === 1 && 'text' in currentMessage[0] && currentMessage[0].text) {
      finalCurrentMessage = currentMessage[0].text;
    } else if (currentMessage.length > 0) {
      finalCurrentMessage = currentMessage;
    } else {
      finalCurrentMessage = '';
    }

    return {
      history,
      currentMessage: finalCurrentMessage,
      systemInstruction,
    };
  }

  private convertContentToParts(content: string | ContentBlock[]): Part[] {
    if (typeof content === 'string') {
      return [{ text: content }];
    }

    return content.map((block) => {
      if (block.type === 'text' && block.text) {
        return { text: block.text };
      }
      if (block.type === 'image' && block.image) {
        return {
          inlineData: {
            mimeType: block.image.mediaType,
            data: block.image.base64,
          },
        };
      }
      return { text: '' };
    });
  }

  private contentToString(content: ContentBlock[]): string {
    return content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text!)
      .join('\n');
  }
}
