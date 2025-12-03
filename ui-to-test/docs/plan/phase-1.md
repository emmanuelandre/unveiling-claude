# Phase 1: Foundation

## Goal

Create a working CLI that can record basic UI interactions in a Playwright-controlled browser and save them to a session file.

## Scope

- Project scaffolding and build setup
- CLI with `record` and `init` commands
- Playwright browser launch and control
- Basic UI event capture (click, type, select)
- Session storage in JSON format
- Terminal output with progress display

## Checklist

### Project Setup

- [ ] Initialize npm project with TypeScript
- [ ] Configure ESLint and Prettier
- [ ] Set up Vitest for testing
- [ ] Create directory structure
- [ ] Configure tsconfig.json
- [ ] Add build scripts

### CLI Implementation

- [ ] Set up commander for CLI parsing
- [ ] Implement `ui2test --version` and `--help`
- [ ] Implement `ui2test record <url>` command
- [ ] Implement `ui2test init` command
- [ ] Add colored terminal output (chalk)
- [ ] Add progress spinner (ora)

### Recorder Implementation

- [ ] Playwright browser launch
- [ ] Browser context creation
- [ ] Page event listeners
- [ ] Click event capture
- [ ] Type/input event capture
- [ ] Select/change event capture
- [ ] Navigation event capture
- [ ] Graceful shutdown on Ctrl+C

### Selector Generation

- [ ] Extract element attributes
- [ ] Generate data-testid selector
- [ ] Generate aria-label selector
- [ ] Generate CSS selector fallback
- [ ] Selector uniqueness validation

### Session Storage

- [ ] Define session schema
- [ ] Save session to JSON
- [ ] Create .ui2test directory
- [ ] Session naming from URL

### Terminal Display

- [ ] Recording started message
- [ ] Real-time action log
- [ ] Recording duration timer
- [ ] Recording complete summary

## Key Files

```
ui-to-test/
├── src/
│   ├── index.ts                    # Entry point
│   ├── types/
│   │   ├── index.ts
│   │   ├── recording.ts            # Session types
│   │   └── interaction.ts          # UI interaction types
│   ├── cli/
│   │   ├── index.ts                # CLI setup
│   │   ├── commands/
│   │   │   ├── record.ts           # Record command
│   │   │   └── init.ts             # Init command
│   │   └── display.ts              # Terminal output
│   ├── recorder/
│   │   ├── index.ts                # Recorder class
│   │   ├── playwright-adapter.ts   # Browser control
│   │   ├── ui-capture.ts           # Event capture
│   │   └── selector-generator.ts   # Selector generation
│   └── session/
│       └── storage.ts              # Session persistence
├── bin/
│   └── ui2test                     # CLI executable
├── package.json
└── tsconfig.json
```

## Dependencies

```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "playwright": "^1.40.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Success Criteria

1. `ui2test --help` shows usage information
2. `ui2test record https://example.com` opens browser
3. Clicking, typing, and selecting are captured
4. Closing browser saves session to `.ui2test/`
5. Session JSON contains all interactions with selectors

## Sample Output

### Recording Session

```
$ ui2test record https://example.com

╔══════════════════════════════════════════════════════════════╗
║  UI2TEST Recording                                [00:00:15] ║
╠══════════════════════════════════════════════════════════════╣
║  URL: https://example.com                                    ║
║                                                              ║
║  Recent Actions:                                             ║
║  ✓ click    [data-testid="search-input"]         00:00:03   ║
║  ✓ type     "hello world"                        00:00:08   ║
║  ✓ click    [data-testid="search-button"]        00:00:12   ║
║  → waiting...                                                ║
║                                                              ║
║  Press Ctrl+C to stop recording                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Session File

```json
{
  "id": "sess_abc123",
  "name": "example-com",
  "url": "https://example.com",
  "startedAt": "2024-12-03T10:00:00.000Z",
  "endedAt": "2024-12-03T10:01:30.000Z",
  "browser": {
    "type": "chromium",
    "viewport": { "width": 1280, "height": 720 }
  },
  "interactions": [
    {
      "id": "int_001",
      "type": "click",
      "timestamp": "2024-12-03T10:00:03.000Z",
      "target": {
        "dataTestId": "search-input",
        "css": "input[data-testid=\"search-input\"]",
        "tagName": "input"
      },
      "url": "https://example.com",
      "pageTitle": "Example Domain"
    },
    {
      "id": "int_002",
      "type": "type",
      "timestamp": "2024-12-03T10:00:08.000Z",
      "target": {
        "dataTestId": "search-input",
        "css": "input[data-testid=\"search-input\"]",
        "tagName": "input"
      },
      "data": {
        "value": "hello world",
        "isPassword": false
      },
      "url": "https://example.com",
      "pageTitle": "Example Domain"
    }
  ],
  "apiCalls": [],
  "correlations": []
}
```

## Notes

- Focus on stability over features
- Ensure clean shutdown on Ctrl+C
- Handle browser crashes gracefully
- Test with multiple websites
- Document any browser-specific issues
