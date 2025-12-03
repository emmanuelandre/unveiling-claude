# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Manu Code** is an AI-powered CLI code generation assistant that helps developers write, edit, and manage code through natural language conversations. It supports multiple LLM providers (OpenAI, Anthropic, Google Gemini).

This repository is currently in the specification phase. The main specification document is located at `manu-code/manu-code-specs.md`.

## Architecture

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   CLI Layer   │───▶│  Core Engine  │───▶│  LLM Router   │
│ • REPL        │    │ • Context Mgr │    │ • Anthropic   │
│ • Input Parse │    │ • Tool Exec   │    │ • OpenAI      │
│ • Output Fmt  │    │ • Session Mgr │    │ • Gemini      │
└───────────────┘    └───────────────┘    └───────────────┘
                            │
                            ▼
        ┌─────────────────────────────────────────┐
        │              Tool System                 │
        │  File Ops │ Shell │ Search │ Web │ Git  │
        └─────────────────────────────────────────┘
```

### Key Components (when implemented)

- **CLI Layer**: REPL, input parsing, syntax highlighting, progress indicators
- **Core Engine**: Message history, context optimization, token budgeting, tool orchestration
- **LLM Router**: Multi-provider abstraction, API key management, model selection, fallback handling
- **Tool System**: File operations, shell execution, search, web fetch, git operations

## Tech Stack (Recommended)

TypeScript/Node.js with:
- CLI: `commander` + `inquirer`
- Terminal UI: `ink` or `blessed`
- LLM SDKs: `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`
- Syntax highlighting: `highlight.js` or `prism`
- Config: `cosmiconfig`
- Git: `simple-git`

## Planned File Structure

```
manu-code/
├── src/
│   ├── index.ts                 # Entry point
│   ├── cli/                     # REPL, commands, display
│   ├── providers/               # LLM adapters (Anthropic, OpenAI, Gemini)
│   ├── tools/                   # File ops, shell, search, git
│   ├── context/                 # Project indexer, smart context selection
│   ├── permissions/             # Permission system and prompts
│   ├── session/                 # History and persistence
│   └── config/                  # Config loader and schema
├── bin/manu                     # CLI executable
├── tests/
├── package.json
└── tsconfig.json
```

## Environment Variables

```bash
# API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Optional: Default provider
MANU_DEFAULT_PROVIDER=anthropic
```

## Implementation Phases

1. **Foundation**: CLI scaffolding, REPL, single provider (Anthropic), basic tools
2. **Multi-Provider**: OpenAI/Gemini adapters, provider abstraction, dynamic switching
3. **Context Awareness**: Project detection, file indexing, smart context selection
4. **Advanced Tools**: Edit files, search content, shell commands, git integration
5. **Polish**: Session persistence, undo/rollback, cost tracking, keyboard shortcuts

## Permission Model

- **Auto**: read_file, list_directory, search_files, git_status (no confirmation)
- **Prompt**: write_file, edit_file, run_command, delete_file (requires confirmation)
- **Deny**: Dangerous commands (rm -rf /, fork bombs, pipe to bash, etc.)

## Documentation

When writing documentation, follow the guidelines in `documentation-guide.md`.

## Reference

Full specification: `manu-code/manu-code-specs.md`
