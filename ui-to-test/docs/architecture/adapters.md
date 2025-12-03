# Adapters Architecture

## Overview

Adapters transform generic test cases into framework-specific code. The adapter system is extensible, allowing new test frameworks to be supported without modifying the core generator.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADAPTER SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Adapter Registry                                  │   │
│  │                                                                      │   │
│  │  register(adapter) ──▶ Map<name, adapter>                           │   │
│  │  get(name) ──▶ adapter                                              │   │
│  │  list() ──▶ [names]                                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
│           ┌───────────────────┼───────────────────┐                        │
│           │                   │                   │                        │
│           ▼                   ▼                   ▼                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │ Cypress +   │     │ Playwright  │     │ TestCafe    │                  │
│  │ Cucumber    │     │ Adapter     │     │ Adapter     │                  │
│  │ Adapter     │     │ (Future)    │     │ (Future)    │                  │
│  └─────────────┘     └─────────────┘     └─────────────┘                  │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Generated Output                                  │   │
│  │                                                                      │   │
│  │  ├── cypress/e2e/features/*.feature                                 │   │
│  │  ├── cypress/support/step_definitions/*.ts                          │   │
│  │  ├── cypress/fixtures/api/*.json                                    │   │
│  │  └── cypress/support/commands.ts                                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Adapter Interface

```typescript
interface TestFrameworkAdapter {
  // Identification
  readonly name: string;
  readonly version: string;
  readonly description: string;

  // Capabilities
  readonly capabilities: AdapterCapabilities;

  // Configuration
  configure(options: AdapterOptions): void;

  // Generation
  generate(testCases: TestCase[], options: GeneratorOptions): GeneratedOutput;

  // Individual generators
  generateFeatureFile(testCase: TestCase): GeneratedFile;
  generateStepDefinitions(testCases: TestCase[]): GeneratedFile;
  generateFixtures(apiMocks: APIMock[]): GeneratedFile[];
  generateSupportFiles(): GeneratedFile[];
}

interface AdapterCapabilities {
  supportsAPIInterception: boolean;
  supportsBDD: boolean;
  supportsParallel: boolean;
  supportsScreenshots: boolean;
  supportsVideo: boolean;
}

interface AdapterOptions {
  outputDir: string;
  baseUrl?: string;
  apiMode: 'stubbed' | 'live' | 'hybrid';
  selectorPriority: string[];
}

interface GeneratedFile {
  path: string;
  content: string;
  type: 'feature' | 'step_definition' | 'fixture' | 'support' | 'config';
}

interface GeneratedOutput {
  files: GeneratedFile[];
  summary: {
    featuresGenerated: number;
    stepsGenerated: number;
    fixturesGenerated: number;
  };
}
```

## Adapter Registry

```typescript
class AdapterRegistry {
  private adapters = new Map<string, TestFrameworkAdapter>();
  private defaultAdapter = 'cypress-cucumber';

  register(adapter: TestFrameworkAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): TestFrameworkAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter "${name}" not found. Available: ${this.list().join(', ')}`);
    }
    return adapter;
  }

  getDefault(): TestFrameworkAdapter {
    return this.get(this.defaultAdapter);
  }

  setDefault(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Cannot set default: adapter "${name}" not registered`);
    }
    this.defaultAdapter = name;
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Global registry
export const adapterRegistry = new AdapterRegistry();

// Register built-in adapters
import { CypressCucumberAdapter } from './cypress-cucumber';
adapterRegistry.register(new CypressCucumberAdapter());
```

## Cypress + Cucumber Adapter

### Implementation

```typescript
class CypressCucumberAdapter implements TestFrameworkAdapter {
  readonly name = 'cypress-cucumber';
  readonly version = '1.0.0';
  readonly description = 'Cypress with @badeball/cypress-cucumber-preprocessor';

  readonly capabilities: AdapterCapabilities = {
    supportsAPIInterception: true,
    supportsBDD: true,
    supportsParallel: true,
    supportsScreenshots: true,
    supportsVideo: true,
  };

  private options: AdapterOptions = {
    outputDir: './cypress/e2e',
    apiMode: 'stubbed',
    selectorPriority: ['data-testid', 'data-cy', 'aria-label'],
  };

  configure(options: Partial<AdapterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  generate(testCases: TestCase[], options: GeneratorOptions): GeneratedOutput {
    const files: GeneratedFile[] = [];

    // Generate feature files
    for (const testCase of testCases) {
      files.push(this.generateFeatureFile(testCase));
    }

    // Generate step definitions
    files.push(this.generateStepDefinitions(testCases));

    // Generate fixtures
    const allMocks = testCases.flatMap(tc => tc.apiMocks);
    files.push(...this.generateFixtures(allMocks));

    // Generate support files
    files.push(...this.generateSupportFiles());

    return {
      files,
      summary: {
        featuresGenerated: testCases.length,
        stepsGenerated: this.countSteps(testCases),
        fixturesGenerated: allMocks.filter(m => m.fixture).length,
      },
    };
  }

  generateFeatureFile(testCase: TestCase): GeneratedFile {
    const lines: string[] = [];

    // Tags
    if (testCase.tags.length > 0) {
      lines.push(testCase.tags.map(t => `@${t}`).join(' '));
    }

    // Feature
    lines.push(`Feature: ${testCase.feature}`);
    lines.push('');

    // Scenario
    lines.push(`  Scenario: ${testCase.scenario}`);

    // Steps
    for (const step of testCase.steps) {
      const keyword = this.stepTypeToKeyword(step.stepType);
      lines.push(`    ${keyword} ${step.description}`);
    }

    const fileName = this.toFileName(testCase.feature);

    return {
      path: `${this.options.outputDir}/features/${fileName}.feature`,
      content: lines.join('\n'),
      type: 'feature',
    };
  }

  generateStepDefinitions(testCases: TestCase[]): GeneratedFile {
    // Collect unique steps
    const steps = new Map<string, TestStep>();

    for (const testCase of testCases) {
      for (const step of testCase.steps) {
        const pattern = this.stepToPattern(step.description);
        if (!steps.has(pattern)) {
          steps.set(pattern, step);
        }
      }
    }

    // Generate imports
    const lines: string[] = [
      "import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';",
      '',
    ];

    // Generate step definitions
    for (const [pattern, step] of steps) {
      lines.push(this.generateStepDefinition(pattern, step));
      lines.push('');
    }

    return {
      path: `${this.options.outputDir.replace('/e2e', '')}/support/step_definitions/steps.ts`,
      content: lines.join('\n'),
      type: 'step_definition',
    };
  }

  private generateStepDefinition(pattern: string, step: TestStep): string {
    const keyword = this.stepTypeToKeyword(step.stepType);
    const cypressKeyword = keyword === 'Given' ? 'Given' :
                          keyword === 'When' ? 'When' : 'Then';

    const code = this.actionToCode(step.action);

    return `${cypressKeyword}('${pattern}', () => {
  ${code}
});`;
  }

  private actionToCode(action: TestAction): string {
    switch (action.type) {
      case 'visit':
        return `cy.visit('${action.url}');`;

      case 'click':
        return `cy.get('${action.selector}').click();`;

      case 'type':
        if (action.value.startsWith('{env.')) {
          const envVar = action.value.slice(5, -1);
          return `cy.get('${action.selector}').clear().type(Cypress.env('${envVar}'));`;
        }
        return `cy.get('${action.selector}').clear().type('${action.value}');`;

      case 'select':
        return `cy.get('${action.selector}').select('${action.value}');`;

      case 'assert_visible':
        return `cy.get('${action.selector}').should('be.visible');`;

      case 'assert_text':
        return `cy.get('${action.selector}').should('contain', '${action.text}');`;

      case 'assert_url':
        return `cy.url().should('include', '${action.pattern}');`;

      case 'intercept':
        return `cy.intercept('${action.method}', '${action.urlPattern}').as('${action.alias}');`;

      case 'wait_for_api':
        return `cy.wait('@${action.alias}');`;

      case 'assert_api_status':
        return `cy.wait('@${action.alias}').its('response.statusCode').should('eq', ${action.expected});`;

      default:
        return `// TODO: Implement ${action.type}`;
    }
  }

  generateFixtures(apiMocks: APIMock[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    for (const mock of apiMocks) {
      if (mock.fixture && mock.response.body) {
        files.push({
          path: `${this.options.outputDir.replace('/e2e', '')}/fixtures/${mock.fixture}`,
          content: JSON.stringify(mock.response.body, null, 2),
          type: 'fixture',
        });
      }
    }

    return files;
  }

  generateSupportFiles(): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Custom commands
    files.push({
      path: `${this.options.outputDir.replace('/e2e', '')}/support/commands.ts`,
      content: this.generateCustomCommands(),
      type: 'support',
    });

    // API helpers
    files.push({
      path: `${this.options.outputDir.replace('/e2e', '')}/support/api-helpers.ts`,
      content: this.generateAPIHelpers(),
      type: 'support',
    });

    return files;
  }

  private generateCustomCommands(): string {
    return `// Custom Cypress commands generated by UI-to-Test

Cypress.Commands.add('safeClick', (selector: string) => {
  cy.get(selector)
    .should('be.visible')
    .should('be.enabled')
    .click();
});

Cypress.Commands.add('safeType', (selector: string, text: string) => {
  cy.get(selector)
    .should('be.visible')
    .should('be.enabled')
    .clear()
    .type(text);
});

declare global {
  namespace Cypress {
    interface Chainable {
      safeClick(selector: string): Chainable<void>;
      safeType(selector: string, text: string): Chainable<void>;
    }
  }
}

export {};
`;
  }

  private generateAPIHelpers(): string {
    return `// API helpers generated by UI-to-Test

export function setupAPIMocks(mode: 'stubbed' | 'live' | 'hybrid' = 'stubbed') {
  if (mode === 'live') {
    // No mocking - requests go to real backend
    return;
  }

  // Import and apply fixtures based on mode
  // This is a placeholder - actual implementation depends on your API structure
}

export function waitForAPI(alias: string, timeout = 10000) {
  return cy.wait(\`@\${alias}\`, { timeout });
}

export function assertAPIStatus(alias: string, status: number) {
  return cy.wait(\`@\${alias}\`)
    .its('response.statusCode')
    .should('eq', status);
}
`;
  }

  private stepTypeToKeyword(stepType: string): string {
    switch (stepType) {
      case 'given': return 'Given';
      case 'when': return 'When';
      case 'then': return 'Then';
      case 'and': return 'And';
      case 'but': return 'But';
      default: return 'And';
    }
  }

  private stepToPattern(description: string): string {
    // Convert description to step pattern with parameters
    // "I enter "user@example.com" in the email field"
    // -> "I enter {string} in the email field"

    return description
      .replace(/"[^"]+"/g, '{string}')
      .replace(/\d+/g, '{int}');
  }

  private toFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private countSteps(testCases: TestCase[]): number {
    return testCases.reduce((sum, tc) => sum + tc.steps.length, 0);
  }
}
```

## API Mocking Modes

The adapter supports three API mocking modes:

### Stubbed Mode (Default)

All API calls are mocked with captured responses:

```typescript
// Generated in stubbed mode
beforeEach(() => {
  cy.intercept('POST', '**/api/auth/login', {
    fixture: 'api/postLogin.json'
  }).as('postLogin');

  cy.intercept('GET', '**/api/user/profile', {
    fixture: 'api/getUserProfile.json'
  }).as('getUserProfile');
});
```

### Live Mode

No mocking - all requests hit the real backend:

```typescript
// Generated in live mode
beforeEach(() => {
  // Spy on requests without mocking
  cy.intercept('POST', '**/api/auth/login').as('postLogin');
  cy.intercept('GET', '**/api/user/profile').as('getUserProfile');
});
```

### Hybrid Mode

Configurable per endpoint:

```typescript
// Configuration
{
  "api": {
    "mode": "hybrid",
    "hybridConfig": {
      "stub": ["/api/users/**", "/api/products/**"],
      "live": ["/api/auth/**", "/api/payments/**"]
    }
  }
}

