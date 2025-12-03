# UI-to-Test Architecture

## Overview

UI-to-Test follows a layered architecture with clear separation of concerns. Data flows through five main stages: CLI → Recorder → Parser → Correlator → Generator.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UI-TO-TEST CLI                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐               │
│  │   CLI Layer   │───▶│    Recorder   │───▶│    Parser     │               │
│  │               │    │               │    │               │               │
│  │ • Commands    │    │ • Playwright  │    │ • UI Events   │               │
│  │ • Config      │    │ • Network     │    │ • API Calls   │               │
│  │ • Display     │    │ • Screenshots │    │ • Selectors   │               │
│  └───────────────┘    └───────────────┘    └───────────────┘               │
│           │                                        │                        │
│           │                                        ▼                        │
│           │                               ┌───────────────┐                 │
│           │                               │  Correlator   │                 │
│           │                               │               │                 │
│           │                               │ • Timing      │                 │
│           │                               │ • Content     │                 │
│           │                               │ • Causality   │                 │
│           │                               └───────────────┘                 │
│           │                                        │                        │
│           ▼                                        ▼                        │
│  ┌───────────────┐                        ┌───────────────┐                 │
│  │    Session    │◀───────────────────────│   Generator   │                 │
│  │    Store      │                        │               │                 │
│  │               │                        │ • Features    │                 │
│  │ • JSON files  │                        │ • Steps       │                 │
│  │ • Metadata    │                        │ • Fixtures    │                 │
│  └───────────────┘                        └───────────────┘                 │
│                                                   │                         │
│                                                   ▼                         │
│                                           ┌───────────────┐                 │
│                                           │   Adapters    │                 │
│                                           │               │                 │
│                                           │ • Cypress+BDD │                 │
│                                           │ • Playwright  │                 │
│                                           │ • (Future)    │                 │
│                                           └───────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Overview

| Component | Responsibility | Key Files |
|-----------|----------------|-----------|
| **CLI Layer** | Command parsing, configuration, terminal output | `src/cli/` |
| **Recorder** | Browser control, event capture, network interception | `src/recorder/` |
| **Parser** | Transform raw events into structured data | `src/parser/` |
| **Correlator** | Link UI actions to API calls | `src/correlation/` |
| **Generator** | Create test code from correlated data | `src/generator/` |
| **Adapters** | Framework-specific output (Cypress, etc.) | `src/adapters/` |
| **Session Store** | Persist and load recording sessions | `src/session/` |

## Data Flow

### Recording Phase

```
User Interaction in Browser
           │
           ▼
┌──────────────────────────────────────┐
│          Playwright Page              │
│                                       │
│  page.on('click')  ──▶ UI Event      │
│  page.on('input')  ──▶ UI Event      │
│  context.route()   ──▶ API Call      │
│                                       │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│           Raw Event Stream            │
│                                       │
│  { type: 'click', timestamp, el }    │
│  { type: 'request', url, method }    │
│  { type: 'response', status, body }  │
│                                       │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│              Parser                   │
│                                       │
│  Raw Event ──▶ UIInteraction         │
│  Raw Event ──▶ APICall               │
│  Element   ──▶ ElementSelector       │
│                                       │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│         Recording Session             │
│                                       │
│  { interactions: [...],              │
│    apiCalls: [...],                  │
│    metadata: {...} }                 │
│                                       │
└──────────────────────────────────────┘
```

### Correlation Phase

```
Recording Session
       │
       ├── interactions: UIInteraction[]
       │
       └── apiCalls: APICall[]
               │
               ▼
┌──────────────────────────────────────┐
│           Correlator                  │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │    Timing Strategy               │ │
│  │    API call within Nms of UI    │ │
│  └─────────────────────────────────┘ │
│                 │                     │
│  ┌─────────────────────────────────┐ │
│  │    Content Strategy              │ │
│  │    Form data → Request body     │ │
│  └─────────────────────────────────┘ │
│                 │                     │
│  ┌─────────────────────────────────┐ │
│  │    Sequence Strategy             │ │
│  │    Click → Navigation → API     │ │
│  └─────────────────────────────────┘ │
│                                       │
└──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│     InteractionAPICorrelation[]       │
│                                       │
│  { interactionId: 'ui_001',          │
│    apiCallIds: ['api_001'],          │
│    confidence: 0.95,                 │
│    correlationType: 'form_submit' }  │
│                                       │
└──────────────────────────────────────┘
```

