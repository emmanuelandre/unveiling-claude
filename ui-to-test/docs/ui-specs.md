# UI-to-Test CLI Specifications

## Overview

UI-to-Test provides a command-line interface for recording browser interactions and generating tests. The CLI prioritizes simplicity with sensible defaults while offering advanced configuration when needed.

## Installation

```bash
# Global installation
npm install -g ui2test

# Project-local installation
npm install --save-dev ui2test
npx ui2test --help
```

## Commands

### `record` - Record Browser Session

Start a recording session by launching a browser and capturing interactions.

```bash
ui2test record <url> [options]
```

#### Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `url` | Target URL to record | Yes |

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--name <name>` | `-n` | Session name | Auto from URL |
| `--output <dir>` | `-o` | Output directory | `./cypress/e2e` |
| `--browser <type>` | `-b` | Browser type | `chromium` |
| `--viewport <size>` | `-v` | Viewport dimensions | `1280x720` |
| `--timeout <ms>` | `-t` | Max recording time | `300000` (5min) |
| `--api-filter <pattern>` | | URL pattern for API capture | `**` |
| `--no-api` | | Skip API capture | `false` |
| `--auth <file>` | | Load auth state from file | - |
| `--headless` | | Run in headless mode | `false` |

#### Examples

```bash
# Basic recording
ui2test record https://myapp.com

# Named session with custom output
ui2test record https://myapp.com --name login-flow --output ./tests

# With authentication state
ui2test record https://myapp.com --auth ./auth-state.json

# Filter API calls to specific endpoints
ui2test record https://myapp.com --api-filter "/api/**"

# Firefox with custom viewport
ui2test record https://myapp.com --browser firefox --viewport 1920x1080
```

### `generate` - Generate Tests from Session

Generate test files from a previously recorded session.

```bash
ui2test generate [options]
```

#### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--session <file>` | `-s` | Session file path | Latest in `.ui2test/` |
| `--output <dir>` | `-o` | Output directory | `./cypress/e2e` |
| `--format <type>` | `-f` | Output format | `cucumber` |
| `--api-mode <mode>` | | API mocking mode | `stubbed` |
| `--split-by <strategy>` | | Test splitting strategy | `flow` |
| `--overwrite` | | Overwrite existing files | `false` |

#### API Modes

| Mode | Description |
|------|-------------|
| `stubbed` | All API calls mocked with captured responses |
| `live` | All API calls hit real backend |
| `hybrid` | Configurable per endpoint via config |

#### Examples

```bash
# Generate from latest session
ui2test generate

# Generate from specific session
ui2test generate --session ./recordings/login-session.json

# Generate with live API mode
ui2test generate --api-mode live

# Overwrite existing tests
ui2test generate --overwrite
```

### `init` - Initialize Configuration

Create a configuration file with interactive prompts or defaults.

```bash
ui2test init [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--defaults` | Use all defaults, no prompts | `false` |

#### Interactive Prompts

```
? Output directory for generated tests: ./cypress/e2e
? Default browser: (chromium/firefox/webkit) chromium
? Default API mode: (stubbed/live/hybrid) stubbed
? Selector priority: data-testid, aria-label, css
? Create config file? Yes

Created .ui2testrc.json
```

### `replay` - Replay Recording

Replay a recorded session for verification.

```bash
ui2test replay <session> [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--speed <multiplier>` | Playback speed | `1.0` |
| `--pause-on-error` | Pause on interaction failure | `false` |

## Configuration

### Configuration File

UI-to-Test looks for configuration in these locations (in order):

1. `.ui2testrc.json`
2. `.ui2testrc.yaml`
3. `ui2test.config.js`
4. `package.json` (`ui2test` key)

### Configuration Schema

```json
{
  "$schema": "https://ui2test.dev/schema/config.json",

  "output": {
    "directory": "./cypress/e2e",
    "format": "cucumber",
    "overwrite": false
  },

  "browser": {
    "type": "chromium",
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "headless": false
  },

  "recording": {
    "timeout": 300000,
    "screenshotOnAction": false,
    "captureConsole": false
  },

  "selectors": {
    "priority": [
      "data-testid",
      "data-cy",
      "aria-label",
      "role",
      "id",
      "css"
    ],
    "excludePatterns": [
      "css-[a-z0-9]+",
      "sc-[a-zA-Z]+-[a-z0-9]+"
    ]
  },

  "api": {
    "capture": true,
    "mode": "stubbed",
    "filter": "**",
    "ignore": [
      "**/*.png",
      "**/*.jpg",
      "**/*.css",
      "**/*.woff*",
      "**/analytics/**",
      "**/telemetry/**"
    ],
    "hybridConfig": {
      "stub": ["/api/users/**"],
      "live": ["/api/auth/**"]
    }
  },

  "generation": {
    "splitBy": "flow",
    "includeComments": true,
    "generateFixtures": true,
    "assertionInference": true
  },

  "session": {
    "directory": "./.ui2test",
    "maxSessions": 10
  }
}
```

