import type { TokenUsage } from './utils/tokens.js';

// Message types
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  image?: { base64: string; mediaType: string };
  toolUse?: { id: string; name: string; input: Record<string, unknown> };
  toolResult?: { id: string; output: string; isError?: boolean };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  output: string;
  isError?: boolean;
}

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

// Provider types
export type ProviderName = 'anthropic' | 'openai' | 'gemini';

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
  systemPrompt?: string;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_call_start' | 'tool_call_delta' | 'error' | 'done';
  text?: string;
  toolCall?: ToolCall;
  toolCallId?: string;
  toolCallName?: string;
  toolCallInput?: string;
  error?: Error;
  usage?: TokenUsage;
}

export interface ModelInfo {
  id: string;
  name: string;
  maxContextTokens: number;
  maxOutputTokens: number;
}

export interface LLMProvider {
  name: ProviderName;

  // Core methods
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk>;

  // Tool support
  supportsTools(): boolean;
  formatTools(tools: Tool[]): unknown;
  parseToolCalls(response: unknown): ToolCall[];

  // Model info
  getModels(): ModelInfo[];
  getDefaultModel(): string;
  getMaxContextTokens(model: string): number;
}

// Tool types
export type PermissionLevel = 'auto' | 'prompt' | 'deny';

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema & { description?: string; enum?: string[]; default?: unknown }>;
  required?: string[];
  items?: JSONSchema;
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface ToolContext {
  cwd: string;
  projectRoot: string;
  config: Config;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  artifacts?: Array<{ type: string; path?: string; content?: string }>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  permission: PermissionLevel;
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolExecutionResult>;
}

// Config types
export interface ProviderConfig {
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
}

export interface Config {
  provider: {
    default: ProviderName;
    anthropic?: ProviderConfig;
    openai?: ProviderConfig;
    gemini?: ProviderConfig;
  };
  context: {
    maxContextTokens: number;
    alwaysInclude: string[];
    ignorePatterns: string[];
  };
  permissions: {
    autoApproveReads: boolean;
    safeCommands: string[];
    yoloMode: boolean;
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    showTokenUsage: boolean;
    showCostEstimate: boolean;
    streamOutput: boolean;
  };
  history: {
    enabled: boolean;
    path: string;
    maxEntries: number;
  };
  session: {
    autoSave: boolean;
    path: string;
  };
}

// Session types
export interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  provider: ProviderName;
  model: string;
  messages: Message[];
  totalTokens: number;
  totalCost: number;
}
