# Phase 3: Test Generation

## Goal

Generate Cypress BDD/Cucumber tests from recorded sessions with proper selectors, assertions, and API mocks.

## Scope

- Test case builder from correlated sessions
- Selector optimization with priority strategies
- Assertion inference based on context
- Gherkin feature file generation
- Step definition generation
- API intercept and fixture generation
- Cypress + Cucumber adapter

## Checklist

### Test Case Builder

- [ ] Group interactions into flows
- [ ] Build test case structure
- [ ] Generate scenario names
- [ ] Assign appropriate tags
- [ ] Link API mocks to test cases

### Selector Optimization

- [ ] Implement priority-based selection
- [ ] Validate selector uniqueness
- [ ] Generate fallback selectors
- [ ] Flag unstable selectors
- [ ] Calculate confidence scores

### Assertion Inference

- [ ] Infer API status assertions
- [ ] Infer navigation assertions
- [ ] Infer visibility assertions
- [ ] Infer content assertions
- [ ] Context-aware assertion placement

### Feature File Generation

- [ ] Generate feature header
- [ ] Generate tags
- [ ] Generate scenario outline
- [ ] Generate Given/When/Then steps
- [ ] Handle parameterized steps
- [ ] Format for cypress-cucumber-preprocessor

### Step Definition Generation

- [ ] Extract unique steps
- [ ] Convert to step patterns
- [ ] Generate TypeScript code
- [ ] Handle string/int parameters
- [ ] Generate cy.get() commands
- [ ] Generate cy.intercept() setup

### Fixture Generation

- [ ] Identify fixture-worthy responses
- [ ] Sanitize response bodies
- [ ] Generate JSON fixture files
- [ ] Reference fixtures in intercepts

### Adapter Implementation

- [ ] Implement adapter interface
- [ ] Cypress + Cucumber adapter
- [ ] File path generation
- [ ] Support file generation
- [ ] Custom commands generation

### Generate Command

- [ ] Implement `ui2test generate`
- [ ] Load session from file
- [ ] Apply adapter options
- [ ] Write output files
- [ ] Display generation summary

## Key Files

```
src/
├── generator/
│   ├── index.ts                  # Generator orchestration
│   ├── test-case-builder.ts      # Build test cases
│   ├── selector-optimizer.ts     # Optimize selectors
│   ├── assertion-inference.ts    # Infer assertions
│   └── step-grouper.ts           # Group into flows
├── adapters/
│   ├── index.ts                  # Adapter registry
│   ├── base-adapter.ts           # Base class
│   └── cypress-cucumber/
│       ├── index.ts              # Cypress adapter
│       ├── feature-writer.ts     # .feature generation
│       ├── step-writer.ts        # Step definitions
│       └── fixture-writer.ts     # JSON fixtures
├── cli/
│   └── commands/
│       └── generate.ts           # Generate command
└── types/
    └── test-case.ts              # Test case types
```

## Output Structure

```
cypress/
├── e2e/
│   └── features/
│       ├── user-login.feature
│       └── user-registration.feature
├── support/
│   ├── step_definitions/
│   │   ├── steps.ts
│   │   └── common/
│   │       └── navigation.ts
│   ├── commands.ts
│   └── e2e.ts
└── fixtures/
    └── api/
        ├── postLogin.json
        └── getUserProfile.json
```

## Success Criteria

1. `ui2test generate` produces valid Gherkin files
2. Step definitions compile without errors
3. Generated tests pass with cypress-cucumber-preprocessor
4. API calls are properly intercepted
5. Selectors use stable attributes when available
6. Assertions are meaningful and correct

## Sample Output

### Generated Feature File

```gherkin
# cypress/e2e/features/user-login.feature

@login @smoke @generated
Feature: User Login

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter "user@example.com" in the email field
    And I enter my password in the password field
    And I click the "Sign In" button
    Then the login API should return status 200
    And I should be redirected to the dashboard
```

### Generated Step Definitions

```typescript
// cypress/support/step_definitions/steps.ts

import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('I am on the login page', () => {
  cy.intercept('POST', '**/api/auth/login', {
    fixture: 'api/postLogin.json'
  }).as('postLogin');

  cy.visit('/login');
});

When('I enter {string} in the email field', (email: string) => {
  cy.get('[data-testid="email-input"]').clear().type(email);
});

When('I enter my password in the password field', () => {
  cy.get('[data-testid="password-input"]').clear().type(Cypress.env('TEST_PASSWORD'));
});

When('I click the {string} button', (buttonText: string) => {
  cy.get(`[data-testid="${buttonText.toLowerCase().replace(/\\s+/g, '-')}-button"]`).click();
});

Then('the login API should return status {int}', (status: number) => {
  cy.wait('@postLogin').its('response.statusCode').should('eq', status);
});

Then('I should be redirected to the dashboard', () => {
  cy.url().should('include', '/dashboard');
});
```

### Generated Fixture

```json
// cypress/fixtures/api/postLogin.json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Test User"
  },
  "expiresAt": "{{timestamp}}"
}
```

### Terminal Display

```
╔══════════════════════════════════════════════════════════════╗
║  UI2TEST Generation Complete                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Session: user-login                                         ║
║  Duration: 1m 23s                                            ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  GENERATED FILES                                             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Features:                                                   ║
║    ✓ cypress/e2e/features/user-login.feature                ║
║                                                              ║
║  Step Definitions:                                           ║
║    ✓ cypress/support/step_definitions/steps.ts              ║
║                                                              ║
║  Fixtures:                                                   ║
║    ✓ cypress/fixtures/api/postLogin.json                    ║
║    ✓ cypress/fixtures/api/getUserProfile.json               ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  NEXT STEPS                                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Review: cypress/e2e/features/user-login.feature         ║
║  2. Run: npx cypress run --spec "**/*.feature"              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Notes

- Ensure generated tests are idempotent
- Handle sensitive data in fixtures
- Generate meaningful step descriptions
- Support regeneration without data loss
- Consider step reusability across features
