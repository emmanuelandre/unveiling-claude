import * as fs from 'fs/promises';
import * as path from 'path';
import type { Tool, ToolExecutionResult, ToolContext } from '../types.js';

export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file at the specified path. Returns the file content as text.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read (relative to project root or absolute)',
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64'],
        default: 'utf-8',
        description: 'The encoding to use when reading the file',
      },
    },
    required: ['path'],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    const filePath = resolvePath(params.path as string, context);
    const encoding = (params.encoding as BufferEncoding) || 'utf-8';

    try {
      const content = await fs.readFile(filePath, encoding);
      return {
        success: true,
        output: content,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Create or overwrite a file with the specified content. Creates parent directories if needed.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path where to write the file (relative to project root or absolute)',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['path', 'content'],
  },
  permission: 'prompt',
  async execute(params, context): Promise<ToolExecutionResult> {
    const filePath = resolvePath(params.path as string, context);
    const content = params.content as string;

    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      await fs.writeFile(filePath, content, 'utf-8');
      return {
        success: true,
        output: `Successfully wrote ${content.length} characters to ${filePath}`,
        artifacts: [{ type: 'file', path: filePath }],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const editFileTool: Tool = {
  name: 'edit_file',
  description:
    'Make targeted edits to a file using search and replace. Finds the exact occurrence of the search text and replaces it.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to edit',
      },
      search: {
        type: 'string',
        description: 'The exact text to search for in the file',
      },
      replace: {
        type: 'string',
        description: 'The text to replace the search text with',
      },
    },
    required: ['path', 'search', 'replace'],
  },
  permission: 'prompt',
  async execute(params, context): Promise<ToolExecutionResult> {
    const filePath = resolvePath(params.path as string, context);
    const search = params.search as string;
    const replace = params.replace as string;

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      if (!content.includes(search)) {
        return {
          success: false,
          error: `Search text not found in file: "${search.slice(0, 50)}${search.length > 50 ? '...' : ''}"`,
        };
      }

      // Count occurrences
      const occurrences = content.split(search).length - 1;
      if (occurrences > 1) {
        return {
          success: false,
          error: `Search text found ${occurrences} times. Please provide more context to make the search unique.`,
        };
      }

      const newContent = content.replace(search, replace);
      await fs.writeFile(filePath, newContent, 'utf-8');

      return {
        success: true,
        output: `Successfully edited ${filePath}`,
        artifacts: [{ type: 'file', path: filePath }],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to edit file: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'List files and directories in the specified path. Returns file names with type indicators.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The directory path to list (relative to project root or absolute)',
      },
      recursive: {
        type: 'boolean',
        default: false,
        description: 'Whether to list files recursively',
      },
      maxDepth: {
        type: 'number',
        default: 3,
        description: 'Maximum depth for recursive listing',
      },
    },
    required: ['path'],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    const dirPath = resolvePath(params.path as string, context);
    const recursive = params.recursive as boolean | undefined;
    const maxDepth = (params.maxDepth as number) || 3;

    try {
      const entries = await listDir(dirPath, recursive ? maxDepth : 1, 0);
      return {
        success: true,
        output: entries.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

async function listDir(dirPath: string, maxDepth: number, currentDepth: number): Promise<string[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const results: string[] = [];
  const indent = '  '.repeat(currentDepth);

  for (const entry of entries) {
    // Skip hidden files and common ignore patterns
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);
    const prefix = entry.isDirectory() ? '📁 ' : '📄 ';
    results.push(`${indent}${prefix}${entry.name}`);

    if (entry.isDirectory() && currentDepth < maxDepth - 1) {
      const subEntries = await listDir(entryPath, maxDepth, currentDepth + 1);
      results.push(...subEntries);
    }
  }

  return results;
}

function resolvePath(inputPath: string, context: ToolContext): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(context.projectRoot || context.cwd, inputPath);
}

export const fileOpsTools = [readFileTool, writeFileTool, editFileTool, listDirectoryTool];