### Configuration Options Reference

#### `output`

| Key | Type | Description |
|-----|------|-------------|
| `directory` | `string` | Output directory for generated tests |
| `format` | `"cucumber"` | Output format (currently only cucumber) |
| `overwrite` | `boolean` | Overwrite existing files |

#### `browser`

| Key | Type | Description |
|-----|------|-------------|
| `type` | `"chromium" \| "firefox" \| "webkit"` | Browser engine |
| `viewport.width` | `number` | Viewport width in pixels |
| `viewport.height` | `number` | Viewport height in pixels |
| `headless` | `boolean` | Run browser in headless mode |

#### `selectors`

| Key | Type | Description |
|-----|------|-------------|
| `priority` | `string[]` | Selector strategy priority order |
| `excludePatterns` | `string[]` | Regex patterns for unstable selectors |

#### `api`

| Key | Type | Description |
|-----|------|-------------|
| `capture` | `boolean` | Enable API capture |
| `mode` | `"stubbed" \| "live" \| "hybrid"` | Default API mocking mode |
| `filter` | `string` | Glob pattern for URLs to capture |
| `ignore` | `string[]` | Glob patterns for URLs to ignore |
| `hybridConfig` | `object` | Per-endpoint stub/live configuration |

## Terminal Output

### Recording Session Display

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  UI2TEST Recording                                               [00:01:23]  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  URL: https://app.example.com/login                                          ║
║  Session: login-flow                                                         ║
║                                                                              ║
║  Recent Actions:                                                             ║
║  ✓ click    [data-testid="email-input"]                         00:00:12    ║
║  ✓ type     "user@example.com"                                  00:00:15    ║
║  ✓ click    [data-testid="password-input"]                      00:00:18    ║
║  ✓ type     ********                                            00:00:22    ║
║  ✓ click    [data-testid="login-button"]                        00:00:25    ║
║  → waiting...                                                                ║
║                                                                              ║
║  API Calls: 3 captured                                                       ║
║  ├─ POST /api/auth/login      (200) 234ms                                   ║
║  ├─ GET  /api/user/profile    (200) 89ms                                    ║
║  └─ GET  /api/notifications   (200) 45ms                                    ║
║                                                                              ║
║  Press Ctrl+C to stop recording                                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Generation Report

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  UI2TEST Generation Report                                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Session: login-flow                                                         ║
║  Duration: 1m 23s                                                            ║
║  Generated: 2024-12-03 10:30:00                                              ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  SELECTOR QUALITY                                                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ████████████████████░░░░░░░░░░  67% Excellent (data-testid)                ║
║  ██████░░░░░░░░░░░░░░░░░░░░░░░░  17% Good (ARIA attributes)                 ║
║  ████░░░░░░░░░░░░░░░░░░░░░░░░░░   8% Moderate (semantic HTML)               ║
║  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8% Poor (CSS class-based)                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  GENERATED FILES                                                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Features:                                                                   ║
║    ✓ cypress/e2e/features/login-flow.feature                                ║
║                                                                              ║
║  Step Definitions:                                                           ║
║    ✓ cypress/support/step_definitions/login-flow.steps.ts                   ║
║                                                                              ║
║  Fixtures:                                                                   ║
║    ✓ cypress/fixtures/api/login.json                                        ║
║    ✓ cypress/fixtures/api/user-profile.json                                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  QUALITY SCORE: 87/100                                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Recommendations:                                                            ║
║  ⚠ Consider adding data-testid to: .modal-footer button.primary             ║
║  ⚠ CSS selector at line 23 may be unstable                                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  NEXT STEPS                                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  1. Review: cypress/e2e/features/login-flow.feature                         ║
║  2. Run: npx cypress run --spec "cypress/e2e/features/login-flow.feature"   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Error Messages

Errors are displayed with actionable guidance:

```
✖ Error: Could not connect to https://app.example.com

Possible causes:
  • The URL is incorrect or the server is down
  • Network connectivity issues
  • SSL certificate problems

Try:
  ui2test record https://app.example.com --ignore-ssl-errors
  ui2test record http://localhost:3000  # For local development

For more help: ui2test --help
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UI2TEST_CONFIG` | Path to config file | Auto-detected |
| `UI2TEST_OUTPUT` | Default output directory | `./cypress/e2e` |
| `UI2TEST_BROWSER` | Default browser | `chromium` |
| `UI2TEST_API_MODE` | Default API mode | `stubbed` |
| `UI2TEST_DEBUG` | Enable debug logging | `false` |

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | Configuration error |
| `4` | Recording error |
| `5` | Generation error |
| `130` | User interrupt (Ctrl+C) |

## Keyboard Shortcuts (During Recording)

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Stop recording and generate tests |
| `Ctrl+P` | Pause/resume recording |
| `Ctrl+S` | Take manual screenshot |
| `Ctrl+A` | Add annotation to current action |
