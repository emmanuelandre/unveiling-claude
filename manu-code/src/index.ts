#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from './config/index.js';
import { selectProvider, getProvider, setCurrentProvider } from './providers/index.js';
import { displayWelcome, displayCompactWelcome, displayGoodbye, displayError } from './cli/welcome.js';
import { startREPL } from './cli/repl.js';
import { loadLatestSession, restoreHistory } from './session/persistence.js';
import { getConversationHistory } from './session/history.js';
import { setVerbose } from './utils/logger.js';
import type { ProviderName } from './types.js';

const VERSION = '1.0.0';

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('manu')
    .description('AI-powered CLI code generation assistant')
    .version(VERSION)
    .option('-p, --provider <provider>', 'LLM provider (anthropic/openai/gemini)')
    .option('-m, --model <model>', 'Model to use')
    .option('-c, --command <prompt>', 'Run single command and exit')
    .option('-r, --resume', 'Resume last session')
    .option('-s, --session <id>', 'Load specific session')
    .option('-y, --yolo', 'Auto-approve all tool calls')
    .option('--no-stream', 'Disable streaming output')
    .option('--config <path>', 'Path to config file')
    .option('-v, --verbose', 'Verbose output')
    .argument('[prompt]', 'Initial prompt to send')
    .action(async (prompt, options) => {
      try {
        await runManu(prompt, options);
      } catch (error) {
        displayError(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

interface RunOptions {
  provider?: string;
  model?: string;
  command?: string;
  resume?: boolean;
  session?: string;
  yolo?: boolean;
  stream?: boolean;
  config?: string;
  verbose?: boolean;
}

async function runManu(initialPrompt?: string, options: RunOptions = {}): Promise<void> {
  // Set verbose mode
  if (options.verbose) {
    setVerbose(true);
  }

  // Load configuration
  const config = await loadConfig(options.config);

  // Apply command-line overrides
  if (options.yolo) {
    config.permissions.yoloMode = true;
  }
  if (options.stream === false) {
    config.ui.streamOutput = false;
  }
  if (options.provider) {
    config.provider.default = options.provider as ProviderName;
  }
  if (options.model) {
    const providerName = config.provider.default;
    config.provider[providerName] = {
      ...config.provider[providerName],
      model: options.model,
    };
  }

  // Select provider
  let provider;
  try {
    if (options.provider) {
      provider = getProvider(options.provider as ProviderName, config);
    } else {
      provider = selectProvider(config);
    }
    setCurrentProvider(provider);
  } catch (error) {
    displayError(error instanceof Error ? error.message : String(error));
    console.log('\nPlease set one of the following environment variables:');
    console.log('  ANTHROPIC_API_KEY - for Anthropic Claude');
    console.log('  OPENAI_API_KEY    - for OpenAI GPT');
    console.log('  GOOGLE_API_KEY    - for Google Gemini');
    process.exit(1);
  }

  const model = config.provider[provider.name]?.model || provider.getDefaultModel();

  // Handle resume/session loading
  if (options.resume || options.session) {
    const history = getConversationHistory();
    let session;

    if (options.session) {
      const { loadSession } = await import('./session/persistence.js');
      session = await loadSession(options.session);
      if (!session) {
        displayError(`Session not found: ${options.session}`);
        process.exit(1);
      }
    } else {
      session = await loadLatestSession();
      if (!session) {
        displayError('No previous session found');
        process.exit(1);
      }
    }

    restoreHistory(session, history);
    displayCompactWelcome(provider.name, model);
    console.log(`Resumed session: ${session.id}`);
  } else {
    // Display welcome
    displayWelcome(provider.name, model);
  }

  // Handle single command mode
  if (options.command || initialPrompt) {
    const prompt = options.command || initialPrompt!;
    // For single command mode, show the prompt
    console.log('\n' + prompt + '\n');
  }

  // Start interactive REPL
  await startREPL({
    config,
    provider,
  });

  displayGoodbye();
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
