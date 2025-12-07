import type { LLMProvider, ProviderName, Config } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { ProviderError } from '../utils/errors.js';

let currentProvider: LLMProvider | null = null;

export function getProvider(name: ProviderName, config?: Config): LLMProvider {
  const providerConfig = config?.provider[name];

  switch (name) {
    case 'anthropic':
      return new AnthropicProvider(undefined, providerConfig?.baseUrl);
    case 'openai':
      return new OpenAIProvider(undefined, providerConfig?.baseUrl);
    case 'gemini':
      return new GeminiProvider();
    default:
      throw new ProviderError(`Unknown provider: ${name}`, name);
  }
}

export function selectProvider(config: Config): LLMProvider {
  // 1. Check explicit provider setting
  if (config.provider.default) {
    try {
      currentProvider = getProvider(config.provider.default, config);
      return currentProvider;
    } catch {
      // Fall through to check available keys
    }
  }

  // 2. Check available API keys
  const available: ProviderName[] = [];
  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
  if (process.env.OPENAI_API_KEY) available.push('openai');
  if (process.env.GOOGLE_API_KEY) available.push('gemini');

  if (available.length === 0) {
    throw new ProviderError(
      'No API keys configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY',
      'none'
    );
  }

  // 3. Use default priority: Anthropic > OpenAI > Gemini
  currentProvider = getProvider(available[0], config);
  return currentProvider;
}

export function getCurrentProvider(): LLMProvider | null {
  return currentProvider;
}

export function setCurrentProvider(provider: LLMProvider): void {
  currentProvider = provider;
}

export function getAvailableProviders(): ProviderName[] {
  const available: ProviderName[] = [];
  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
  if (process.env.OPENAI_API_KEY) available.push('openai');
  if (process.env.GOOGLE_API_KEY) available.push('gemini');
  return available;
}

export { AnthropicProvider, OpenAIProvider, GeminiProvider };
