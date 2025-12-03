import { cosmiconfig } from 'cosmiconfig';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as toml from 'toml';
import type { Config, ProviderName } from '../types.js';
import { DEFAULT_CONFIG, validateConfig } from './schema.js';
import { ConfigError } from '../utils/errors.js';

const MODULE_NAME = 'manu-code';

let cachedConfig: Config | null = null;

export async function loadConfig(configPath?: string): Promise<Config> {
  if (cachedConfig && !configPath) {
    return cachedConfig;
  }

  let fileConfig: Partial<Config> = {};

  if (configPath) {
    // Load from specified path
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      fileConfig = toml.parse(content);
    } catch (error) {
      throw new ConfigError(`Failed to load config from ${configPath}: ${error}`);
    }
  } else {
    // Use cosmiconfig to search for config
    const explorer = cosmiconfig(MODULE_NAME, {
      searchPlaces: [
        'manu-code.config.js',
        'manu-code.config.json',
        '.manu-coderc',
        '.manu-coderc.json',
        '.manu-coderc.toml',
        `${getConfigDir()}/config.toml`,
        `${getConfigDir()}/config.json`,
      ],
      loaders: {
        '.toml': (filepath: string, content: string) => toml.parse(content),
      },
    });

    try {
      const result = await explorer.search();
      if (result && result.config) {
        fileConfig = result.config;
      }
    } catch {
      // No config file found, use defaults
    }
  }

  // Apply environment variable overrides
  const envConfig = loadEnvConfig();
  const mergedConfig = mergeConfigs(fileConfig, envConfig);

  cachedConfig = validateConfig(mergedConfig);
  return cachedConfig;
}

function getConfigDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', MODULE_NAME);
  }
  return path.join(os.homedir(), '.config', MODULE_NAME);
}

function loadEnvConfig(): Partial<Config> {
  const config: Partial<Config> = {};

  // Provider from environment
  const defaultProvider = process.env.MANU_DEFAULT_PROVIDER;
  if (defaultProvider && ['anthropic', 'openai', 'gemini'].includes(defaultProvider)) {
    config.provider = {
      default: defaultProvider as ProviderName,
    };
  }

  return config;
}

function mergeConfigs(fileConfig: Partial<Config>, envConfig: Partial<Config>): Partial<Config> {
  const mergedProvider = {
    ...fileConfig.provider,
    ...envConfig.provider,
  };

  return {
    ...fileConfig,
    ...envConfig,
    provider: mergedProvider.default ? mergedProvider as Config['provider'] : fileConfig.provider,
  };
}

export function getConfig(): Config {
  if (!cachedConfig) {
    throw new ConfigError('Config not loaded. Call loadConfig() first.');
  }
  return cachedConfig;
}

export function updateConfig(updates: Partial<Config>): Config {
  if (!cachedConfig) {
    throw new ConfigError('Config not loaded. Call loadConfig() first.');
  }
  cachedConfig = validateConfig({
    ...cachedConfig,
    ...updates,
  });
  return cachedConfig;
}

export async function saveConfig(config: Config, configPath?: string): Promise<void> {
  const targetPath = configPath || path.join(getConfigDir(), 'config.toml');

  // Ensure directory exists
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  // Convert to TOML format
  const tomlContent = configToToml(config);
  await fs.writeFile(targetPath, tomlContent, 'utf-8');
}

function configToToml(config: Config): string {
  const lines: string[] = [];

  lines.push('[provider]');
  lines.push(`default = "${config.provider.default}"`);
  lines.push('');

  if (config.provider.anthropic) {
    lines.push('[provider.anthropic]');
    if (config.provider.anthropic.model) {
      lines.push(`model = "${config.provider.anthropic.model}"`);
    }
    if (config.provider.anthropic.maxTokens) {
      lines.push(`max_tokens = ${config.provider.anthropic.maxTokens}`);
    }
    lines.push('');
  }

  if (config.provider.openai) {
    lines.push('[provider.openai]');
    if (config.provider.openai.model) {
      lines.push(`model = "${config.provider.openai.model}"`);
    }
    if (config.provider.openai.maxTokens) {
      lines.push(`max_tokens = ${config.provider.openai.maxTokens}`);
    }
    lines.push('');
  }

  if (config.provider.gemini) {
    lines.push('[provider.gemini]');
    if (config.provider.gemini.model) {
      lines.push(`model = "${config.provider.gemini.model}"`);
    }
    if (config.provider.gemini.maxTokens) {
      lines.push(`max_tokens = ${config.provider.gemini.maxTokens}`);
    }
    lines.push('');
  }

  lines.push('[context]');
  lines.push(`max_context_tokens = ${config.context.maxContextTokens}`);
  lines.push(`always_include = [${config.context.alwaysInclude.map(s => `"${s}"`).join(', ')}]`);
  lines.push(`ignore_patterns = [${config.context.ignorePatterns.map(s => `"${s}"`).join(', ')}]`);
  lines.push('');

  lines.push('[permissions]');
  lines.push(`auto_approve_reads = ${config.permissions.autoApproveReads}`);
  lines.push(`safe_commands = [${config.permissions.safeCommands.map(s => `"${s}"`).join(', ')}]`);
  lines.push(`yolo_mode = ${config.permissions.yoloMode}`);
  lines.push('');

  lines.push('[ui]');
  lines.push(`theme = "${config.ui.theme}"`);
  lines.push(`show_token_usage = ${config.ui.showTokenUsage}`);
  lines.push(`show_cost_estimate = ${config.ui.showCostEstimate}`);
  lines.push(`stream_output = ${config.ui.streamOutput}`);
  lines.push('');

  lines.push('[history]');
  lines.push(`enabled = ${config.history.enabled}`);
  lines.push(`path = "${config.history.path}"`);
  lines.push(`max_entries = ${config.history.maxEntries}`);
  lines.push('');

  lines.push('[session]');
  lines.push(`auto_save = ${config.session.autoSave}`);
  lines.push(`path = "${config.session.path}"`);

  return lines.join('\n');
}

export { DEFAULT_CONFIG };
