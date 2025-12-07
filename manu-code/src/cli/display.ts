import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { theme } from '../utils/colors.js';
import { formatTokenCount, formatCost, type TokenUsage } from '../utils/tokens.js';

let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }
  currentSpinner = ora({
    text,
    color: 'cyan',
    spinner: 'dots',
  }).start();
  return currentSpinner;
}

export function stopSpinner(success = true, text?: string): void {
  if (currentSpinner) {
    if (success) {
      currentSpinner.succeed(text);
    } else {
      currentSpinner.fail(text);
    }
    currentSpinner = null;
  }
}

export function updateSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.text = text;
  }
}

export function streamText(text: string): void {
  // Stop any spinner before streaming
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
  process.stdout.write(text);
}

export function displayToolCall(toolName: string, params: Record<string, unknown>): void {
  console.log('');
  console.log(theme.dim('┌─ ') + theme.secondary('Tool: ') + theme.primary(toolName));

  // Show relevant params
  const displayParams = formatParams(toolName, params);
  for (const [key, value] of Object.entries(displayParams)) {
    console.log(theme.dim('│  ') + theme.dim(`${key}: `) + String(value));
  }
}

export function displayToolResult(success: boolean, output: string, truncate = true): void {
  const maxLength = 500;
  let displayOutput = output;

  if (truncate && output.length > maxLength) {
    displayOutput = output.slice(0, maxLength) + chalk.dim('\n... (truncated)');
  }

  if (success) {
    console.log(theme.dim('│'));
    console.log(theme.dim('└─ ') + theme.success('✓ Success'));
    if (displayOutput) {
      const lines = displayOutput.split('\n');
      for (const line of lines.slice(0, 10)) {
        console.log(theme.dim('   ') + line);
      }
      if (lines.length > 10) {
        console.log(theme.dim('   ... (' + (lines.length - 10) + ' more lines)'));
      }
    }
  } else {
    console.log(theme.dim('│'));
    console.log(theme.dim('└─ ') + theme.error('✗ Failed'));
    console.log(theme.dim('   ') + theme.error(displayOutput));
  }
  console.log('');
}

function formatParams(toolName: string, params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};

  switch (toolName) {
    case 'read_file':
    case 'write_file':
    case 'edit_file':
      if (params.path) result['path'] = String(params.path);
      break;
    case 'run_command':
      if (params.command) {
        const cmd = String(params.command);
        result['command'] = cmd.length > 60 ? cmd.slice(0, 60) + '...' : cmd;
      }
      break;
    case 'list_directory':
      if (params.path) result['path'] = String(params.path);
      break;
    case 'search_files':
      if (params.pattern) result['pattern'] = String(params.pattern);
      break;
    case 'search_content':
      if (params.query) result['query'] = String(params.query);
      break;
    case 'fetch_url':
      if (params.url) result['url'] = String(params.url);
      break;
    default:
      for (const [key, value] of Object.entries(params)) {
        const str = String(value);
        result[key] = str.length > 50 ? str.slice(0, 50) + '...' : str;
      }
  }

  return result;
}

export function displayStats(usage: TokenUsage, model: string, showCost: boolean): void {
  console.log('');
  console.log(theme.dim('─'.repeat(50)));
  console.log(
    theme.dim('Tokens: ') +
      `${formatTokenCount(usage.inputTokens)} in / ${formatTokenCount(usage.outputTokens)} out`
  );

  if (showCost) {
    const { estimateCost } = require('../utils/tokens.js');
    const cost = estimateCost(usage, model);
    console.log(theme.dim('Cost: ') + formatCost(cost));
  }
}

export function displaySessionStats(
  totalTokens: number,
  totalCost: number,
  messageCount: number
): void {
  console.log('');
  console.log(chalk.cyan('┌─────────────────────────────────────────┐'));
  console.log(chalk.cyan('│') + chalk.bold(' 📊 Session Stats') + '                        ' + chalk.cyan('│'));
  console.log(chalk.cyan('├─────────────────────────────────────────┤'));
  console.log(chalk.cyan('│') + ` Messages:     ${String(messageCount).padEnd(24)}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Total tokens: ${formatTokenCount(totalTokens).padEnd(24)}` + chalk.cyan('│'));
  console.log(chalk.cyan('│') + ` Total cost:   ${formatCost(totalCost).padEnd(24)}` + chalk.cyan('│'));
  console.log(chalk.cyan('└─────────────────────────────────────────┘'));
}

export function displayDivider(): void {
  console.log('');
  console.log(theme.dim('─'.repeat(60)));
  console.log('');
}

export function clearScreen(): void {
  console.clear();
}

export function displayPrompt(): void {
  process.stdout.write('\n' + theme.prompt('manu › '));
}

export function displayAssistantPrefix(): void {
  console.log('');
  console.log(theme.secondary('Assistant:'));
}

export function newLine(): void {
  console.log('');
}
