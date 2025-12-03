# UI-to-Test Documentation Hub

> CLI tool for recording UI interactions and generating Cypress BDD/Cucumber tests

## Quick Navigation

| Document | Description |
|----------|-------------|
| [README](README.md) | Documentation folder guide |
| [Requirements](requirements.md) | Product requirements and core features |
| [Architecture](architecture.md) | System architecture overview |
| [UI Specifications](ui-specs.md) | CLI commands and interface design |
| [Implementation Plan](plan.md) | Phased roadmap summary |

## Architecture Deep Dives

| Document | Description |
|----------|-------------|
| [Recorder](architecture/recorder.md) | Playwright recording engine and event capture |
| [Correlator](architecture/correlator.md) | UI-to-API correlation engine |
| [Generator](architecture/generator.md) | BDD test generation system |
| [Adapters](architecture/adapters.md) | Test framework adapters and extensibility |

## Implementation Phases

| Phase | Focus | Details |
|-------|-------|---------|
| [Phase 1](plan/phase-1.md) | Foundation | CLI, Playwright setup, basic recording |
| [Phase 2](plan/phase-2.md) | API Capture | Network interception, correlation engine |
| [Phase 3](plan/phase-3.md) | Test Generation | BDD output, step definitions, fixtures |
| [Phase 4](plan/phase-4.md) | Polish | Configurable modes, quality scoring |

## Project Overview

**UI-to-Test** is a developer productivity tool that automates the creation of end-to-end tests by:

1. **Recording** user interactions in a Playwright-controlled browser
2. **Capturing** API calls via network interception during the recording session
3. **Correlating** UI actions with their resulting API requests
4. **Generating** Cypress BDD/Cucumber test suites with configurable API mocking

### Key Features

- **Zero-config recording**: Just point at a URL and start interacting
- **Smart selectors**: Prioritizes stable selectors (data-testid > ARIA > CSS)
- **API-aware tests**: Captures and correlates network requests with UI actions
- **BDD output**: Human-readable Gherkin feature files with step definitions
- **Configurable mocking**: Stubbed, live, or hybrid API modes

### Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI-TO-TEST WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  [1] RECORD                [2] INTERACT               [3] GENERATE
       │                         │                          │
       ▼                         ▼                          ▼
 ┌───────────┐           ┌───────────────┐          ┌───────────────┐
 │ ui2test   │           │ Browser opens │          │ Cypress tests │
 │ record    │──────────▶│ User clicks,  │─────────▶│ generated     │
 │ <url>     │           │ types, waits  │          │ automatically │
 └───────────┘           └───────────────┘          └───────────────┘
                               │
                               │ ● UI events captured
                               │ ● API calls logged
                               │ ● Correlations mapped
                               ▼
                        ┌───────────────┐
                        │ session.json  │
                        │ (intermediate)│
                        └───────────────┘
```

## Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| CLI | commander + inquirer | Command-line interface |
| Browser | playwright | Recording and network interception |
| Terminal UI | chalk + ora | Colored output and spinners |
| Config | cosmiconfig | Configuration file support |
| Validation | zod | Schema validation |
| Test Output | Cypress + @badeball/cypress-cucumber-preprocessor | BDD test format |

## Quick Start

```bash
# Install
npm install -g ui2test

# Record a session
ui2test record https://myapp.com

# Browser opens, interact with the app, close when done
# Tests are generated in ./cypress/e2e/
```

## Output Structure

```
cypress/
├── e2e/
│   └── features/
│       └── recorded-flow.feature      # BDD feature file
├── support/
│   └── step_definitions/
│       └── recorded-flow.steps.ts     # Step definitions
└── fixtures/
    └── api/
        └── responses.json             # Captured API responses
```
