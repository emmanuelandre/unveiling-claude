import { theme } from './colors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLogLevel: LogLevel = 'info';
let verboseMode = false;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose;
  if (verbose) {
    currentLogLevel = 'debug';
  }
}

export function isVerbose(): boolean {
  return verboseMode;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(theme.dim(`[DEBUG] ${message}`), ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(theme.info(`[INFO] ${message}`), ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.log(theme.warning(`[WARN] ${message}`), ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(theme.error(`[ERROR] ${message}`), ...args);
    }
  },

  success(message: string, ...args: unknown[]): void {
    console.log(theme.success(message), ...args);
  },
};
