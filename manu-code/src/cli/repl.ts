import * as readline from 'readline';
import type { Config, Message, ToolCall, StreamChunk, LLMProvider } from '../types.js';
import { theme } from '../utils/colors.js';
import { getConversationHistory } from '../session/history.js';
import { checkPermission } from '../permissions/index.js';
import { getAllTools, executeTool } from '../tools/index.js';
import { estimateCost, type TokenUsage } from '../utils/tokens.js';
import {
  displayPrompt,
  displayAssistantPrefix,
  streamText,
  displayToolCall,
  displayToolResult,
  displayStats,
  startSpinner,
  stopSpinner,
  newLine,
} from './display.js';
import { handleCommand, isCommand, type CommandContext } from './commands.js';

export interface REPLOptions {
  config: Config;
  provider: LLMProvider;
  systemPrompt?: string;
}

export async function startREPL(options: REPLOptions): Promise<void> {
  const { config, provider, systemPrompt } = options;
  const history = getConversationHistory();

  // Add system prompt if provided
  if (systemPrompt) {
    history.addSystemMessage(systemPrompt);
  }

  // Initialize tracking
  let totalTokens = 0;
  let totalCost = 0;
  let sessionId: string | undefined;
  let isRunning = true;

  // Create command context
  const commandContext: CommandContext = {
    config,
    sessionId,
    totalTokens,
    totalCost,
    onExit: () => {
      isRunning = false;
    },
  };

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log('\n');
    isRunning = false;
    rl.close();
  });

  // Main REPL loop
  while (isRunning) {
    try {
      const input = await askQuestion(rl);

      if (!input.trim()) {
        continue;
      }

      // Check for commands
      if (isCommand(input)) {
        const result = await handleCommand(input, commandContext);
        if (result.shouldExit) {
          break;
        }
        continue;
      }

      // Process user message
      await processUserMessage(input, provider, config, {
        onTokenUsage: (usage) => {
          totalTokens += usage.totalTokens;
          const model = config.provider[provider.name]?.model || provider.getDefaultModel();
          totalCost += estimateCost(usage, model);
          commandContext.totalTokens = totalTokens;
          commandContext.totalCost = totalCost;
        },
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
        break;
      }
      console.error(theme.error(`Error: ${error}`));
    }
  }

  rl.close();
}

function askQuestion(rl: readline.Interface): Promise<string> {
  return new Promise((resolve) => {
    displayPrompt();
    rl.once('line', (line) => {
      resolve(line);
    });
  });
}

interface ProcessOptions {
  onTokenUsage?: (usage: TokenUsage) => void;
}

async function processUserMessage(
  input: string,
  provider: LLMProvider,
  config: Config,
  options: ProcessOptions
): Promise<void> {
  const history = getConversationHistory();
  history.addUserMessage(input);

  const tools = getAllTools();
  const toolContext = {
    cwd: process.cwd(),
    projectRoot: process.cwd(),
    config,
  };

  let continueLoop = true;

  while (continueLoop) {
    const messages = history.getMessages();

    // Start spinner while waiting for response
    const spinner = startSpinner('Thinking...');

    try {
      const response = provider.chat(messages, {
        model: config.provider[provider.name]?.model,
        maxTokens: config.provider[provider.name]?.maxTokens,
        tools,
        systemPrompt: getSystemPrompt(),
      });

      let assistantContent = '';
      const toolCalls: ToolCall[] = [];
      let currentToolCall: Partial<ToolCall> | null = null;
      let toolCallInput = '';
      let hasStartedStreaming = false;

      for await (const chunk of response) {
        if (chunk.type === 'text' && chunk.text) {
          if (!hasStartedStreaming) {
            stopSpinner(true);
            displayAssistantPrefix();
            hasStartedStreaming = true;
          }
          streamText(chunk.text);
          assistantContent += chunk.text;
        } else if (chunk.type === 'tool_call_start') {
          if (!hasStartedStreaming) {
            stopSpinner(true);
            hasStartedStreaming = true;
          }
          currentToolCall = {
            id: chunk.toolCallId,
            name: chunk.toolCallName,
          };
          toolCallInput = '';
        } else if (chunk.type === 'tool_call_delta' && chunk.toolCallInput) {
          toolCallInput += chunk.toolCallInput;
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          toolCalls.push(chunk.toolCall);
        } else if (chunk.type === 'done' && chunk.usage) {
          options.onTokenUsage?.(chunk.usage);
          if (config.ui.showTokenUsage) {
            const model = config.provider[provider.name]?.model || provider.getDefaultModel();
            displayStats(chunk.usage, model, config.ui.showCostEstimate);
          }
        } else if (chunk.type === 'error') {
          stopSpinner(false, chunk.error?.message);
          throw chunk.error;
        }

        // Handle completed tool call from delta
        if (currentToolCall && toolCallInput && chunk.type !== 'tool_call_delta') {
          try {
            currentToolCall.input = JSON.parse(toolCallInput);
            toolCalls.push(currentToolCall as ToolCall);
          } catch {
            // Invalid JSON
          }
          currentToolCall = null;
          toolCallInput = '';
        }
      }

      // Stop spinner if still running
      if (!hasStartedStreaming) {
        stopSpinner(true);
      }

      // Add assistant message to history
      history.addAssistantMessage(assistantContent, toolCalls.length > 0 ? toolCalls : undefined);

      // Handle tool calls
      if (toolCalls.length > 0) {
        const toolResults: Array<{ id: string; output: string; isError?: boolean }> = [];

        for (const toolCall of toolCalls) {
          newLine();
          displayToolCall(toolCall.name, toolCall.input);

          // Check permission
          const permission = await checkPermission(toolCall, config);

          if (permission.approved) {
            try {
              const result = await executeTool(toolCall.name, toolCall.input, toolContext);
              displayToolResult(result.success, result.output || result.error || '');
              toolResults.push({
                id: toolCall.id,
                output: result.success ? (result.output || 'Success') : (result.error || 'Failed'),
                isError: !result.success,
              });
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              displayToolResult(false, errorMsg);
              toolResults.push({
                id: toolCall.id,
                output: errorMsg,
                isError: true,
              });
            }
          } else {
            displayToolResult(false, 'Tool execution skipped by user');
            toolResults.push({
              id: toolCall.id,
              output: 'Tool execution skipped by user',
              isError: true,
            });
          }
        }

        // Add tool results to history
        history.addToolResults(toolResults);
      } else {
        continueLoop = false;
      }

      newLine();
    } catch (error) {
      stopSpinner(false);
      console.error(theme.error(`Error: ${error}`));
      continueLoop = false;
    }
  }
}

function getSystemPrompt(): string {
  return `You are Manu Code, an AI-powered coding assistant. You help developers write, edit, and manage code through natural language conversations.

You have access to the following tools:
- read_file: Read file contents
- write_file: Create or overwrite files
- edit_file: Make targeted edits to files
- list_directory: List files and directories
- search_files: Search for files by glob pattern
- search_content: Search file contents (grep)
- run_command: Execute shell commands
- fetch_url: Fetch web content
- git_status: Get git repository status
- git_diff: Show git diff
- git_log: Show git commit history
- git_branch: List git branches

Guidelines:
1. Always read files before editing them
2. Use search tools to understand the codebase before making changes
3. Explain what you're doing and why
4. Be concise but thorough
5. Ask for clarification if the request is ambiguous
6. Prefer making targeted edits over rewriting entire files

Current working directory: ${process.cwd()}`;
}