### Generation Phase

```
Correlated Session
       │
       ├── interactions
       ├── apiCalls
       └── correlations
               │
               ▼
┌──────────────────────────────────────┐
│          Test Case Builder            │
│                                       │
│  Correlation ──▶ TestCase            │
│  TestCase    ──▶ TestStep[]          │
│  APICall     ──▶ APIMock             │
│                                       │
└──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│            Adapter                    │
│    (Cypress + Cucumber)               │
│                                       │
│  TestCase ──▶ login.feature          │
│  TestCase ──▶ login.steps.ts         │
│  APIMock  ──▶ fixtures/login.json    │
│                                       │
└──────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         Generated Files               │
│                                       │
│  cypress/e2e/features/login.feature  │
│  cypress/support/step_definitions/   │
│  cypress/fixtures/api/               │
│                                       │
└──────────────────────────────────────┘
```

## Core Data Models

### Recording Session

```typescript
interface RecordingSession {
  // Metadata
  id: string;
  name: string;
  url: string;
  startedAt: Date;
  endedAt: Date;

  // Browser info
  browser: {
    type: 'chromium' | 'firefox' | 'webkit';
    viewport: { width: number; height: number };
  };

  // Captured data
  interactions: UIInteraction[];
  apiCalls: APICall[];
  correlations: InteractionAPICorrelation[];
}
```

### UI Interaction

```typescript
interface UIInteraction {
  id: string;
  type: InteractionType;
  timestamp: Date;

  // Element targeting
  target: ElementSelector;

  // Interaction data
  data: InteractionData;

  // Context
  url: string;
  pageTitle: string;
}

type InteractionType =
  | 'click'
  | 'type'
  | 'select'
  | 'navigation'
  | 'scroll'
  | 'hover'
  | 'upload';

interface ElementSelector {
  // Multiple strategies for resilience
  dataTestId?: string;
  ariaLabel?: string;
  role?: string;
  id?: string;
  css: string;
  xpath?: string;
  text?: string;

  // Element metadata
  tagName: string;
  isVisible: boolean;
}
```

### API Call

```typescript
interface APICall {
  id: string;
  timestamp: Date;

  request: {
    method: HTTPMethod;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
  };

  response: {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
    duration: number;
  };

  // Classification
  classification: {
    type: 'data_fetch' | 'mutation' | 'auth' | 'static';
    isPrimary: boolean;
  };
}
```

### Correlation

```typescript
interface InteractionAPICorrelation {
  id: string;
  interactionId: string;
  apiCallIds: string[];

  correlationType: CorrelationType;
  confidence: number;  // 0-1

  evidence: {
    type: 'timing' | 'content' | 'sequence';
    description: string;
    weight: number;
  }[];
}

type CorrelationType =
  | 'direct'       // Click → API
  | 'form_submit'  // Form → API
  | 'navigation'   // Navigate → APIs
  | 'debounced'    // Type → Delayed API
  | 'polling';     // Background API
```

### Test Case

```typescript
interface TestCase {
  id: string;
  feature: string;
  scenario: string;
  tags: string[];

  steps: TestStep[];
  apiMocks: APIMock[];
  fixtures: Fixture[];
}

interface TestStep {
  stepType: 'given' | 'when' | 'then' | 'and';
  description: string;
  action: TestAction;
  assertions?: Assertion[];
}

interface APIMock {
  alias: string;
  method: HTTPMethod;
  urlPattern: string;
  response: {
    statusCode: number;
    body: unknown;
  };
}
```

## Key Interfaces

### Recorder Interface

```typescript
interface Recorder {
  start(url: string, options: RecordOptions): Promise<void>;
  stop(): Promise<RecordingSession>;
  pause(): void;
  resume(): void;

  // Event streams
  onInteraction(handler: (interaction: UIInteraction) => void): void;
  onAPICall(handler: (call: APICall) => void): void;
}
```

