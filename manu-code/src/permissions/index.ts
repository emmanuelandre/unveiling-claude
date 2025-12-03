import type { ToolCall, Config } from '../types.js';
import { getToolPermission } from '../tools/index.js';
import { promptForPermission, type PermissionPromptResult } from './prompts.js';

// Track tools that user has approved with "always"
const alwaysApproved = new Set<string>();

export async function checkPermission(
  toolCall: ToolCall,
  config: Config
): Promise<PermissionPromptResult> {
  const { name, input } = toolCall;

  // Get base permission level for the tool
  const permission = getToolPermission(name, input, config);

  // Auto-approved tools
  if (permission === 'auto') {
    return { approved: true };
  }

  // Denied tools
  if (permission === 'deny') {
    return { approved: false };
  }

  // Check if user has previously approved "always" for this tool
  const alwaysKey = getAlwaysKey(name, input);
  if (alwaysApproved.has(alwaysKey)) {
    return { approved: true };
  }

  // Prompt user for permission
  const result = await promptForPermission(toolCall, config);

  // Store "always" approval
  if (result.approved && result.always) {
    alwaysApproved.add(alwaysKey);
  }

  return result;
}

function getAlwaysKey(toolName: string, input: Record<string, unknown>): string {
  // Generate a key for "always" approval
  // For some tools, we use specific input values to make the key more precise
  switch (toolName) {
    case 'write_file':
    case 'edit_file':
    case 'read_file':
      return `${toolName}:${input.path || '*'}`;
    case 'run_command':
      // For commands, use the command prefix (first word)
      const cmd = (input.command as string) || '';
      const prefix = cmd.split(/\s+/)[0];
      return `${toolName}:${prefix}`;
    default:
      return toolName;
  }
}

export function resetPermissions(): void {
  alwaysApproved.clear();
}

export function getApprovedTools(): string[] {
  return Array.from(alwaysApproved);
}

export { promptForPermission };
