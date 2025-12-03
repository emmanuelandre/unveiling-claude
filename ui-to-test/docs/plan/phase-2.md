# Phase 2: API Capture

## Goal

Capture all API calls during recording sessions and correlate them with UI interactions.

## Scope

- Network request interception via Playwright
- Request/response capture with headers and bodies
- URL pattern generation for test intercepts
- UI-to-API correlation engine
- Multiple correlation strategies
- Confidence scoring

## Checklist

### Network Capture

- [ ] Set up Playwright route interception
- [ ] Capture XHR requests
- [ ] Capture Fetch requests
- [ ] Record request method, URL, headers
- [ ] Record request body (JSON, form data)
- [ ] Record response status, headers
- [ ] Record response body
- [ ] Calculate response timing
- [ ] Filter static assets (images, CSS, fonts)
- [ ] Filter analytics/telemetry endpoints

### API Classification

- [ ] Detect REST API calls
- [ ] Detect GraphQL calls
- [ ] Classify as data fetch vs mutation
- [ ] Identify authentication endpoints
- [ ] Mark primary vs supporting calls

### URL Pattern Generation

- [ ] Extract path segments
- [ ] Identify dynamic segments (IDs, UUIDs)
- [ ] Generate wildcard patterns
- [ ] Handle query parameters

### Correlation Engine

- [ ] Define correlation interface
- [ ] Implement timing strategy
- [ ] Implement content strategy
- [ ] Implement sequence strategy
- [ ] Implement form submit strategy
- [ ] Combine evidence from strategies
- [ ] Calculate confidence scores

### Polling Detection

- [ ] Detect repeated API calls
- [ ] Identify regular intervals
- [ ] Filter polling calls from correlation
- [ ] Mark as background traffic

### Terminal Display

- [ ] Show API call count
- [ ] List recent API calls
- [ ] Show correlation status
- [ ] Display endpoint summary

## Key Files

```
src/
├── recorder/
│   └── network-capture.ts        # Network interception
├── parser/
│   ├── index.ts
│   └── api-parser.ts             # API call parsing
├── correlation/
│   ├── index.ts                  # Correlator
│   ├── types.ts                  # Correlation types
│   └── strategies/
│       ├── timing.ts             # Timing strategy
│       ├── content.ts            # Content strategy
│       ├── sequence.ts           # Sequence strategy
│       └── form-submit.ts        # Form submit strategy
└── types/
    ├── api-call.ts               # API call types
    └── correlation.ts            # Correlation types
```

## Correlation Strategies

### 1. Timing Strategy

```typescript
// API calls within time window of interaction
const THRESHOLDS = {
  immediate: 100,   // < 100ms: weight 0.9
  quick: 500,       // < 500ms: weight 0.6
  delayed: 2000,    // < 2000ms: weight 0.3
};
```

### 2. Content Strategy

```typescript
// Form values appear in request body/params
// Examples:
// - Type "user@email.com" → body.email = "user@email.com"
// - Select "Option A" → query.filter = "option-a"
```

### 3. Sequence Strategy

```typescript
// Common patterns:
// - Click link → Navigate → GET /new-page
// - Click search → GET /search?q=...
// - Submit form → POST /api/endpoint
```

### 4. Form Submit Strategy

```typescript
// Button type="submit" → POST/PUT request
// Form contains inputs → values in request body
```

## Success Criteria

1. All XHR/Fetch requests captured during recording
2. Request/response bodies properly parsed
3. Static assets filtered out
4. API calls linked to triggering UI actions
5. Correlation confidence scores calculated
6. Polling endpoints detected and filtered

## Sample Output

### Session with API Calls

```json
{
  "id": "sess_def456",
  "interactions": [
    {
      "id": "int_001",
      "type": "click",
      "target": { "dataTestId": "login-button" }
    }
  ],
  "apiCalls": [
    {
      "id": "api_001",
      "timestamp": "2024-12-03T10:00:05.150Z",
      "request": {
        "method": "POST",
        "url": "https://api.example.com/auth/login",
        "headers": { "Content-Type": "application/json" },
        "body": { "email": "user@example.com", "password": "***" }
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": { "token": "jwt...", "user": { "id": 1 } },
        "duration": 234
      },
      "classification": { "type": "auth", "isPrimary": true }
    }
  ],
  "correlations": [
    {
      "id": "corr_001",
      "interactionId": "int_001",
      "apiCallIds": ["api_001"],
      "correlationType": "direct",
      "confidence": 92,
      "evidence": [
        { "type": "timing", "description": "API call 150ms after click", "weight": 0.85 },
        { "type": "form_submit", "description": "Click on submit button triggered POST", "weight": 0.9 }
      ]
    }
  ]
}
```

### Terminal Display

```
╔══════════════════════════════════════════════════════════════╗
║  UI2TEST Recording                                [00:01:23] ║
╠══════════════════════════════════════════════════════════════╣
║  URL: https://app.example.com/login                          ║
║                                                              ║
║  Recent Actions:                                             ║
║  ✓ click    [data-testid="login-button"]         00:01:05   ║
║                                                              ║
║  API Calls: 3 captured                                       ║
║  ├─ POST /api/auth/login      (200) 234ms  ← click          ║
║  ├─ GET  /api/user/profile    (200) 89ms   ← navigation     ║
║  └─ GET  /api/notifications   (200) 45ms   ← navigation     ║
║                                                              ║
║  Polling: 1 endpoint filtered                                ║
║                                                              ║
║  Press Ctrl+C to stop recording                              ║
╚══════════════════════════════════════════════════════════════╝
```

## Notes

- Handle large response bodies (truncate or reference)
- Sanitize sensitive data (passwords, tokens)
- Consider memory usage for long sessions
- Test with GraphQL APIs
- Handle failed requests (network errors)
