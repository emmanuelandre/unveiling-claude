# Phase 4: Polish & Extensibility

## Goal

Add configurable API mocking modes, quality scoring, edge case handling, and comprehensive documentation.

## Scope

- Configurable API mocking (stubbed/live/hybrid)
- Test quality scoring and reporting
- Selector stability warnings
- Edge case handlers (SPA, polling, auth)
- Configuration file support
- Error recovery and resilience
- Documentation and examples

## Checklist

### API Mocking Modes

- [ ] Implement stubbed mode (all mocked)
- [ ] Implement live mode (no mocking)
- [ ] Implement hybrid mode (configurable)
- [ ] Add `--api-mode` CLI flag
- [ ] Add config file support for mode
- [ ] Generate mode-aware intercepts

### Configuration System

- [ ] Define configuration schema
- [ ] Implement cosmiconfig loader
- [ ] Support .ui2testrc.json
- [ ] Support .ui2testrc.yaml
- [ ] Support ui2test.config.js
- [ ] Support package.json key
- [ ] Implement `ui2test init` wizard
- [ ] Validate configuration with zod

### Quality Scoring

- [ ] Implement selector stability scoring
- [ ] Implement assertion coverage scoring
- [ ] Implement API mocking coverage
- [ ] Implement readability scoring
- [ ] Calculate overall quality score
- [ ] Generate quality report
- [ ] Provide actionable recommendations

### Edge Case Handlers

- [ ] SPA navigation detection
- [ ] Infinite scroll handling
- [ ] Polling endpoint filtering
- [ ] Authentication flow detection
- [ ] Dynamic content handling
- [ ] Modal/dialog detection
- [ ] Form validation states

### Error Recovery

- [ ] Browser crash recovery
- [ ] Network error handling
- [ ] Session autosave
- [ ] Resume interrupted recording
- [ ] Retry mechanisms

### Terminal UX Polish

- [ ] Improved progress display
- [ ] Quality score visualization
- [ ] Warning highlights
- [ ] Recommendation formatting
- [ ] Error message improvements

### Documentation

- [ ] README with quick start
- [ ] CLI command reference
- [ ] Configuration guide
- [ ] Troubleshooting guide
- [ ] Examples directory
- [ ] Contributing guide

## Key Files

```
src/
├── config/
│   ├── index.ts                  # Config loader
│   ├── schema.ts                 # Zod schema
│   └── defaults.ts               # Default config
├── generator/
│   └── quality-scorer.ts         # Quality analysis
├── recorder/
│   └── edge-cases.ts             # Edge case handlers
├── adapters/
│   └── cypress-cucumber/
│       └── api-mode-handler.ts   # Mode handling
└── cli/
    └── display.ts                # Enhanced display

docs/
├── README.md
├── CLI.md
├── CONFIGURATION.md
├── TROUBLESHOOTING.md
└── examples/
    ├── basic-recording/
    ├── api-testing/
    └── authentication/
```

## Configuration Schema

```typescript
interface UI2TestConfig {
  // Output settings
  output: {
    directory: string;
    format: 'cucumber';
    overwrite: boolean;
  };

  // Browser settings
  browser: {
    type: 'chromium' | 'firefox' | 'webkit';
    viewport: { width: number; height: number };
    headless: boolean;
  };

  // Recording settings
  recording: {
    timeout: number;
    screenshotOnAction: boolean;
  };

  // Selector settings
  selectors: {
    priority: string[];
    excludePatterns: string[];
  };

  // API settings
  api: {
    capture: boolean;
    mode: 'stubbed' | 'live' | 'hybrid';
    filter: string;
    ignore: string[];
    hybridConfig: {
      stub: string[];
      live: string[];
    };
  };

  // Generation settings
  generation: {
    splitBy: 'flow' | 'page';
    includeComments: boolean;
    assertionInference: boolean;
  };
}
```

## Quality Report

```
╔══════════════════════════════════════════════════════════════╗
║  TEST QUALITY REPORT                                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Overall Score: 87/100 ★★★★☆                                ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  BREAKDOWN                                                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Selector Stability    ████████░░  80%                      ║
║  • 8/10 selectors use data-testid                           ║
║  • 2 selectors use CSS classes                              ║
║                                                              ║
║  Assertion Coverage    █████████░  90%                      ║
║  • 9 assertions for 10 actions                              ║
║  • API status checks: 3                                      ║
║  • UI state checks: 6                                        ║
║                                                              ║
║  API Mocking          ██████████  100%                      ║
║  • 5/5 API calls mocked                                     ║
║  • 3 fixtures generated                                      ║
║                                                              ║
║  Readability          ████████░░  85%                       ║
║  • Scenario length: 12 steps (good)                         ║
║  • Step descriptions: clear                                  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  WARNINGS                                                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ⚠ Line 15: CSS selector ".btn-primary" may be unstable    ║
║    Suggestion: Add data-testid="submit-button"              ║
║                                                              ║
║  ⚠ Line 23: No assertion after form submission              ║
║    Suggestion: Add "Then I should see success message"      ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  RECOMMENDATIONS                                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Add data-testid to 2 elements for stable selectors      ║
║  2. Consider splitting scenario into smaller tests          ║
║  3. Add environment variable for test password              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Success Criteria

1. All three API modes working correctly
2. Quality report provides actionable insights
3. Configuration file fully supported
4. Edge cases handled gracefully
5. Error recovery works reliably
6. Documentation is complete

## Hybrid Mode Configuration

```json
{
  "api": {
    "mode": "hybrid",
    "hybridConfig": {
      "stub": [
        "/api/users/**",
        "/api/products/**"
      ],
      "live": [
        "/api/auth/**",
        "/api/payments/**"
      ]
    }
  }
}
```

Generated output for hybrid mode:

```typescript
beforeEach(() => {
  // Stubbed endpoints
  cy.intercept('GET', '**/api/users/**', { fixture: 'api/users.json' }).as('getUsers');
  cy.intercept('GET', '**/api/products/**', { fixture: 'api/products.json' }).as('getProducts');

  // Live endpoints (spy only)
  cy.intercept('POST', '**/api/auth/**').as('postAuth');
  cy.intercept('POST', '**/api/payments/**').as('postPayments');
});
```

## Edge Case Handlers

### SPA Navigation

```typescript
// Detect client-side navigation
page.on('framenavigated', async (frame) => {
  if (frame === page.mainFrame()) {
    // Record as navigation event
    // Wait for route stability before capturing
  }
});
```

### Infinite Scroll

```typescript
// Consolidate scroll events into single "load more" action
if (isInfiniteScroll(scrollEvents)) {
  consolidatedEvent = {
    type: 'scroll',
    data: { action: 'load_more', count: scrollEvents.length }
  };
}
```

### Authentication Flow

```typescript
// Detect and mark auth-related interactions
if (isAuthEndpoint(apiCall)) {
  // Generate cy.session() wrapper
  // Store auth state for reuse
}
```

## Notes

- Ensure backward compatibility with v1 sessions
- Provide migration guide for config changes
- Consider plugin system for custom adapters
- Add telemetry opt-in for improvement data
- Plan for v2 features (visual testing, etc.)
