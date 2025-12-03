import chalk from 'chalk';
import type { Config, ProviderName } from '../types.js';
import { theme } from '../utils/colors.js';
import { getConversationHistory } from '../session/history.js';
import {
  listSessions,
  loadSession,
  formatSessionSummary,
  saveSession,
  restoreHistory,
} from '../session/persistence.js';
import { getCurrentProvider, getProvider, setCurrentProvider, getAvailableProviders } from '../providers/index.js';
import { updateConfig, getConfig } from '../config/index.js';
import { displaySessionStats, clearScreen } from './display.js';
import { formatTokenCount, formatCost } from '../utils/tokens.js';

export interface CommandContext {
  config: Config;
  sessionId?: string;
  totalTokens: number;
  totalCost: number;
  onExit: () => void;
}

export type CommandResult = {
  handled: boolean;
  shouldExit?: boolean;
  message?: string;
};

const HELP_TEXT = `
${chalk.bold('Manu Code Commands')}
${chalk.gray('━'.repeat(50))}

${chalk.cyan('/help')}          Show this help message
${chalk.cyan('/clear')}         Clear conversation history
${chalk.cyan('/config')}        Show current configuration
${chalk.cyan('/model [name]')}  Show or switch model
${chalk.cyan('/provider [name]')} Show or switch provider
${chalk.cyan('/session')}       Session management
${chalk.cyan('/history')}       Show conversation history
${chalk.cyan('/undo')}          Undo last message
${chalk.cyan('/cost')}          Show session cost
${chalk.cyan('/compact')}       Compact conversation context
${chalk.cyan('/exit')}          Exit manu code

${chalk.gray('━'.repeat(50))}
${chalk.dim('Tip: You can also use Ctrl+C to exit')}
`;

export async function handleCommand(
  input: string,
  context: CommandContext
): Promise<CommandResult> {
  const trimmed = input.trim();

  if (!trimmed.startsWith('/')) {
    return { handled: false };
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case 'help':
    case 'h':
    case '?':
      console.log(HELP_TEXT);
      return { handled: true };

    case 'clear':
      return handleClear(context);

    case 'config':
      return handleConfig(context);

    case 'model':
      return handleModel(args, context);

    case 'provider':
      return handleProvider(args, context);

    case 'session':
      return await handleSession(args, context);

    case 'history':
      return handleHistory();

    case 'undo':
      return handleUndo();

    case 'cost':
      return handleCost(context);

    case 'compact':
      return handleCompact();

    case 'exit':
    case 'quit':
    case 'q':
      return { handled: true, shouldExit: true };

    default:
      console.log(theme.warning(`Unknown command: /${command}`));
      console.log(theme.dim('Type /help for available commands'));
      return { handled: true };
  }
}

function handleClear(context: CommandContext): CommandResult {
  const history = getConversationHistory();
  history.clear();
  clearScreen();
  console.log(theme.success('Conversation cleared'));
  return { handled: true };
}

function handleConfig(context: CommandContext): CommandResult {
  const config = context.config;

  console.log('');
  console.log(chalk.bold('Current Configuration'));
  console.log(chalk.gray('━'.repeat(40)));
  console.log('');
  console.log(chalk.cyan('Provider:'));
  console.log(`  Default: ${config.provider.default}`);
  console.log(`  Model: ${config.provider[config.provider.default]?.model || 'default'}`);
  console.log('');
  console.log(chalk.cyan('Permissions:'));
  console.log(`  YOLO Mode: ${config.permissions.yoloMode ? chalk.red('ON') : chalk.green('OFF')}`);
  console.log(`  Auto-approve reads: ${config.permissions.autoApproveReads}`);
  console.log('');
  console.log(chalk.cyan('UI:'));
  console.log(`  Theme: ${config.ui.theme}`);
  console.log(`  Show tokens: ${config.ui.showTokenUsage}`);
  console.log(`  Show cost: ${config.ui.showCostEstimate}`);
  console.log(`  Streaming: ${config.ui.streamOutput}`);
  console.log('');

  return { handled: true };
}

function handleModel(args: string[], context: CommandContext): CommandResult {
  const provider = getCurrentProvider();

  if (!provider) {
    console.log(theme.error('No provider selected'));
    return { handled: true };
  }

  if (args.length === 0) {
    // Show current model and available models
    const models = provider.getModels();
    const currentModel = context.config.provider[provider.name]?.model || provider.getDefaultModel();

    console.log('');
    console.log(chalk.bold(`Current model: ${theme.primary(currentModel)}`));
    console.log('');
    console.log(chalk.bold('Available models:'));
    for (const model of models) {
      const isCurrent = model.id === currentModel;
      const prefix = isCurrent ? chalk.green('● ') : '  ';
      console.log(`${prefix}${model.id} - ${model.name}`);
      console.log(
        `    Context: ${formatTokenCount(model.maxContextTokens)}, Output: ${formatTokenCount(model.maxOutputTokens)}`
      );
    }
    console.log('');
  } else {
    // Switch model
    const newModel = args[0];
    const models = provider.getModels();
    const modelExists = models.some((m) => m.id === newModel);

    if (!modelExists) {
      console.log(theme.error(`Unknown model: ${newModel}`));
      console.log(theme.dim('Use /model to see available models'));
      return { handled: true };
    }

    const providerConfig = { ...context.config.provider };
    providerConfig[provider.name] = {
      ...providerConfig[provider.name],
      model: newModel,
    };

    updateConfig({ provider: providerConfig });
    console.log(theme.success(`Switched to model: ${newModel}`));
  }

  return { handled: true };
}

