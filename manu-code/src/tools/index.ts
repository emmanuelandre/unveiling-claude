import type { Tool, ToolContext, ToolExecutionResult, Config } from '../types.js';
import { fileOpsTools } from './file-ops.js';
import { searchTools } from './search.js';
import { shellTools, isSafeCommand } from './shell.js';
import { gitTools } from './git.js';
import { webTools } from './web.js';
import { ToolError } from '../utils/errors.js';

// Export all tools
export const allTools: Tool[] = [
  ...fileOpsTools,
  ...searchTools,
  ...shellTools,
  ...gitTools,
  ...webTools,
];

// Tool registry
const toolRegistry = new Map<string, Tool>();

// Initialize registry
for (const tool of allTools) {
  toolRegistry.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): Tool[] {
  return allTools;
}

export function getToolNames(): string[] {
  return Array.from(toolRegistry.keys());
}

export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const tool = toolRegistry.get(name);

  if (!tool) {
    throw new ToolError(`Unknown tool: ${name}`, name);
  }

  return tool.execute(params, context);
}

export function getToolPermission(
  toolName: string,
  params: Record<string, unknown>,
  config: Config
): 'auto' | 'prompt' | 'deny' {
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    return 'deny';
  }

  // YOLO mode - auto approve everything
  if (config.permissions.yoloMode) {
    return 'auto';
  }

  // Check if it's a safe shell command
  if (toolName === 'run_command' && params.command) {
    if (isSafeCommand(params.command as string, config.permissions.safeCommands)) {
      return 'auto';
    }
  }

  return tool.permission;
}

export function formatToolForDisplay(tool: Tool): string {
  const params = Object.entries(tool.parameters.properties || {})
    .map(([name, schema]) => {
      const required = tool.parameters.required?.includes(name) ? '*' : '';
      return `  ${name}${required}: ${schema.description || schema.type}`;
    })
    .join('\n');

  return `${tool.name} (${tool.permission})\n  ${tool.description}\n  Parameters:\n${params}`;
}

export { isSafeCommand };