// Generated in hybrid mode
beforeEach(() => {
  // Stubbed endpoints
  cy.intercept('GET', '**/api/users/**', {
    fixture: 'api/getUsers.json'
  }).as('getUsers');

  // Live endpoints (spy only)
  cy.intercept('POST', '**/api/auth/**').as('postAuth');
});
```

### Mode Selection

```typescript
class APIModeHandler {
  constructor(private mode: 'stubbed' | 'live' | 'hybrid') {}

  generateIntercept(mock: APIMock): string {
    switch (this.mode) {
      case 'stubbed':
        return this.generateStubbedIntercept(mock);

      case 'live':
        return this.generateLiveIntercept(mock);

      case 'hybrid':
        return this.generateHybridIntercept(mock);
    }
  }

  private generateStubbedIntercept(mock: APIMock): string {
    if (mock.fixture) {
      return `cy.intercept('${mock.method}', '${mock.urlPattern}', {
  fixture: '${mock.fixture}'
}).as('${mock.alias}');`;
    }

    return `cy.intercept('${mock.method}', '${mock.urlPattern}', {
  statusCode: ${mock.response.statusCode},
  body: ${JSON.stringify(mock.response.body)}
}).as('${mock.alias}');`;
  }

  private generateLiveIntercept(mock: APIMock): string {
    return `cy.intercept('${mock.method}', '${mock.urlPattern}').as('${mock.alias}');`;
  }