function handleProvider(args: string[], context: CommandContext): CommandResult {
  if (args.length === 0) {
    // Show current provider and available providers
    const current = getCurrentProvider();
    const available = getAvailableProviders();

    console.log('');
    console.log(chalk.bold(`Current provider: ${theme.primary(current?.name || 'none')}`));
    console.log('');
    console.log(chalk.bold('Available providers:'));
    for (const provider of ['anthropic', 'openai', 'gemini'] as ProviderName[]) {
      const isAvailable = available.includes(provider);
      const isCurrent = current?.name === provider;
      const prefix = isCurrent ? chalk.green('● ') : isAvailable ? '  ' : chalk.red('✗ ');
      const status = !isAvailable ? chalk.dim(' (no API key)') : '';
      console.log(`${prefix}${provider}${status}`);
    }
    console.log('');
  } else {
    // Switch provider
    const newProvider = args[0].toLowerCase() as ProviderName;
    const available = getAvailableProviders();

    if (!['anthropic', 'openai', 'gemini'].includes(newProvider)) {
      console.log(theme.error(`Unknown provider: ${newProvider}`));
      return { handled: true };
    }

    if (!available.includes(newProvider)) {
      console.log(theme.error(`Provider ${newProvider} is not available (API key not set)`));
      return { handled: true };
    }

    try {
      const provider = getProvider(newProvider, context.config);
      setCurrentProvider(provider);
      updateConfig({
        provider: {
          ...context.config.provider,
          default: newProvider,
        },
      });
      console.log(theme.success(`Switched to provider: ${newProvider}`));
    } catch (error) {
      console.log(theme.error(`Failed to switch provider: ${error}`));
    }
  }

  return { handled: true };
}

async function handleSession(args: string[], context: CommandContext): Promise<CommandResult> {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'list':
    case 'ls':
      const sessions = await listSessions(10);
      if (sessions.length === 0) {
        console.log(theme.dim('No saved sessions'));
      } else {
        console.log('');
        console.log(chalk.bold('Recent Sessions:'));
        for (const session of sessions) {
          console.log('  ' + formatSessionSummary(session));
        }
        console.log('');
      }
      break;

    case 'load':
      if (args.length < 2) {
        console.log(theme.error('Usage: /session load <session-id>'));
        return { handled: true };
      }
      const sessionToLoad = await loadSession(args[1]);
      if (!sessionToLoad) {
        console.log(theme.error(`Session not found: ${args[1]}`));
      } else {
        const history = getConversationHistory();
        restoreHistory(sessionToLoad, history);
        console.log(theme.success(`Loaded session: ${args[1]}`));
      }
      break;

    case 'save':
      const provider = getCurrentProvider();
      if (provider) {
        const history = getConversationHistory();
        const model = context.config.provider[provider.name]?.model || provider.getDefaultModel();
        const id = await saveSession(
          history,
          provider.name,
          model,
          context.totalTokens,
          context.totalCost,
          context.sessionId
        );
        console.log(theme.success(`Session saved: ${id}`));
      }
      break;

    default:
      console.log('');
      console.log(chalk.bold('Session Commands:'));
      console.log('  /session list     - List saved sessions');
      console.log('  /session load <id> - Load a session');
      console.log('  /session save     - Save current session');
      console.log('');
  }

  return { handled: true };
}

function handleHistory(): CommandResult {
  const history = getConversationHistory();
  const messages = history.getMessages();

  if (messages.length === 0) {
    console.log(theme.dim('No conversation history'));
    return { handled: true };
  }

  console.log('');
  console.log(chalk.bold('Conversation History:'));
  console.log(chalk.gray('━'.repeat(50)));

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleColor = msg.role === 'user' ? chalk.blue : msg.role === 'assistant' ? chalk.green : chalk.yellow;
    const content = typeof msg.content === 'string' ? msg.content : '[complex content]';
    const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '');

    console.log('');
    console.log(roleColor(`[${msg.role}]`));
    console.log(preview);

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      console.log(theme.dim(`  (${msg.toolCalls.length} tool call(s))`));
    }
  }

  console.log('');
  return { handled: true };
}

function handleUndo(): CommandResult {
  const history = getConversationHistory();
  const success = history.undoLast();

  if (success) {
    console.log(theme.success('Undid last message'));
  } else {
    console.log(theme.warning('Nothing to undo'));
  }

  return { handled: true };
}

function handleCost(context: CommandContext): CommandResult {
  const history = getConversationHistory();
  const messageCount = history.getMessageCount();

  displaySessionStats(context.totalTokens, context.totalCost, messageCount);
  return { handled: true };
}

function handleCompact(): CommandResult {
  console.log(theme.warning('Compact feature not yet implemented'));
  console.log(theme.dim('This will summarize older messages to save context space'));
  return { handled: true };
}

export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}
