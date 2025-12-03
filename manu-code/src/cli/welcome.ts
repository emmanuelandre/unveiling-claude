import chalk from 'chalk';
import type { Config, ProviderName } from '../types.js';
import { theme } from '../utils/colors.js';
import { formatTokenCount } from '../utils/tokens.js';

const VERSION = '1.0.0';

const ASCII_BANNER = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗     ██████╗ ██████╗ ██████╗ ███████╗║
║   ████╗ ████║██╔══██╗████╗  ██║██║   ██║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝║
║   ██╔████╔██║███████║██╔██╗ ██║██║   ██║    ██║     ██║   ██║██║  ██║█████╗  ║
║   ██║╚██╔╝██║██╔══██║██║╚██╗██║██║   ██║    ██║     ██║   ██║██║  ██║██╔══╝  ║
║   ██║ ╚═╝ ██║██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗╚██████╔╝██████╔╝███████╗║
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝`;

export interface ProjectInfo {
  name: string;
  type: string;
  fileCount: number;
  tokenCount: number;
}

export function displayWelcome(
  provider: ProviderName,
  model: string,
  projectInfo?: ProjectInfo
): void {
  // Display ASCII banner with gradient colors
  const bannerLines = ASCII_BANNER.split('\n');
  for (let i = 0; i < bannerLines.length; i++) {
    const line = bannerLines[i];
    if (i < bannerLines.length / 2) {
      console.log(chalk.cyan(line));
    } else {
      console.log(chalk.magenta(line));
    }
  }

  console.log('');

  // Info box
  const providerDisplay = getProviderDisplay(provider);
  const modelDisplay = model;

  console.log(chalk.gray('┌─────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.gray('│') + `  🚀 ${chalk.bold('Manu Code')} v${VERSION}`.padEnd(73) + chalk.gray('│'));
  console.log(chalk.gray('│') + chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ') + chalk.gray('│'));
  console.log(chalk.gray('│') + '                                                                 ' + chalk.gray('│'));
  console.log(
    chalk.gray('│') +
      `  Provider:  ${chalk.green('●')} ${providerDisplay} (${theme.primary(modelDisplay)})`.padEnd(73) +
      chalk.gray('│')
  );

  if (projectInfo) {
    console.log(
      chalk.gray('│') +
        `  Project:   📁 ${projectInfo.name} (${projectInfo.type})`.padEnd(64) +
        chalk.gray('│')
    );
    console.log(
      chalk.gray('│') +
        `  Files:     📊 ${projectInfo.fileCount} indexed (${formatTokenCount(projectInfo.tokenCount)} tokens)`.padEnd(64) +
        chalk.gray('│')
    );
  }

  console.log(chalk.gray('│') + '                                                                 ' + chalk.gray('│'));
  console.log(
    chalk.gray('│') +
      `  Commands:  ${theme.dim('/help')}  ${theme.dim('/config')}  ${theme.dim('/clear')}  ${theme.dim('/model')}  ${theme.dim('/exit')}               ` +
      chalk.gray('│')
  );
  console.log(chalk.gray('│') + '                                                                 ' + chalk.gray('│'));
  console.log(chalk.gray('└─────────────────────────────────────────────────────────────────┘'));

  console.log('');
}

function getProviderDisplay(provider: ProviderName): string {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic';
    case 'openai':
      return 'OpenAI';
    case 'gemini':
      return 'Google Gemini';
    default:
      return provider;
  }
}

export function displayCompactWelcome(provider: ProviderName, model: string): void {
  console.log('');
  console.log(
    theme.primary('Manu Code') +
      ' v' +
      VERSION +
      ' | ' +
      theme.success('●') +
      ' ' +
      getProviderDisplay(provider) +
      ' ' +
      theme.dim(`(${model})`)
  );
  console.log(theme.dim('Type /help for commands, or start chatting!'));
  console.log('');
}

export function displayGoodbye(): void {
  console.log('');
  console.log(theme.dim('Thanks for using Manu Code! 👋'));
  console.log('');
}

export function displayError(message: string): void {
  console.log('');
  console.log(theme.error('Error: ') + message);
  console.log('');
}

export function displayWarning(message: string): void {
  console.log(theme.warning('Warning: ') + message);
}

export function displaySuccess(message: string): void {
  console.log(theme.success('✓ ') + message);
}

export function displayInfo(message: string): void {
  console.log(theme.info('ℹ ') + message);
}
