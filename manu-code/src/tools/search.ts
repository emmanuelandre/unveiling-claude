import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool, ToolExecutionResult, ToolContext } from '../types.js';

export const searchFilesTool: Tool = {
  name: 'search_files',
  description: 'Search for files matching a glob pattern (e.g., "**/*.ts", "src/**/*.js")',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match files (e.g., "**/*.ts", "src/**/*.js")',
      },
      path: {
        type: 'string',
        description: 'Base directory to search in (defaults to project root)',
      },
    },
    required: ['pattern'],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    const pattern = params.pattern as string;
    const basePath = params.path
      ? resolvePath(params.path as string, context)
      : context.projectRoot || context.cwd;

    try {
      const matches = await globMatch(basePath, pattern, context);
      if (matches.length === 0) {
        return {
          success: true,
          output: 'No files found matching the pattern.',
        };
      }
      return {
        success: true,
        output: `Found ${matches.length} file(s):\n${matches.join('\n')}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search files: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const searchContentTool: Tool = {
  name: 'search_content',
  description: 'Search for text content within files (like grep). Returns matching lines with file paths and line numbers.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The text or regex pattern to search for',
      },
      path: {
        type: 'string',
        description: 'Directory to search in (defaults to project root)',
      },
      filePattern: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g., "*.ts")',
      },
      caseSensitive: {
        type: 'boolean',
        default: false,
        description: 'Whether the search should be case-sensitive',
      },
      maxResults: {
        type: 'number',
        default: 50,
        description: 'Maximum number of results to return',
      },
    },
    required: ['query'],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    const query = params.query as string;
    const basePath = params.path
      ? resolvePath(params.path as string, context)
      : context.projectRoot || context.cwd;
    const filePattern = (params.filePattern as string) || '**/*';
    const caseSensitive = params.caseSensitive as boolean | undefined;
    const maxResults = (params.maxResults as number) || 50;

    try {
      const files = await globMatch(basePath, filePattern, context);
      const results: string[] = [];
      const flags = caseSensitive ? 'g' : 'gi';

      let regex: RegExp;
      try {
        regex = new RegExp(query, flags);
      } catch {
        // If invalid regex, treat as literal string
        regex = new RegExp(escapeRegex(query), flags);
      }

      for (const file of files) {
        if (results.length >= maxResults) break;

        try {
          const stat = await fs.stat(file);
          if (!stat.isFile()) continue;

          // Skip binary files and large files
          if (stat.size > 1024 * 1024) continue; // Skip files > 1MB

          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;

            if (regex.test(lines[i])) {
              const relativePath = path.relative(basePath, file);
              results.push(`${relativePath}:${i + 1}: ${lines[i].trim()}`);
            }
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }

      if (results.length === 0) {
        return {
          success: true,
          output: 'No matches found.',
        };
      }

      return {
        success: true,
        output: `Found ${results.length} match(es):\n${results.join('\n')}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search content: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

// Simple glob matching implementation
async function globMatch(basePath: string, pattern: string, context: ToolContext): Promise<string[]> {
  const results: string[] = [];
  const ignorePatterns = context.config.context.ignorePatterns;

  await walkDir(basePath, pattern, results, ignorePatterns);

  return results;
}

async function walkDir(
  dir: string,
  pattern: string,
  results: string[],
  ignorePatterns: string[]
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Check ignore patterns
      if (shouldIgnore(entry.name, ignorePatterns)) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walkDir(fullPath, pattern, results, ignorePatterns);
      } else if (entry.isFile()) {
        if (matchGlob(fullPath, pattern)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Skip directories we can't access
  }
}

function matchGlob(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\./g, '\\.');

  const regex = new RegExp(`(^|/)${regexPattern}$`);
  return regex.test(filePath);
}

function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  if (name.startsWith('.')) return true;

  for (const pattern of ignorePatterns) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(name)) return true;
    } else if (name === pattern) {
      return true;
    }
  }

  return false;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolvePath(inputPath: string, context: ToolContext): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(context.projectRoot || context.cwd, inputPath);
}

export const searchTools = [searchFilesTool, searchContentTool];
