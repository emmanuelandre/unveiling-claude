import chalk from 'chalk';
import * as readline from 'readline';
import type { ToolCall, Config } from '../types.js';
import { theme } from '../utils/colors.js';

export interface PermissionPromptResult {
  approved: boolean;
  always?: boolean;
  edited?: Record<string, unknown>;
}

export async function promptForPermission(
  toolCall: ToolCall,
  config: Config
): Promise<PermissionPromptResult> {
  const { name, input } = toolCall;

  console.log('');
  console.log(chalk.yellow('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│') + chalk.bold.yellow(' 🔐 Permission Required') + chalk.yellow('                                       │'));
  console.log(chalk.yellow('├─────────────────────────────────────────────────────────────┤'));
  console.log(chalk.yellow('│') + '                                                             ' + chalk.yellow('│'));
  console.log(chalk.yellow('│') + `  Tool:     ${theme.primary(name)}`.padEnd(60) + chalk.yellow('│'));

  // Show relevant parameters
  const displayParams = getDisplayParams(name, input);
  for (const [key, value] of Object.entries(displayParams)) {
    const valueStr = String(value);
    const truncated = valueStr.length > 40 ? valueStr.slice(0, 40) + '...' : valueStr;
    console.log(chalk.yellow('│') + `  ${key}:`.padEnd(10) + ` ${truncated}`.padEnd(49) + chalk.yellow('│'));
  }

  // Show preview for write/edit operations
  if (name === 'write_file' && input.content) {
    const content = input.content as string;
    const lines = content.split('\n').slice(0, 5);
    console.log(chalk.yellow('│') + '                                                             ' + chalk.yellow('│'));
    console.log(chalk.yellow('│') + '  Preview:                                                   ' + chalk.yellow('│'));
    console.log(chalk.yellow('│') + chalk.gray('  ┌────────────────────────────────────────────────────────┐ ') + chalk.yellow('│'));
    for (const line of lines) {
      const truncatedLine = line.slice(0, 54);
      console.log(chalk.yellow('│') + chalk.gray('  │ ') + theme.code(truncatedLine.padEnd(54)) + chalk.gray(' │ ') + chalk.yellow('│'));
    }
    if (content.split('\n').length > 5) {
      console.log(chalk.yellow('│') + chalk.gray('  │ ') + chalk.dim('...'.padEnd(54)) + chalk.gray(' │ ') + chalk.yellow('│'));
    }
    console.log(chalk.yellow('│') + chalk.gray('  └────────────────────────────────────────────────────────┘ ') + chalk.yellow('│'));
  }

  console.log(chalk.yellow('│') + '                                                             ' + chalk.yellow('│'));
  console.log(chalk.yellow('│') + `  ${chalk.green('[Y]es')}  ${chalk.red('[n]o')}  ${chalk.blue('[v]iew full')}  ${chalk.magenta('[a]lways')}  ${chalk.dim('[s]kip')}        ` + chalk.yellow('│'));
  console.log(chalk.yellow('│') + '                                                             ' + chalk.yellow('│'));
  console.log(chalk.yellow('└─────────────────────────────────────────────────────────────┘'));

  const response = await askQuestion(theme.prompt('> '));
  const answer = response.toLowerCase().trim();

  switch (answer) {
    case 'y':
    case 'yes':
    case '':
      return { approved: true };
    case 'a':
    case 'always':
      return { approved: true, always: true };
    case 'v':
    case 'view':
      // Show full content
      showFullContent(name, input);
      // Re-prompt
      return promptForPermission(toolCall, config);
    case 'n':
    case 'no':
    case 's':
    case 'skip':
    default:
      return { approved: false };
  }
}

function getDisplayParams(toolName: string, input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  switch (toolName) {
    case 'read_file':
    case 'write_file':
    case 'edit_file':
      if (input.path) result['Path'] = input.path;
      if (input.search) result['Search'] = input.search;
      break;
    case 'run_command':
      if (input.command) result['Command'] = input.command;
      if (input.cwd) result['CWD'] = input.cwd;
      break;
    case 'list_directory':
      if (input.path) result['Path'] = input.path;
      break;
    case 'search_files':
      if (input.pattern) result['Pattern'] = input.pattern;
      break;
    case 'search_content':
      if (input.query) result['Query'] = input.query;
      break;
    case 'fetch_url':
      if (input.url) result['URL'] = input.url;
      break;
    default:
      // Show all params for unknown tools
      Object.assign(result, input);
  }

  return result;
}

function showFullContent(toolName: string, input: Record<string, unknown>): void {
  console.log('');
  console.log(chalk.cyan('─'.repeat(60)));

  if (toolName === 'write_file' && input.content) {
    console.log(chalk.bold('File content:'));
    console.log(input.content);
  } else if (toolName === 'edit_file') {
    if (input.search) {
      console.log(chalk.bold('Search text:'));
      console.log(input.search);
    }
    if (input.replace) {
      console.log(chalk.bold('\nReplace with:'));
      console.log(input.replace);
    }
  } else if (toolName === 'run_command' && input.command) {
    console.log(chalk.bold('Command:'));
    console.log(input.command);
  } else {
    console.log(chalk.bold('Full parameters:'));
    console.log(JSON.stringify(input, null, 2));
  }

  console.log(chalk.cyan('─'.repeat(60)));
  console.log('');
}

function askQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function formatPermissionDenied(toolName: string): string {
  return chalk.yellow(`⚠ Tool "${toolName}" was skipped by user`);
}
