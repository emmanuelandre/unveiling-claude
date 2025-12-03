# Manu Code - CLI Code Generation Tool

## Specification Document v1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Welcome Display](#welcome-display)
3. [Architecture](#architecture)
4. [Multi-Provider LLM Integration](#multi-provider-llm-integration)
5. [Tool System](#tool-system)
6. [Configuration](#configuration)
7. [CLI Commands](#cli-commands)
8. [Data Flow](#data-flow)
9. [Security & Permissions](#security--permissions)
10. [Implementation Phases](#implementation-phases)
11. [Tech Stack](#tech-stack)
12. [File Structure](#file-structure)
13. [API Reference](#api-reference)

---

## Overview

**Manu Code** is an AI-powered CLI code generation assistant that helps developers write, edit, and manage code through natural language conversations. It integrates seamlessly with OpenAI, Anthropic, and Google Gemini APIs.

### Key Features

- Multi-provider LLM support (OpenAI, Anthropic, Gemini)
- Context-aware code generation
- File system operations with permission controls
- Shell command execution
- Project indexing and smart context selection
- Streaming responses with syntax highlighting
- Session persistence and history
- Colorful, intuitive terminal UI

---

## Welcome Display

The welcome screen uses ANSI colors for a vibrant, professional appearance.

### ASCII Art Banner

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ███╗   ███╗ █████╗ ███╗   ██╗██╗   ██╗     ██████╗ ██████╗ ██████╗ ███████╗║
║   ████╗ ████║██╔══██╗████╗  ██║██║   ██║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝║
║   ██╔████╔██║███████║██╔██╗ ██║██║   ██║    ██║     ██║   ██║██║  ██║█████╗  ║
║   ██║╚██╔╝██║██╔══██║██║╚██╗██║██║   ██║    ██║     ██║   ██║██║  ██║██╔══╝  ║
║   ██║ ╚═╝ ██║██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗╚██████╔╝██████╔╝███████╗║
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Color Scheme

| Element | Color Code | ANSI |
|---------|------------|------|
| Banner Primary | Cyan | `\x1b[36m` |
| Banner Accent | Magenta | `\x1b[35m` |
| Success | Green | `\x1b[32m` |
| Warning | Yellow | `\x1b[33m` |
| Error | Red | `\x1b[31m` |
| Info | Blue | `\x1b[34m` |
| Prompt Arrow | Bright Cyan | `\x1b[96m` |
| Code Blocks | White on Gray | `\x1b[37;100m` |

### Welcome Message Format

```
┌─────────────────────────────────────────────────────────────────┐
│  🚀 Manu Code v1.0.0                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  Provider:  ● Anthropic (claude-sonnet-4-20250514)                     │
│  Project:   📁 my-project (Node.js)                             │
│  Files:     📊 142 indexed (23,451 tokens)                      │
│                                                                 │
│  Commands:  /help  /config  /clear  /model  /exit               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

manu ›
```

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MANU CODE CLI                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐               │
│  │   CLI Layer   │───▶│  Core Engine  │───▶│  LLM Router   │               │
│  │               │    │               │    │               │               │
│  │ • REPL        │    │ • Context Mgr │    │ • OpenAI      │               │
│  │ • Input Parse │    │ • Tool Exec   │    │ • Anthropic   │               │
│  │ • Output Fmt  │    │ • Session Mgr │    │ • Gemini      │               │
│  └───────────────┘    └───────────────┘    └───────────────┘               │
│           │                   │                    │                        │
│           ▼                   ▼                    ▼                        │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                        Tool System                             │         │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │         │
│  │  │  File   │ │  Shell  │ │  Search │ │   Web   │ │  Git    │ │         │
│  │  │  Ops    │ │  Exec   │ │  Code   │ │  Fetch  │ │  Ops    │ │         │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. CLI Layer
- Terminal input/output handling
- REPL (Read-Eval-Print Loop)
- Syntax highlighting and formatting
- Progress indicators and spinners
- Keyboard shortcuts

#### 2. Core Engine
- Message history management
- Context window optimization
- Token counting and budgeting
- Tool orchestration
- Session persistence

#### 3. LLM Router
- Multi-provider abstraction
- API key management
- Model selection
- Fallback handling
- Rate limiting

---

## Multi-Provider LLM Integration

### Supported Providers

| Provider | Models | Default Model |
|----------|--------|---------------|
| **Anthropic** | claude-sonnet-4-20250514, claude-opus-4-20250514, claude-3-5-haiku-20241022 | claude-sonnet-4-20250514 |
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-mini | gpt-4o |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash | gemini-2.0-flash |

### Environment Variables

```bash
# API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Optional: Default provider
MANU_DEFAULT_PROVIDER=anthropic

# Optional: Custom base URLs
ANTHROPIC_BASE_URL=https://api.anthropic.com
OPENAI_BASE_URL=https://api.openai.com/v1
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com
```

### Provider Abstraction Interface

```typescript
interface LLMProvider {
  name: string;
  
  // Core methods
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk>;
  countTokens(text: string): number;
  
  // Tool support
  supportsTools(): boolean;
  formatTools(tools: Tool[]): ProviderToolFormat;
  parseToolCalls(response: any): ToolCall[];
  
  // Model info
  getModels(): ModelInfo[];
  getDefaultModel(): string;
  getMaxContextTokens(model: string): number;
}
```

### Unified Message Format

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentBlock[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  image?: { base64: string; mediaType: string };
  toolUse?: { id: string; name: string; input: any };
  toolResult?: { id: string; output: string; isError?: boolean };
}
```

### Provider-Specific Adapters

#### Anthropic Adapter

```typescript
class AnthropicAdapter implements LLMProvider {
  name = 'anthropic';
  
  async *chat(messages, options) {
    const response = await anthropic.messages.create({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 8192,
      messages: this.convertMessages(messages),
      tools: this.formatTools(options.tools),
      stream: true
    });
    
    for await (const event of response) {
      yield this.normalizeChunk(event);
    }
  }
}
```

#### OpenAI Adapter

```typescript
class OpenAIAdapter implements LLMProvider {
  name = 'openai';
  
  async *chat(messages, options) {
    const stream = await openai.chat.completions.create({
      model: options.model || 'gpt-4o',
      max_tokens: options.maxTokens || 8192,
      messages: this.convertMessages(messages),
      tools: this.formatTools(options.tools),
      stream: true
    });
    
    for await (const chunk of stream) {
      yield this.normalizeChunk(chunk);
    }
  }
}
```

#### Gemini Adapter

```typescript
class GeminiAdapter implements LLMProvider {
  name = 'gemini';
  
  async *chat(messages, options) {
    const model = genAI.getGenerativeModel({ 
      model: options.model || 'gemini-2.0-flash'
    });
    
    const chat = model.startChat({
      history: this.convertHistory(messages),
      tools: this.formatTools(options.tools)
    });
    
    const result = await chat.sendMessageStream(
      messages[messages.length - 1].content
    );
    
    for await (const chunk of result.stream) {
      yield this.normalizeChunk(chunk);
    }
  }
}
```

### Model Selection Logic

```typescript
function selectProvider(config: Config): LLMProvider {
  // 1. Check explicit provider setting
  if (config.provider) {
    return getProvider(config.provider);
  }
  
  // 2. Check available API keys
  const available = [];
  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
  if (process.env.OPENAI_API_KEY) available.push('openai');
  if (process.env.GOOGLE_API_KEY) available.push('gemini');
  
  if (available.length === 0) {
    throw new Error('No API keys configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY');
  }
  
  // 3. Use default priority: Anthropic > OpenAI > Gemini
  return getProvider(available[0]);
}
```

---

## Tool System

### Available Tools

| Tool | Description | Permission |
|------|-------------|------------|
| `read_file` | Read contents of a file | Auto |
| `write_file` | Create or overwrite a file | Prompt |
| `edit_file` | Make targeted edits (search/replace) | Prompt |
| `list_directory` | List files in a directory | Auto |
| `search_files` | Search for files by glob pattern | Auto |
| `search_content` | Search file contents (grep) | Auto |
| `run_command` | Execute shell commands | Prompt |
| `fetch_url` | Fetch web content | Auto |
| `git_status` | Get git repository status | Auto |
| `git_diff` | Show git diff | Auto |

### Tool Definition Schema

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  permission: 'auto' | 'prompt' | 'deny';
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

// Example: read_file tool
const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file at the specified path',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read'
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64'],
        default: 'utf-8'
      }
    },
    required: ['path']
  },
  permission: 'auto',
  execute: async ({ path, encoding }) => {
    const content = await fs.readFile(path, encoding);
    return { success: true, content };
  }
};
```

### Tool Execution Flow

```
┌──────────────────┐
│ LLM Response     │
│ with tool_call   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Parse Tool Call  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Check Permission │────▶│ User Prompt      │
│                  │ Yes │ [Y/n/edit/skip]  │
└────────┬─────────┘     └────────┬─────────┘
         │ Auto                   │
         ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│ Execute Tool     │◀────│ Approved?        │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│ Return Result    │
│ to LLM           │
└──────────────────┘
```

---

## Configuration

### Config File Location

```
~/.config/manu-code/config.toml    # Linux/macOS
%APPDATA%\manu-code\config.toml    # Windows
```

### Configuration Schema

```toml
# ~/.config/manu-code/config.toml

[provider]
# Default provider: "anthropic" | "openai" | "gemini"
default = "anthropic"

# Provider-specific settings
[provider.anthropic]
model = "claude-sonnet-4-20250514"
max_tokens = 8192

[provider.openai]
model = "gpt-4o"
max_tokens = 8192

[provider.gemini]
model = "gemini-2.0-flash"
max_tokens = 8192

[context]
# Maximum tokens for context window
max_context_tokens = 100000

# Files to always include in context
always_include = [
  "README.md",
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "go.mod"
]

# Patterns to ignore when indexing
ignore_patterns = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
  "*.lock",
  "*.min.js"
]

[permissions]
# Auto-approve read operations
auto_approve_reads = true

# Commands that don't require confirmation
safe_commands = [
  "ls", "cat", "head", "tail", "grep", "find",
  "pwd", "echo", "which", "whoami", "date",
  "git status", "git log", "git diff", "git branch"
]

# Enable YOLO mode (auto-approve everything)
yolo_mode = false

[ui]
# Color theme: "dark" | "light" | "auto"
theme = "dark"

# Show token usage after each response
show_token_usage = true

# Show estimated cost
show_cost_estimate = true

# Enable streaming output
stream_output = true

[history]
# Save conversation history
enabled = true

# History file location
path = "~/.config/manu-code/history"

# Maximum history entries
max_entries = 1000

[session]
# Auto-save sessions
auto_save = true

# Session storage location
path = "~/.config/manu-code/sessions"
```

---

## CLI Commands

### Invocation

```bash
# Start interactive mode
manu

# Start with a prompt
manu "create a REST API server"

# Specify provider
manu --provider openai "write a fibonacci function"

# Specify model
manu --model gpt-4-turbo "explain this code"

# Execute single command and exit
manu -c "what files are in this project?"

# Resume last session
manu --resume

# Load specific session
manu --session <session-id>
```

### Flags and Options

| Flag | Short | Description |
|------|-------|-------------|
| `--provider` | `-p` | LLM provider (anthropic/openai/gemini) |
| `--model` | `-m` | Model to use |
| `--command` | `-c` | Run single command and exit |
| `--resume` | `-r` | Resume last session |
| `--session` | `-s` | Load specific session |
| `--yolo` | `-y` | Auto-approve all tool calls |
| `--no-stream` | | Disable streaming output |
| `--config` | | Path to config file |
| `--verbose` | `-v` | Verbose output |
| `--version` | `-V` | Show version |
| `--help` | `-h` | Show help |

### Interactive Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear conversation history |
| `/config` | Show/edit configuration |
| `/model [name]` | Switch model |
| `/provider [name]` | Switch provider |
| `/session` | Session management |
| `/history` | Show conversation history |
| `/undo` | Undo last file change |
| `/cost` | Show session cost |
| `/compact` | Compact context (summarize) |
| `/exit` | Exit manu code |

---

## Data Flow

### Request Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            REQUEST LIFECYCLE                              │
└──────────────────────────────────────────────────────────────────────────┘

User Input: "add input validation to user.ts"
                    │
                    ▼
┌─────────────────────────────────────┐
│ 1. INPUT PROCESSING                 │
│    • Parse input                    │
│    • Check for slash commands       │
│    • Add to message history         │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ 2. CONTEXT GATHERING                │
│    • Load project index             │
│    • Select relevant files          │
│    • Build system prompt            │
│    • Calculate token budget         │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ 3. LLM REQUEST                      │
│    • Select provider/model          │
│    • Format messages                 │
│    • Attach tool definitions        │
│    • Send streaming request         │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ 4. RESPONSE PROCESSING              │
│    • Stream text to terminal        │
│    • Parse tool calls               │
│    • Request permissions            │
│    • Execute tools                  │
│    • Loop if more tool calls        │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ 5. COMPLETION                       │
│    • Update history                 │
│    • Save session                   │
│    • Display stats (tokens, cost)   │
│    • Return to prompt               │
└─────────────────────────────────────┘
```

### Agentic Loop

```typescript
async function agenticLoop(userMessage: string): Promise<void> {
  const messages = conversationHistory.getMessages();
  messages.push({ role: 'user', content: userMessage });
  
  let continueLoop = true;
  
  while (continueLoop) {
    // Stream response from LLM
    const response = await llm.chat(messages, {
      tools: toolSystem.getTools(),
      stream: true
    });
    
    let assistantMessage = { role: 'assistant', content: '', toolCalls: [] };
    
    for await (const chunk of response) {
      if (chunk.type === 'text') {
        display.streamText(chunk.text);
        assistantMessage.content += chunk.text;
      } else if (chunk.type === 'tool_call') {
        assistantMessage.toolCalls.push(chunk.toolCall);
      }
    }
    
    messages.push(assistantMessage);
    
    // Handle tool calls
    if (assistantMessage.toolCalls.length > 0) {
      for (const toolCall of assistantMessage.toolCalls) {
        const approved = await permissions.check(toolCall);
        
        if (approved) {
          const result = await toolSystem.execute(toolCall);
          messages.push({
            role: 'tool',
            toolResults: [{ id: toolCall.id, output: result }]
          });
        } else {
          messages.push({
            role: 'tool',
            toolResults: [{ id: toolCall.id, output: 'Tool execution skipped by user', isError: true }]
          });
        }
      }
    } else {
      continueLoop = false;
    }
  }
  
  conversationHistory.save(messages);
}
```

---

## Security & Permissions

### Permission Model

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION LEVELS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AUTO          │  No confirmation needed                    │
│  ─────────────────────────────────────────────────────────  │
│  • read_file                                                │
│  • list_directory                                           │
│  • search_files                                             │
│  • search_content                                           │
│  • git_status, git_diff                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PROMPT        │  Requires user confirmation                │
│  ─────────────────────────────────────────────────────────  │
│  • write_file                                               │
│  • edit_file                                                │
│  • run_command (unless in safe_commands)                    │
│  • delete_file                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DENY          │  Never allowed                             │
│  ─────────────────────────────────────────────────────────  │
│  • Custom blocklist                                         │
│  • Dangerous patterns (rm -rf /, etc.)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Permission Prompt UI

```
┌─────────────────────────────────────────────────────────────┐
│ 🔐 Permission Required                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tool:     write_file                                       │
│  Path:     src/validators/user.ts                           │
│  Action:   Create new file (47 lines)                       │
│                                                             │
│  Preview:                                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ import { z } from 'zod';                               │ │
│  │                                                        │ │
│  │ export const userSchema = z.object({                   │ │
│  │   email: z.string().email(),                           │ │
│  │   password: z.string().min(8),                         │ │
│  │   ...                                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [Y]es  [n]o  [e]dit  [v]iew full  [a]lways  [s]kip        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dangerous Command Detection

```typescript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf?\s+[\/~]/,           // rm -rf / or ~
  />\s*\/dev\/sd[a-z]/,          // Write to disk devices
  /mkfs\./,                       // Format filesystems
  /dd\s+if=.*of=\/dev/,          // dd to devices
  /chmod\s+-R\s+777/,            // Overly permissive chmod
  /:(){ :|:& };:/,               // Fork bomb
  /curl.*\|\s*bash/,             // Pipe curl to bash
  /wget.*\|\s*bash/,             // Pipe wget to bash
];

function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Project scaffolding and build setup
- [ ] Basic CLI with REPL
- [ ] Single provider integration (Anthropic)
- [ ] Streaming output
- [ ] Basic tools: read_file, write_file, list_directory
- [ ] Simple permission system
- [ ] Colorful welcome display

### Phase 2: Multi-Provider (Week 3)

- [ ] OpenAI adapter
- [ ] Gemini adapter
- [ ] Provider abstraction layer
- [ ] Dynamic provider switching
- [ ] Model selection

### Phase 3: Context Awareness (Week 4-5)

- [ ] Project detection
- [ ] File indexing with gitignore support
- [ ] Smart context selection
- [ ] Token counting per provider
- [ ] Context window optimization

### Phase 4: Advanced Tools (Week 6)

- [ ] edit_file (surgical edits)
- [ ] search_content (grep)
- [ ] run_command with safe command list
- [ ] git integration
- [ ] web fetch

### Phase 5: Polish (Week 7-8)

- [ ] Session persistence
- [ ] Conversation history
- [ ] Undo/rollback
- [ ] Cost tracking
- [ ] Keyboard shortcuts
- [ ] Tab completion
- [ ] Testing and bug fixes

---

## Tech Stack

### Recommended: TypeScript/Node.js

| Component | Library |
|-----------|---------|
| CLI Framework | `commander` + `inquirer` |
| Terminal UI | `ink` (React for CLI) or `blessed` |
| Syntax Highlighting | `highlight.js` or `prism` |
| Markdown Rendering | `marked` + `marked-terminal` |
| Anthropic SDK | `@anthropic-ai/sdk` |
| OpenAI SDK | `openai` |
| Gemini SDK | `@google/generative-ai` |
| Config | `cosmiconfig` |
| File Watching | `chokidar` |
| Git Operations | `simple-git` |
| Spinner | `ora` |
| Colors | `chalk` |

### Alternative: Rust

| Component | Library |
|-----------|---------|
| CLI Framework | `clap` |
| Terminal UI | `ratatui` |
| Async Runtime | `tokio` |
| HTTP Client | `reqwest` |
| Syntax Highlighting | `syntect` |
| Config | `config` |
| Colors | `colored` |
| Spinner | `indicatif` |

---

## File Structure

```
manu-code/
├── src/
│   ├── index.ts                 # Entry point
│   ├── cli/
│   │   ├── repl.ts              # REPL implementation
│   │   ├── commands.ts          # Slash commands
│   │   ├── display.ts           # Output formatting
│   │   └── welcome.ts           # Welcome screen
│   ├── providers/
│   │   ├── index.ts             # Provider router
│   │   ├── base.ts              # Abstract provider
│   │   ├── anthropic.ts         # Anthropic adapter
│   │   ├── openai.ts            # OpenAI adapter
│   │   └── gemini.ts            # Gemini adapter
│   ├── tools/
│   │   ├── index.ts             # Tool registry
│   │   ├── file-ops.ts          # File operations
│   │   ├── shell.ts             # Shell execution
│   │   ├── search.ts            # Search tools
│   │   └── git.ts               # Git operations
│   ├── context/
│   │   ├── index.ts             # Context manager
│   │   ├── indexer.ts           # Project indexer
│   │   └── selector.ts          # Smart file selection
│   ├── permissions/
│   │   ├── index.ts             # Permission system
│   │   └── prompts.ts           # Permission UI
│   ├── session/
│   │   ├── history.ts           # Conversation history
│   │   └── persistence.ts       # Session save/load
│   ├── config/
│   │   ├── index.ts             # Config loader
│   │   └── schema.ts            # Config validation
│   └── utils/
│       ├── tokens.ts            # Token counting
│       ├── logger.ts            # Logging
│       └── errors.ts            # Error handling
├── bin/
│   └── manu                     # CLI executable
├── tests/
│   └── ...
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Reference

### Provider Interface

```typescript
interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
  systemPrompt?: string;
}

interface StreamChunk {
  type: 'text' | 'tool_call' | 'error' | 'done';
  text?: string;
  toolCall?: ToolCall;
  error?: Error;
  usage?: TokenUsage;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
```

### Tool Interface

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  permission: PermissionLevel;
  execute(params: any, context: ToolContext): Promise<ToolResult>;
}

interface ToolContext {
  cwd: string;
  projectRoot: string;
  config: Config;
}

interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  artifacts?: Artifact[];
}
```

### Config Interface

```typescript
interface Config {
  provider: {
    default: 'anthropic' | 'openai' | 'gemini';
    anthropic?: ProviderConfig;
    openai?: ProviderConfig;
    gemini?: ProviderConfig;
  };
  context: {
    maxContextTokens: number;
    alwaysInclude: string[];
    ignorePatterns: string[];
  };
  permissions: {
    autoApproveReads: boolean;
    safeCommands: string[];
    yoloMode: boolean;
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    showTokenUsage: boolean;
    showCostEstimate: boolean;
    streamOutput: boolean;
  };
  history: {
    enabled: boolean;
    path: string;
    maxEntries: number;
  };
  session: {
    autoSave: boolean;
    path: string;
  };
}
```

---

## Cost Estimation

### Model Pricing (as of 2024)

| Provider | Model | Input (per 1M tokens) | Output (per 1M tokens) |
|----------|-------|----------------------|------------------------|
| Anthropic | claude-sonnet-4-20250514 | $3.00 | $15.00 |
| Anthropic | claude-opus-4-20250514 | $15.00 | $75.00 |
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| Google | gemini-2.0-flash | $0.075 | $0.30 |
| Google | gemini-1.5-pro | $1.25 | $5.00 |

### Cost Display

```
┌─────────────────────────────────────────┐
│ 📊 Session Stats                        │
├─────────────────────────────────────────┤
│ Provider:      Anthropic                │
│ Model:         claude-sonnet-4-20250514        │
│                                         │
│ Input tokens:  12,450                   │
│ Output tokens: 3,280                    │
│ Total tokens:  15,730                   │
│                                         │
│ Estimated cost: $0.086                  │
└─────────────────────────────────────────┘
```

---

## Appendix: Color Codes

### ANSI Color Reference

```typescript
const colors = {
  // Standard colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Formatting
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  reset: '\x1b[0m',
  
  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};
```

---

*Manu Code Specification v1.0 - Last Updated: December 2024*