  private generateHybridIntercept(mock: APIMock): string {
    const shouldStub = this.shouldStub(mock.urlPattern);

    if (shouldStub) {
      return this.generateStubbedIntercept(mock);
    } else {
      return this.generateLiveIntercept(mock);
    }
  }

  private shouldStub(urlPattern: string): boolean {
    // Check against hybrid configuration
    // Implementation depends on config structure
    return true;
  }
}
```

## Output Structure

### File Organization

```
cypress/
├── e2e/
│   └── features/
│       ├── user-login.feature
│       ├── user-registration.feature
│       └── checkout.feature
├── support/
│   ├── step_definitions/
│   │   ├── steps.ts              # All step definitions
│   │   └── common/
│   │       ├── navigation.ts     # Reusable navigation steps
│   │       └── api.ts            # Reusable API steps
│   ├── commands.ts               # Custom Cypress commands
│   ├── api-helpers.ts            # API utility functions
│   └── e2e.ts                    # Support file
├── fixtures/
│   └── api/
│       ├── postLogin.json
│       ├── getUserProfile.json
│       └── getProducts.json
└── cypress.config.ts             # Cypress configuration
```

### Sample Generated Feature

```gherkin
@login @smoke
Feature: User Login

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter "user@example.com" in the email field
    And I enter my password in the password field
    And I click the "Sign In" button
    Then the login API should return status 200
    And I should be redirected to the dashboard
