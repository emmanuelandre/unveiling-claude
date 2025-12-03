# Generator Architecture

## Overview

The Generator transforms correlated recording sessions into test code. It builds test cases, infers assertions, optimizes selectors, and produces output through framework-specific adapters.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GENERATOR                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Correlated Session                               │   │
│  │                                                                      │   │
│  │  interactions[] ─────┐                                               │   │
│  │  apiCalls[] ─────────┼─────▶ correlations[]                         │   │
│  │                      │                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Test Case Builder                                 │   │
│  │                                                                      │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐            │   │
│  │  │ Selector      │  │ Assertion     │  │ Step          │            │   │
│  │  │ Optimizer     │  │ Inference     │  │ Grouper       │            │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Test Cases                                       │   │
│  │                                                                      │   │
│  │  TestCase {                                                          │   │
│  │    feature, scenario, tags,                                         │   │
│  │    steps: TestStep[],                                               │   │
│  │    apiMocks: APIMock[],                                             │   │
│  │    fixtures: Fixture[]                                              │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Framework Adapter                                 │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐│   │
│  │  │ Cypress + Cucumber Adapter                                      ││   │
│  │  │                                                                 ││   │
│  │  │ TestCase ──▶ feature.feature                                   ││   │
│  │  │ TestCase ──▶ steps.ts                                          ││   │
│  │  │ APIMock  ──▶ fixtures/*.json                                   ││   │
│  │  └─────────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Test Case Builder

### Building Test Cases from Sessions

```typescript
class TestCaseBuilder {
  private selectorOptimizer: SelectorOptimizer;
  private assertionInference: AssertionInference;
  private stepGrouper: StepGrouper;

  build(session: RecordingSession): TestCase[] {
    const testCases: TestCase[] = [];

    // Group interactions by flow (page or feature)
    const flows = this.stepGrouper.groupByFlow(
      session.interactions,
      session.correlations
    );

    for (const flow of flows) {
      const testCase = this.buildTestCase(flow, session);
      testCases.push(testCase);
    }

    return testCases;
  }

  private buildTestCase(
    flow: InteractionFlow,
    session: RecordingSession
  ): TestCase {
    const steps: TestStep[] = [];

    // Add background step (visit URL)
    steps.push({
      stepType: 'given',
      description: `I am on the ${flow.pageName} page`,
      action: {
        type: 'visit',
        url: flow.startUrl,
      },
    });

    // Build steps for each interaction
    for (const interaction of flow.interactions) {
      const step = this.buildStep(interaction, session);
      steps.push(step);

      // Add assertion steps if inferred
      const assertions = this.assertionInference.infer(interaction, session);
      for (const assertion of assertions) {
        steps.push(this.buildAssertionStep(assertion));
      }
    }

    // Build API mocks
    const apiMocks = this.buildAPIMocks(flow, session);

    return {
      id: generateId(),
      feature: flow.featureName,
      scenario: flow.scenarioName,
      tags: this.inferTags(flow),
      steps,
      apiMocks,
      fixtures: this.buildFixtures(apiMocks),
    };
  }

  private buildStep(
    interaction: UIInteraction,
    session: RecordingSession
  ): TestStep {
    const selector = this.selectorOptimizer.optimize(interaction.target);

    switch (interaction.type) {
      case 'click':
        return {
          stepType: 'when',
          description: this.describeClick(interaction, selector),
          action: {
            type: 'click',
            selector: selector.selector,
          },
        };

      case 'type':
        const typeData = interaction.data as TypeData;
        return {
          stepType: 'when',
          description: this.describeType(interaction, typeData),
          action: {
            type: 'type',
            selector: selector.selector,
            value: typeData.isPassword ? '{env.TEST_PASSWORD}' : typeData.value,
          },
        };

      case 'select':
        const selectData = interaction.data as SelectData;
        return {
          stepType: 'when',
          description: `I select "${selectData.selectedText}" from the dropdown`,
          action: {
            type: 'select',
            selector: selector.selector,
            value: selectData.selectedValue,
          },
        };

      case 'navigation':
        return {
          stepType: 'when',
          description: `I navigate to ${interaction.url}`,
          action: {
            type: 'visit',
            url: interaction.url,
          },
        };

      default:
        return {
          stepType: 'when',
          description: `I interact with the page`,
          action: {
            type: 'custom',
            raw: interaction,
          },
        };
    }
  }

  private describeClick(
    interaction: UIInteraction,
    selector: SelectorResult
  ): string {
    const target = interaction.target;

    // Use semantic description when possible
    if (target.innerText) {
      const text = target.innerText.slice(0, 30);

      if (target.tagName === 'button' || target.role === 'button') {
        return `I click the "${text}" button`;
      }

      if (target.tagName === 'a') {
        return `I click the "${text}" link`;
      }

      return `I click on "${text}"`;
    }

    // Fallback to selector-based description
    if (target.ariaLabel) {
      return `I click the element labeled "${target.ariaLabel}"`;
    }

    return `I click the ${target.tagName.toLowerCase()} element`;
  }

  private describeType(
    interaction: UIInteraction,
    data: TypeData
  ): string {
    const target = interaction.target;

    if (data.isPassword) {
      return `I enter my password in the password field`;
    }

    if (target.ariaLabel) {
      return `I enter "${data.value}" in the ${target.ariaLabel} field`;
    }

    if (target.name) {
      return `I enter "${data.value}" in the ${target.name} field`;
    }

    return `I enter "${data.value}"`;
  }
}
```

### Selector Optimization

```typescript
class SelectorOptimizer {
  private priorityOrder: SelectorStrategy[] = [
    'dataTestId',
    'dataCy',
    'ariaLabel',
    'role',
    'id',
    'semantic',
    'css',
  ];

  optimize(target: ElementSelector): OptimizedSelector {
    // Try each strategy in priority order
    for (const strategy of this.priorityOrder) {
      const result = this.tryStrategy(strategy, target);
      if (result) {
        return result;
      }
    }

    // Fallback to CSS
    return {
      selector: target.css,
      strategy: 'css',
      confidence: 30,
      warning: 'CSS selector may be unstable',
    };
  }

  private tryStrategy(
    strategy: SelectorStrategy,
    target: ElementSelector
  ): OptimizedSelector | null {
    switch (strategy) {
      case 'dataTestId':
        if (target.dataTestId) {
          return {
            selector: `[data-testid="${target.dataTestId}"]`,
            strategy,
            confidence: 95,
          };
        }
        break;

      case 'dataCy':
        if (target.dataCy) {
          return {
            selector: `[data-cy="${target.dataCy}"]`,
            strategy,
            confidence: 95,
          };
        }
        break;

      case 'ariaLabel':
        if (target.ariaLabel) {
          return {
            selector: `[aria-label="${target.ariaLabel}"]`,
            strategy,
            confidence: 85,
          };
        }
        break;

      case 'role':
        if (target.role && target.text) {
          return {
            selector: `[role="${target.role}"]:contains("${target.text.slice(0, 50)}")`,
            strategy,
            confidence: 75,
          };
        }
        break;

      case 'id':
        if (target.id && !this.isGeneratedId(target.id)) {
          return {
            selector: `#${target.id}`,
            strategy,
            confidence: 70,
          };
        }
        break;

      case 'semantic':
        return this.buildSemanticSelector(target);
    }

    return null;
  }

  private buildSemanticSelector(target: ElementSelector): OptimizedSelector | null {
    // button[type="submit"]
    if (target.tagName === 'button' && target.type === 'submit') {
      return {
        selector: 'button[type="submit"]',
        strategy: 'semantic',
        confidence: 60,
      };
    }

    // input[name="email"]
    if (target.tagName === 'input' && target.name) {
      return {
        selector: `input[name="${target.name}"]`,
        strategy: 'semantic',
        confidence: 65,
      };
    }

    return null;
  }

  private isGeneratedId(id: string): boolean {
    const patterns = [
      /^:r[0-9a-z]+:/,        // React
      /^ember[0-9]+$/,         // Ember
      /^[a-f0-9]{8,}$/,        // Hash
      /^_[a-zA-Z0-9]+_\d+$/,   // CSS Modules
    ];

    return patterns.some(p => p.test(id));
  }
}
```

### Assertion Inference

```typescript
class AssertionInference {
  infer(
    interaction: UIInteraction,
    session: RecordingSession
  ): InferredAssertion[] {
    const assertions: InferredAssertion[] = [];

    // Find correlated API calls
    const correlation = session.correlations.find(
      c => c.interactionId === interaction.id
    );

    if (correlation) {
      // Add API response assertions
      for (const apiCallId of correlation.apiCallIds) {
        const apiCall = session.apiCalls.find(c => c.id === apiCallId);
        if (apiCall) {
          assertions.push(this.inferAPIAssertion(apiCall, correlation));
        }
      }
    }

    // Add UI state assertions based on interaction type
    const uiAssertions = this.inferUIAssertions(interaction);
    assertions.push(...uiAssertions);

    return assertions;
  }

  private inferAPIAssertion(
    apiCall: APICall,
    correlation: InteractionAPICorrelation
  ): InferredAssertion {
    // Success response assertion
    if (apiCall.response.status >= 200 && apiCall.response.status < 300) {
      return {
        type: 'api_status',
        description: `the API should return status ${apiCall.response.status}`,
        assertion: {
          target: this.generateAlias(apiCall),
          method: 'its',
          args: ['response.statusCode'],
          expected: apiCall.response.status,
        },
      };
    }

    // Error response assertion
    return {
      type: 'api_status',
      description: `the API should return error status ${apiCall.response.status}`,
      assertion: {
        target: this.generateAlias(apiCall),
        method: 'its',
        args: ['response.statusCode'],
        expected: apiCall.response.status,
      },
    };
  }

  private inferUIAssertions(interaction: UIInteraction): InferredAssertion[] {
    const assertions: InferredAssertion[] = [];

    // After form submit, check for navigation
    if (this.isFormSubmit(interaction)) {
      assertions.push({
        type: 'navigation',
        description: 'I should be redirected to the next page',
        assertion: {
          target: 'url',
          method: 'should',
          args: ['not.include', interaction.url],
        },
      });
    }

    // After login, check for success indicator
    if (this.isLoginAction(interaction)) {
      assertions.push({
        type: 'visibility',
        description: 'I should see the dashboard',
        assertion: {
          target: '[data-testid="dashboard"], .dashboard, #dashboard',
          method: 'should',
          args: ['be.visible'],
        },
      });
    }

    return assertions;
  }

  private isFormSubmit(interaction: UIInteraction): boolean {
    return interaction.type === 'click' &&
           (interaction.target.type === 'submit' ||
            interaction.target.innerText?.toLowerCase().includes('submit'));
  }

  private isLoginAction(interaction: UIInteraction): boolean {
    const text = interaction.target.innerText?.toLowerCase() || '';
    return text.includes('login') ||
           text.includes('sign in') ||
           text.includes('log in');
  }

  private generateAlias(apiCall: APICall): string {
    const method = apiCall.request.method.toLowerCase();
    const path = new URL(apiCall.request.url).pathname
      .split('/')
      .filter(Boolean)
      .slice(-2)
      .join('_');

    return `${method}_${path}`;
  }
}
```

### Step Grouping

```typescript
class StepGrouper {
  groupByFlow(
    interactions: UIInteraction[],
    correlations: InteractionAPICorrelation[]
  ): InteractionFlow[] {
    const flows: InteractionFlow[] = [];
    let currentFlow: InteractionFlow | null = null;

    for (const interaction of interactions) {
      // Start new flow on navigation
      if (interaction.type === 'navigation' || !currentFlow) {
        if (currentFlow) {
          flows.push(currentFlow);
        }

        currentFlow = {
          id: generateId(),
          featureName: this.inferFeatureName(interaction.url),
          scenarioName: this.inferScenarioName(interactions),
          pageName: this.inferPageName(interaction.url),
          startUrl: interaction.url,
          interactions: [],
        };
      }

      currentFlow.interactions.push(interaction);
    }

    if (currentFlow) {
      flows.push(currentFlow);
    }

    return flows;
  }

  private inferFeatureName(url: string): string {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) return 'Home';

    // Convert path to title case
    return segments[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private inferScenarioName(interactions: UIInteraction[]): string {
    // Look for key actions to name the scenario
    const hasLogin = interactions.some(i =>
      i.target.innerText?.toLowerCase().includes('login')
    );

    if (hasLogin) return 'User Login Flow';

    const hasForm = interactions.some(i =>
      i.target.type === 'submit'
    );

    if (hasForm) return 'Form Submission';

    return 'User Interaction Flow';
  }

  private inferPageName(url: string): string {
    const path = new URL(url).pathname;

    if (path === '/' || path === '') return 'home';

    return path.split('/').filter(Boolean)[0] || 'page';
  }
}
```

## API Mock Generation

```typescript
class APIMockGenerator {
  generate(
    flow: InteractionFlow,
    session: RecordingSession
  ): APIMock[] {
    const mocks: APIMock[] = [];

    // Find all correlated API calls for this flow
    const flowInteractionIds = new Set(flow.interactions.map(i => i.id));

    const relevantCorrelations = session.correlations.filter(
      c => flowInteractionIds.has(c.interactionId)
    );

    const apiCallIds = new Set(
      relevantCorrelations.flatMap(c => c.apiCallIds)
    );

    for (const callId of apiCallIds) {
      const apiCall = session.apiCalls.find(c => c.id === callId);
      if (!apiCall) continue;

      // Skip static assets
      if (apiCall.classification.type === 'static') continue;

      mocks.push({
        id: generateId(),
        alias: this.generateAlias(apiCall),
        method: apiCall.request.method,
        urlPattern: this.generateUrlPattern(apiCall),
        response: {
          statusCode: apiCall.response.status,
          body: apiCall.response.body,
          headers: this.filterHeaders(apiCall.response.headers),
        },
        fixture: this.shouldUseFixture(apiCall)
          ? this.generateFixturePath(apiCall)
          : undefined,
      });
    }

    return mocks;
  }

  private generateUrlPattern(apiCall: APICall): string {
    const url = new URL(apiCall.request.url);
    let pattern = url.pathname;

    // Replace IDs with wildcards
    pattern = pattern.replace(/\/[0-9a-f-]{8,}/gi, '/*');
    pattern = pattern.replace(/\/\d+/g, '/*');

    return `**${pattern}`;
  }

  private generateAlias(apiCall: APICall): string {
    const method = apiCall.request.method.toLowerCase();
    const url = new URL(apiCall.request.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const resource = segments[segments.length - 1] || 'api';

    return `${method}${this.toPascalCase(resource)}`;
  }

  private shouldUseFixture(apiCall: APICall): boolean {
    const bodySize = JSON.stringify(apiCall.response.body || '').length;
    return bodySize > 500;
  }

  private generateFixturePath(apiCall: APICall): string {
    const alias = this.generateAlias(apiCall);
    return `api/${alias}.json`;
  }

  private filterHeaders(headers: Record<string, string>): Record<string, string> {
    const allowList = ['content-type', 'cache-control'];
    return Object.fromEntries(
      Object.entries(headers).filter(([k]) =>
        allowList.includes(k.toLowerCase())
      )
    );
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}
```

## Quality Scoring

```typescript
interface QualityScore {
  overall: number;  // 0-100
  breakdown: {
    selectorStability: number;
    assertionCoverage: number;
    apiMocking: number;
    readability: number;
  };
  warnings: QualityWarning[];
  recommendations: string[];
}

class QualityScorer {
  score(testCases: TestCase[], session: RecordingSession): QualityScore {
    const selectorScore = this.scoreSelectorStability(testCases);
    const assertionScore = this.scoreAssertionCoverage(testCases);
    const apiScore = this.scoreAPIMocking(testCases, session);
    const readabilityScore = this.scoreReadability(testCases);

    const overall = Math.round(
      (selectorScore * 0.35) +
      (assertionScore * 0.25) +
      (apiScore * 0.25) +
      (readabilityScore * 0.15)
    );

    return {
      overall,
      breakdown: {
        selectorStability: selectorScore,
        assertionCoverage: assertionScore,
        apiMocking: apiScore,
        readability: readabilityScore,
      },
      warnings: this.generateWarnings(testCases),
      recommendations: this.generateRecommendations(testCases, session),
    };
  }

  private scoreSelectorStability(testCases: TestCase[]): number {
    let totalSelectors = 0;
    let stableSelectors = 0;

    for (const testCase of testCases) {
      for (const step of testCase.steps) {
        if ('selector' in step.action) {
          totalSelectors++;

          const selector = step.action.selector;
          if (selector.includes('data-testid') ||
              selector.includes('data-cy') ||
              selector.includes('aria-label')) {
            stableSelectors++;
          }
        }
      }
    }

    if (totalSelectors === 0) return 100;
    return Math.round((stableSelectors / totalSelectors) * 100);
  }

  private scoreAssertionCoverage(testCases: TestCase[]): number {
    let totalSteps = 0;
    let stepsWithAssertions = 0;

    for (const testCase of testCases) {
      for (const step of testCase.steps) {
        if (step.stepType === 'when') {
          totalSteps++;
        }
        if (step.stepType === 'then') {
          stepsWithAssertions++;
        }
      }
    }

    if (totalSteps === 0) return 100;

    // Ideal ratio is ~1 assertion per 2 actions
    const ratio = stepsWithAssertions / totalSteps;
    return Math.min(100, Math.round(ratio * 200));
  }

  private scoreAPIMocking(
    testCases: TestCase[],
    session: RecordingSession
  ): number {
    const totalAPICalls = session.apiCalls.filter(
      c => c.classification.type !== 'static'
    ).length;

    let mockedCalls = 0;
    for (const testCase of testCases) {
      mockedCalls += testCase.apiMocks.length;
    }

    if (totalAPICalls === 0) return 100;
    return Math.min(100, Math.round((mockedCalls / totalAPICalls) * 100));
  }

  private scoreReadability(testCases: TestCase[]): number {
    let score = 100;

    for (const testCase of testCases) {
      // Penalize very long scenarios
      if (testCase.steps.length > 20) {
        score -= 10;
      }

      // Penalize unclear step descriptions
      for (const step of testCase.steps) {
        if (step.description.length < 10) {
          score -= 2;
        }
      }
    }

    return Math.max(0, score);
  }

  private generateWarnings(testCases: TestCase[]): QualityWarning[] {
    const warnings: QualityWarning[] = [];

    for (const testCase of testCases) {
      for (const step of testCase.steps) {
        if ('selector' in step.action) {
          const selector = step.action.selector;

          // Warn about CSS class selectors
          if (selector.startsWith('.') && !selector.includes('data-')) {
            warnings.push({
              type: 'unstable_selector',
              message: `CSS class selector "${selector}" may be unstable`,
              step: step.description,
              suggestion: 'Consider adding data-testid attribute',
            });
          }
        }
      }
    }

    return warnings;
  }

  private generateRecommendations(
    testCases: TestCase[],
    session: RecordingSession
  ): string[] {
    const recommendations: string[] = [];

    // Check for missing data-testid
    const unstableSelectors = testCases.flatMap(tc =>
      tc.steps.filter(s =>
        'selector' in s.action &&
        !s.action.selector.includes('data-testid')
      )
    );

    if (unstableSelectors.length > 3) {
      recommendations.push(
        `Add data-testid attributes to ${unstableSelectors.length} elements for more stable selectors`
      );
    }

    // Check for uncorrelated API calls
    const correlatedIds = new Set(
      session.correlations.flatMap(c => c.apiCallIds)
    );
    const uncorrelated = session.apiCalls.filter(
      c => !correlatedIds.has(c.id) && c.classification.type !== 'static'
    );

    if (uncorrelated.length > 0) {
      recommendations.push(
        `${uncorrelated.length} API calls could not be correlated with UI actions. Review manually.`
      );
    }

    return recommendations;
  }
}
```

## Output

The generator produces:

1. **TestCase[]** - Structured test cases
2. **APIMock[]** - API mock configurations
3. **Fixture[]** - JSON fixture files
4. **QualityScore** - Quality analysis and recommendations

These are passed to the framework adapter for final code generation.
