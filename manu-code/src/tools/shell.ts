import { spawn } from 'child_process';
import type { Tool, ToolExecutionResult, ToolContext } from '../types.js';

const DANGEROUS_PATTERNS = [
  /rm\s+-rf?\s+[\/~]/,           // rm -rf / or ~
  />\s*\/dev\/sd[a-z]/,          // Write to disk devices
  /mkfs\./,                       // Format filesystems
  /dd\s+if=.*of=\/dev/,          // dd to devices
  /chmod\s+-R\s+777/,            // Overly permissive chmod
  /:(){ :|:& };:/,               // Fork bomb
  /curl.*\|\s*bash/,             // Pipe curl to bash
  /wget.*\|\s*bash/,             // Pipe wget to bash
  />\s*\/etc\//,                 // Write to /etc
  /sudo\s+rm/,                   // sudo rm
];

export const runCommandTool: Tool = {
  name: 'run_command',
  description: 'Execute a shell command in the project directory. Use for running tests, builds, git commands, etc.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command (defaults to project root)',
      },
      timeout: {
        type: 'number',
        default: 60000,
        description: 'Command timeout in milliseconds (default: 60000)',
      },
    },
    required: ['command'],
  },
  permission: 'prompt',
  async execute(params, context): Promise<ToolExecutionResult> {
    const command = params.command as string;
    const cwd = params.cwd
      ? resolvePath(params.cwd as string, context)
      : context.projectRoot || context.cwd;
    const timeout = (params.timeout as number) || 60000;

    // Check for dangerous commands
    if (isDangerous(command)) {
      return {
        success: false,
        error: 'This command has been blocked for safety reasons.',
      };
    }

    try {
      const result = await executeCommand(command, cwd, timeout);
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Command failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

function executeCommand(
  command: string,
  cwd: string,
  timeout: number
): Promise<ToolExecutionResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];

    const proc = spawn(shell, shellArgs, {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false,
        error: `Command timed out after ${timeout}ms`,
        output: stdout,
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        resolve({
          success: true,
          output: stdout || 'Command completed successfully with no output.',
        });
      } else {
        resolve({
          success: false,
          error: `Command exited with code ${code}`,
          output: stderr || stdout,
        });
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: `Failed to execute command: ${error.message}`,
      });
    });
  });
}

function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

export function isSafeCommand(command: string, safeCommands: string[]): boolean {
  const trimmedCommand = command.trim();

  for (const safe of safeCommands) {
    if (trimmedCommand === safe || trimmedCommand.startsWith(safe + ' ')) {
      return true;
    }
  }

  return false;
}

function resolvePath(inputPath: string, context: ToolContext): string {
  const path = require('path');
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(context.projectRoot || context.cwd, inputPath);
}

export const shellTools = [runCommandTool];
