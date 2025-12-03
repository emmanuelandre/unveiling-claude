# UI-to-Test Implementation Plan

## Overview

Implementation is organized into four phases, each building on the previous. The total estimated scope covers the full feature set from basic recording to polished test generation.

## Phase Summary

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| [Phase 1](plan/phase-1.md) | Foundation | CLI, Playwright setup, basic recording |
| [Phase 2](plan/phase-2.md) | API Capture | Network interception, correlation engine |
| [Phase 3](plan/phase-3.md) | Test Generation | BDD output, step definitions, fixtures |
| [Phase 4](plan/phase-4.md) | Polish | Configurable modes, quality scoring |

## Phase 1: Foundation

**Goal**: Create a working CLI that can record basic UI interactions.

### Deliverables

- [ ] Project scaffolding (TypeScript, ESLint, Vitest)
- [ ] CLI with `record`, `init` commands
- [ ] Playwright browser launch
- [ ] UI event capture (click, type, select)
- [ ] Session storage (JSON)
- [ ] Terminal display (progress, status)

### Key Components

```
src/
├── cli/
│   ├── index.ts           # CLI setup
│   └── commands/record.ts # Record command
├── recorder/
│   ├── index.ts           # Recorder orchestration
│   └── ui-capture.ts      # Event capture
└── session/
    └── storage.ts         # Session persistence
```

### Success Criteria

- `ui2test record <url>` opens browser
- Click/type/select interactions captured
- Session saved to JSON file

---

## Phase 2: API Capture

**Goal**: Capture and correlate API calls with UI interactions.

### Deliverables

- [ ] Network interception via Playwright
- [ ] Request/response capture
- [ ] URL pattern generation
- [ ] Timing-based correlation
- [ ] Content-based correlation
- [ ] Correlation confidence scoring

### Key Components

```
src/
├── recorder/
│   └── network-capture.ts   # Network interception
├── parser/
│   └── api-parser.ts        # API call parsing
└── correlation/
    ├── index.ts             # Correlator
    └── strategies/
        ├── timing.ts        # Timing strategy
        └── content.ts       # Content strategy
```

### Success Criteria

- All XHR/Fetch requests captured
- API calls linked to triggering UI actions
- Correlation confidence scores calculated

---

## Phase 3: Test Generation

**Goal**: Generate Cypress BDD tests from recorded sessions.

### Deliverables

- [ ] Selector optimization (priority strategies)
- [ ] Gherkin feature file generation
- [ ] Step definition generation
- [ ] Fixture file generation
- [ ] API intercept generation
- [ ] Assertion inference

### Key Components

```
src/
├── generator/
│   ├── index.ts              # Generator orchestration
│   ├── test-case-builder.ts  # Build test cases
│   └── assertion-inference.ts # Infer assertions
└── adapters/
    └── cypress-cucumber/
        ├── feature-writer.ts  # .feature files
        └── step-writer.ts     # .steps.ts files
```

### Success Criteria

- Valid Gherkin feature files generated
- Step definitions work with cypress-cucumber-preprocessor
- Fixtures contain captured API responses
- Generated tests pass on stable apps

---

## Phase 4: Polish

**Goal**: Add configurable modes, quality features, and polish.

### Deliverables

- [ ] API mocking modes (stubbed/live/hybrid)
- [ ] Test quality scoring
- [ ] Selector stability warnings
- [ ] Edge case handlers (SPA, polling, auth)
- [ ] Configuration file support
- [ ] Error recovery
- [ ] Documentation

### Key Components

```
src/
├── config/
│   ├── index.ts           # Config loader
│   └── schema.ts          # Config validation
├── recorder/
│   └── edge-cases.ts      # Edge case handlers
└── generator/
    └── quality-scorer.ts  # Quality analysis
```

### Success Criteria

- All three API modes working
- Quality report with actionable recommendations
- Config file fully supported
- Edge cases handled gracefully

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION DEPENDENCIES                          │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1                    Phase 2                    Phase 3
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ CLI Setup     │────────▶│ API Capture   │────────▶│ Generator     │
└───────────────┘         └───────────────┘         └───────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ UI Capture    │────────▶│ Correlator    │────────▶│ Adapters      │
└───────────────┘         └───────────────┘         └───────────────┘
        │                         │                         │
        ▼                         │                         ▼
┌───────────────┐                 │                 ┌───────────────┐
│ Session Store │◀────────────────┘                 │ Fixtures      │
└───────────────┘                                   └───────────────┘

                               Phase 4
                         ┌───────────────┐
                         │ Config System │
                         └───────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
             ┌───────────────┐       ┌───────────────┐
             │ API Modes     │       │ Quality Score │
             └───────────────┘       └───────────────┘
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Flaky selectors | Multi-strategy selector generation with fallbacks |
| API correlation accuracy | Multiple correlation strategies with confidence scoring |
| SPA complexity | Edge case handlers for common SPA patterns |
| Browser differences | Focus on Chromium, document browser-specific issues |
| Generated test failures | Quality scoring to highlight potential issues |

## Tech Stack Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Node.js 18+ | ESM support, modern features |
| Language | TypeScript | Type safety, better tooling |
| Browser | Playwright | Best network interception, multi-browser |
| CLI | commander | Industry standard, simple API |
| Config | cosmiconfig | Flexible config file support |
| Test output | Cypress + Cucumber | BDD requirement, popular framework |
| Validation | zod | Runtime type checking |

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| Commands working | 2 | 2 | 3 | 4 |
| Event types captured | 5 | 5 | 5 | 8 |
| API capture | - | Full | Full | Full |
| Correlation accuracy | - | >80% | >85% | >90% |
| Test generation | - | - | Basic | Full |
| Config support | - | - | Partial | Full |
| Quality scoring | - | - | - | Full |