### Correlator Interface

```typescript
interface Correlator {
  correlate(
    interactions: UIInteraction[],
    apiCalls: APICall[]
  ): InteractionAPICorrelation[];

  // Strategy management
  addStrategy(strategy: CorrelationStrategy): void;
  setConfig(config: CorrelationConfig): void;
}

interface CorrelationStrategy {
  name: string;
  evaluate(
    interaction: UIInteraction,
    candidates: APICall[]
  ): CorrelationEvidence[];
}
```

### Generator Interface

```typescript
interface TestGenerator {
  generate(
    session: RecordingSession,
    options: GeneratorOptions
  ): GeneratedOutput;
}

interface GeneratedOutput {
  files: GeneratedFile[];
  summary: GenerationSummary;
}

interface GeneratedFile {
  path: string;
  content: string;
  type: 'feature' | 'step_definition' | 'fixture' | 'support';
}
```

### Adapter Interface

```typescript
interface TestFrameworkAdapter {
  readonly name: string;
  readonly fileExtension: string;

  generateFeatureFile(testCase: TestCase): string;
  generateStepDefinitions(testCases: TestCase[]): string;
  generateFixtures(apiMocks: APIMock[]): GeneratedFile[];
  generateSupportFiles(): GeneratedFile[];
}
```

## File Structure

```
ui-to-test/
├── src/
│   ├── index.ts                    # Entry point
│   ├── types/
│   │   ├── index.ts                # Type exports
│   │   ├── recording.ts            # Recording types
│   │   ├── interaction.ts          # UI interaction types
│   │   ├── api-call.ts             # API call types
│   │   ├── correlation.ts          # Correlation types
│   │   └── test-case.ts            # Test case types
│   ├── cli/
│   │   ├── index.ts                # CLI setup
│   │   ├── commands/
│   │   │   ├── record.ts           # Record command
│   │   │   ├── generate.ts         # Generate command
│   │   │   └── init.ts             # Init command
│   │   └── display.ts              # Terminal output
│   ├── recorder/
│   │   ├── index.ts                # Recorder orchestration
│   │   ├── playwright-adapter.ts   # Browser control
│   │   ├── ui-capture.ts           # UI event capture
│   │   ├── network-capture.ts      # Network interception
│   │   └── selector-generator.ts   # Selector strategies
│   ├── parser/
│   │   ├── index.ts                # Parser orchestration
│   │   ├── ui-parser.ts            # UI event parsing
│   │   └── api-parser.ts           # API call parsing
│   ├── correlation/
│   │   ├── index.ts                # Correlator
│   │   └── strategies/
│   │       ├── timing.ts           # Timing correlation
│   │       ├── content.ts          # Content correlation
│   │       └── sequence.ts         # Sequence correlation
│   ├── generator/
│   │   ├── index.ts                # Generator orchestration
│   │   ├── test-case-builder.ts    # Build test cases
│   │   ├── assertion-inference.ts  # Infer assertions
│   │   └── selector-optimizer.ts   # Choose best selectors
│   ├── adapters/
│   │   ├── index.ts                # Adapter registry
│   │   ├── base-adapter.ts         # Base adapter class
│   │   └── cypress-cucumber/
│   │       ├── index.ts            # Cypress+BDD adapter
│   │       ├── feature-writer.ts   # Feature file generation
│   │       └── step-writer.ts      # Step definition generation
│   ├── session/
│   │   ├── index.ts                # Session management
│   │   └── storage.ts              # File storage
│   └── config/
│       ├── index.ts                # Config loader
│       └── schema.ts               # Config validation
├── bin/
│   └── ui2test                     # CLI executable
├── package.json
└── tsconfig.json
```

## Deep Dive Documents

For detailed specifications on each component:

- [Recorder](architecture/recorder.md) - Playwright integration and event capture
- [Correlator](architecture/correlator.md) - UI-API correlation strategies
- [Generator](architecture/generator.md) - Test code generation
- [Adapters](architecture/adapters.md) - Framework-specific output