```

### Sample Generated Step Definitions

```typescript
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('I am on the login page', () => {
  cy.visit('/login');
});

When('I enter {string} in the email field', (email: string) => {
  cy.get('[data-testid="email-input"]').clear().type(email);
});

When('I enter my password in the password field', () => {
  cy.get('[data-testid="password-input"]').clear().type(Cypress.env('TEST_PASSWORD'));
});

When('I click the {string} button', (buttonText: string) => {
  cy.get(`[data-testid="${buttonText.toLowerCase().replace(/\s+/g, '-')}-button"]`).click();
});

Then('the login API should return status {int}', (status: number) => {
  cy.wait('@postLogin').its('response.statusCode').should('eq', status);
});

Then('I should be redirected to the dashboard', () => {
  cy.url().should('include', '/dashboard');
});
```

## Extending with New Adapters

To add support for a new test framework:

```typescript
// 1. Create adapter class
class PlaywrightTestAdapter implements TestFrameworkAdapter {
  readonly name = 'playwright';
  readonly version = '1.0.0';
  readonly description = 'Playwright Test with BDD';

  readonly capabilities: AdapterCapabilities = {
    supportsAPIInterception: true,
    supportsBDD: false, // Native BDD requires plugins
    supportsParallel: true,
    supportsScreenshots: true,
    supportsVideo: true,
  };

  // Implement interface methods...
  generate(testCases: TestCase[]): GeneratedOutput {
    // Generate Playwright Test files
  }

  generateFeatureFile(testCase: TestCase): GeneratedFile {
    // Playwright doesn't use feature files natively
    // Generate describe/test blocks instead
  }
}

// 2. Register adapter
import { adapterRegistry } from './registry';
adapterRegistry.register(new PlaywrightTestAdapter());

// 3. Use adapter
const adapter = adapterRegistry.get('playwright');
const output = adapter.generate(testCases);
```
