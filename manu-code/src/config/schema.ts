import type { Config, ProviderName } from '../types.js';

export const DEFAULT_CONFIG: Config = {
  provider: {
    default: 'anthropic',
    anthropic: {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 8192,
    },
    openai: {
      model: 'gpt-4o',
      maxTokens: 8192,
    },
    gemini: {
      model: 'gemini-2.0-flash',
      maxTokens: 8192,
    },
  },
  context: {
    maxContextTokens: 100000,
    alwaysInclude: [
      'README.md',
      'package.json',
      'Cargo.toml',
      'pyproject.toml',
      'go.mod',
    ],
    ignorePatterns: [
      'node_modules',
      '.git',
      'dist',
      'build',
      '__pycache__',
      '*.lock',
      '*.min.js',
    ],
  },
  permissions: {
    autoApproveReads: true,
    safeCommands: [
      'ls',
      'cat',
      'head',
      'tail',
      'grep',
      'find',
      'pwd',
      'echo',
      'which',
      'whoami',
      'date',
      'git status',
      'git log',
      'git diff',
      'git branch',
    ],
    yoloMode: false,
  },
  ui: {
    theme: 'dark',
    showTokenUsage: true,
    showCostEstimate: true,
    streamOutput: true,
  },
  history: {
    enabled: true,
    path: '~/.config/manu-code/history',
    maxEntries: 1000,
  },
  session: {
    autoSave: true,
    path: '~/.config/manu-code/sessions',
  },
};

export function validateConfig(config: Partial<Config>): Config {
  return {
    provider: {
      default: (config.provider?.default as ProviderName) || DEFAULT_CONFIG.provider.default,
      anthropic: {
        ...DEFAULT_CONFIG.provider.anthropic,
        ...config.provider?.anthropic,
      },
      openai: {
        ...DEFAULT_CONFIG.provider.openai,
        ...config.provider?.openai,
      },
      gemini: {
        ...DEFAULT_CONFIG.provider.gemini,
        ...config.provider?.gemini,
      },
    },
    context: {
      ...DEFAULT_CONFIG.context,
      ...config.context,
    },
    permissions: {
      ...DEFAULT_CONFIG.permissions,
      ...config.permissions,
    },
    ui: {
      ...DEFAULT_CONFIG.ui,
      ...config.ui,
    },
    history: {
      ...DEFAULT_CONFIG.history,
      ...config.history,
    },
    session: {
      ...DEFAULT_CONFIG.session,
      ...config.session,
    },
  };
}
