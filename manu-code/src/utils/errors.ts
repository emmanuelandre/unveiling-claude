export class ManuError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ManuError';
  }
}

export class ProviderError extends ManuError {
  constructor(message: string, provider: string, details?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', { provider, ...details });
    this.name = 'ProviderError';
  }
}

export class ToolError extends ManuError {
  constructor(message: string, toolName: string, details?: Record<string, unknown>) {
    super(message, 'TOOL_ERROR', { toolName, ...details });
    this.name = 'ToolError';
  }
}

export class ConfigError extends ManuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class PermissionError extends ManuError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
  }
}

export function formatError(error: unknown): string {
  if (error instanceof ManuError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
