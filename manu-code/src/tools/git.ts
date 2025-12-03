import simpleGit, { SimpleGit } from 'simple-git';
import type { Tool, ToolExecutionResult, ToolContext } from '../types.js';

export const gitStatusTool: Tool = {
  name: 'git_status',
  description: 'Get the current git status of the repository, showing staged, unstaged, and untracked files.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    try {
      const git = getGit(context);
      const status = await git.status();

      const lines: string[] = [];

      if (status.current) {
        lines.push(`Branch: ${status.current}`);
      }

      if (status.tracking) {
        lines.push(`Tracking: ${status.tracking}`);
        if (status.ahead > 0) lines.push(`Ahead: ${status.ahead}`);
        if (status.behind > 0) lines.push(`Behind: ${status.behind}`);
      }

      if (status.staged.length > 0) {
        lines.push('\nStaged:');
        status.staged.forEach((f) => lines.push(`  ✓ ${f}`));
      }

      if (status.modified.length > 0) {
        lines.push('\nModified:');
        status.modified.forEach((f) => lines.push(`  M ${f}`));
      }

      if (status.not_added.length > 0) {
        lines.push('\nUntracked:');
        status.not_added.forEach((f) => lines.push(`  ? ${f}`));
      }

      if (status.deleted.length > 0) {
        lines.push('\nDeleted:');
        status.deleted.forEach((f) => lines.push(`  D ${f}`));
      }

      if (status.conflicted.length > 0) {
        lines.push('\nConflicted:');
        status.conflicted.forEach((f) => lines.push(`  ! ${f}`));
      }

      if (lines.length === 0 || (lines.length === 1 && status.isClean())) {
        lines.push('Working tree is clean');
      }

      return {
        success: true,
        output: lines.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get git status: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const gitDiffTool: Tool = {
  name: 'git_diff',
  description: 'Show git diff for changes in the repository. Can show staged or unstaged changes.',
  parameters: {
    type: 'object',
    properties: {
      staged: {
        type: 'boolean',
        default: false,
        description: 'Show staged changes instead of unstaged',
      },
      file: {
        type: 'string',
        description: 'Show diff for a specific file',
      },
    },
    required: [],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    try {
      const git = getGit(context);
      const staged = params.staged as boolean | undefined;
      const file = params.file as string | undefined;

      const options: string[] = [];
      if (staged) {
        options.push('--staged');
      }
      if (file) {
        options.push('--', file);
      }

      const diff = await git.diff(options);

      if (!diff) {
        return {
          success: true,
          output: 'No changes found.',
        };
      }

      return {
        success: true,
        output: diff,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get git diff: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const gitLogTool: Tool = {
  name: 'git_log',
  description: 'Show recent git commit history.',
  parameters: {
    type: 'object',
    properties: {
      maxCount: {
        type: 'number',
        default: 10,
        description: 'Maximum number of commits to show',
      },
      oneline: {
        type: 'boolean',
        default: true,
        description: 'Show each commit on a single line',
      },
    },
    required: [],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    try {
      const git = getGit(context);
      const maxCount = (params.maxCount as number) || 10;
      const oneline = params.oneline !== false;

      const log = await git.log({
        maxCount,
        format: oneline
          ? { hash: '%h', date: '%ar', message: '%s', author_name: '%an' }
          : undefined,
      });

      if (log.all.length === 0) {
        return {
          success: true,
          output: 'No commits found.',
        };
      }

      const lines = log.all.map((commit) => {
        if (oneline) {
          return `${commit.hash} ${commit.date} ${commit.message} (${commit.author_name})`;
        }
        return `commit ${commit.hash}\nAuthor: ${commit.author_name}\nDate: ${commit.date}\n\n    ${commit.message}\n`;
      });

      return {
        success: true,
        output: lines.join(oneline ? '\n' : '\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get git log: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

export const gitBranchTool: Tool = {
  name: 'git_branch',
  description: 'List git branches or get current branch information.',
  parameters: {
    type: 'object',
    properties: {
      all: {
        type: 'boolean',
        default: false,
        description: 'Show all branches including remote',
      },
    },
    required: [],
  },
  permission: 'auto',
  async execute(params, context): Promise<ToolExecutionResult> {
    try {
      const git = getGit(context);
      const showAll = params.all as boolean | undefined;

      const branches = await git.branch(showAll ? ['-a'] : []);

      const lines: string[] = [];
      for (const [name, data] of Object.entries(branches.branches)) {
        const prefix = data.current ? '* ' : '  ';
        lines.push(`${prefix}${name}`);
      }

      return {
        success: true,
        output: lines.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list branches: ${error instanceof Error ? error.message : error}`,
      };
    }
  },
};

function getGit(context: ToolContext): SimpleGit {
  return simpleGit(context.projectRoot || context.cwd);
}

export const gitTools = [gitStatusTool, gitDiffTool, gitLogTool, gitBranchTool];
