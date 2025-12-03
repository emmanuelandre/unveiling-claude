# Recorder Architecture

## Overview

The Recorder is responsible for launching a Playwright-controlled browser, capturing UI interactions, and intercepting network traffic. It produces raw event streams that feed into the parser and correlation engine.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RECORDER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     Playwright Browser                                 │ │
│  │                                                                        │ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │ │
│  │  │   Page      │    │   Context   │    │   Browser   │               │ │
│  │  │             │    │             │    │             │               │ │
│  │  │ • Events    │    │ • Network   │    │ • Launch    │               │ │
│  │  │ • DOM       │    │ • Cookies   │    │ • Close     │               │ │
│  │  │ • Console   │    │ • Storage   │    │ • Contexts  │               │ │
│  │  └─────────────┘    └─────────────┘    └─────────────┘               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                               │                                             │
│           ┌───────────────────┼───────────────────┐                        │
│           │                   │                   │                        │
│           ▼                   ▼                   ▼                        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │ UI Capture  │     │  Network    │     │ Screenshot  │                  │
│  │             │     │  Capture    │     │  Capture    │                  │
│  │ • Clicks    │     │ • XHR       │     │ • On action │                  │
│  │ • Types     │     │ • Fetch     │     │ • On demand │                  │
│  │ • Selects   │     │ • Headers   │     │ • Full page │                  │
│  │ • Navigates │     │ • Bodies    │     │             │                  │
│  └─────────────┘     └─────────────┘     └─────────────┘                  │
│           │                   │                   │                        │
│           └───────────────────┼───────────────────┘                        │
│                               ▼                                             │
│                      ┌─────────────┐                                        │
│                      │ Event Stream│                                        │
│                      │             │                                        │
│                      │ • UI Events │                                        │
│                      │ • API Calls │                                        │
│                      │ • Metadata  │                                        │
│                      └─────────────┘                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Playwright Integration

### Browser Launch

```typescript
interface BrowserOptions {
  type: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
}

async function launchBrowser(options: BrowserOptions): Promise<Browser> {
  const browserType = playwright[options.type];

  return browserType.launch({
    headless: options.headless,
    devtools: !options.headless,
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ],
  });
}

async function createRecordingContext(
  browser: Browser,
  options: BrowserOptions
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: options.viewport,
    recordVideo: undefined,  // Optional video recording
    ignoreHTTPSErrors: true,
  });
}
```

### Event Attachment

```typescript
async function attachRecordingListeners(page: Page): Promise<void> {
  // UI event capture via CDP
  const client = await page.context().newCDPSession(page);

  // Enable DOM events
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  // Inject recording script
  await page.addInitScript(recordingScript);

  // Listen for events from injected script
  await page.exposeFunction('__ui2test_capture', (event: RawUIEvent) => {
    eventEmitter.emit('ui-event', event);
  });
}
```

## UI Event Capture

### Injected Script

The recorder injects a script into the page to capture user interactions:

```typescript
// recording-script.ts (injected into page)
const CAPTURE_EVENTS = [
  'click',
  'dblclick',
  'input',
  'change',
  'submit',
  'keydown',
  'focus',
  'blur',
];

function setupEventCapture() {
  CAPTURE_EVENTS.forEach(eventType => {
    document.addEventListener(eventType, captureEvent, { capture: true });
  });
}

function captureEvent(event: Event) {
  const target = event.target as HTMLElement;
  if (!target) return;

  const eventData: RawUIEvent = {
    type: event.type,
    timestamp: Date.now(),
    target: extractElementInfo(target),
    data: extractEventData(event),
    url: window.location.href,
    title: document.title,
  };

  // Send to Node.js via exposed function
  (window as any).__ui2test_capture(eventData);
}

function extractElementInfo(element: HTMLElement): RawElementInfo {
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    className: element.className || undefined,
    name: element.getAttribute('name') || undefined,
    type: element.getAttribute('type') || undefined,
    role: element.getAttribute('role') || undefined,
    ariaLabel: element.getAttribute('aria-label') || undefined,
    dataTestId: element.getAttribute('data-testid') ||
                element.getAttribute('data-cy') ||
                element.getAttribute('data-test') || undefined,
    innerText: element.innerText?.slice(0, 100) || undefined,
    href: (element as HTMLAnchorElement).href || undefined,
    value: (element as HTMLInputElement).value || undefined,
    checked: (element as HTMLInputElement).checked,
    selectedIndex: (element as HTMLSelectElement).selectedIndex,
    boundingBox: element.getBoundingClientRect(),
    xpath: getXPath(element),
    cssSelector: getCSSSelector(element),
  };
}
```

### Event Processing

```typescript
interface UIEventProcessor {
  process(raw: RawUIEvent): UIInteraction | null;
}

class ClickProcessor implements UIEventProcessor {
  process(raw: RawUIEvent): UIInteraction | null {
    if (raw.type !== 'click' && raw.type !== 'dblclick') return null;

    return {
      id: generateId(),
      type: raw.type === 'dblclick' ? 'dblclick' : 'click',
      timestamp: new Date(raw.timestamp),
      target: this.generateSelector(raw.target),
      data: {
        button: 'left',
        clickCount: raw.type === 'dblclick' ? 2 : 1,
      },
      url: raw.url,
      pageTitle: raw.title,
    };
  }
}

class TypeProcessor implements UIEventProcessor {
  private buffer = new Map<string, string>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  process(raw: RawUIEvent): UIInteraction | null {
    if (raw.type !== 'input') return null;

    const elementKey = raw.target.cssSelector;
    const currentValue = raw.target.value || '';

    // Debounce typing events
    this.buffer.set(elementKey, currentValue);

    clearTimeout(this.debounceTimers.get(elementKey));

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        const finalValue = this.buffer.get(elementKey);
        this.buffer.delete(elementKey);

        resolve({
          id: generateId(),
          type: 'type',
          timestamp: new Date(raw.timestamp),
          target: this.generateSelector(raw.target),
          data: {
            value: finalValue,
            isPassword: raw.target.type === 'password',
          },
          url: raw.url,
          pageTitle: raw.title,
        });
      }, 500); // Debounce 500ms

      this.debounceTimers.set(elementKey, timer);
    });
  }
}
```

## Selector Generation

### Priority-Based Strategy

```typescript
type SelectorStrategy =
  | 'dataTestId'
  | 'ariaLabel'
  | 'role'
  | 'id'
  | 'semantic'
  | 'css';

interface SelectorResult {
  selector: string;
  strategy: SelectorStrategy;
  confidence: number;  // 0-100
}

class SelectorGenerator {
  private strategies: SelectorStrategy[] = [
    'dataTestId',
    'ariaLabel',
    'role',
    'id',
    'semantic',
    'css',
  ];

  generate(element: RawElementInfo): SelectorResult {
    for (const strategy of this.strategies) {
      const result = this.tryStrategy(strategy, element);
      if (result && this.isUnique(result.selector)) {
        return result;
      }
    }

    // Fallback to CSS with parent chain
    return this.generateCSSWithContext(element);
  }

  private tryStrategy(
    strategy: SelectorStrategy,
    element: RawElementInfo
  ): SelectorResult | null {
    switch (strategy) {
      case 'dataTestId':
        if (element.dataTestId) {
          return {
            selector: `[data-testid="${element.dataTestId}"]`,
            strategy: 'dataTestId',
            confidence: 95,
          };
        }
        break;

      case 'ariaLabel':
        if (element.ariaLabel) {
          return {
            selector: `[aria-label="${element.ariaLabel}"]`,
            strategy: 'ariaLabel',
            confidence: 85,
          };
        }
        break;

      case 'role':
        if (element.role && element.innerText) {
          const text = element.innerText.slice(0, 50);
          return {
            selector: `[role="${element.role}"]:contains("${text}")`,
            strategy: 'role',
            confidence: 75,
          };
        }
        break;

      case 'id':
        if (element.id && !this.isGeneratedId(element.id)) {
          return {
            selector: `#${element.id}`,
            strategy: 'id',
            confidence: 80,
          };
        }
        break;

      case 'semantic':
        return this.generateSemanticSelector(element);

      case 'css':
        return {
          selector: element.cssSelector,
          strategy: 'css',
          confidence: 40,
        };
    }

    return null;
  }

  private isGeneratedId(id: string): boolean {
    const generatedPatterns = [
      /^:r[0-9a-z]+:/,      // React
      /^ember[0-9]+$/,       // Ember
      /^ng-[a-z]+-[0-9]+$/,  // Angular
      /^[a-f0-9]{8,}$/,      // Hash-based
    ];

    return generatedPatterns.some(pattern => pattern.test(id));
  }

  private generateSemanticSelector(element: RawElementInfo): SelectorResult | null {
    // Button with type submit
    if (element.tagName === 'button' && element.type === 'submit') {
      return {
        selector: 'button[type="submit"]',
        strategy: 'semantic',
        confidence: 60,
      };
    }

    // Input with name
    if (element.tagName === 'input' && element.name) {
      return {
        selector: `input[name="${element.name}"]`,
        strategy: 'semantic',
        confidence: 65,
      };
    }

    // Link with href
    if (element.tagName === 'a' && element.href) {
      const path = new URL(element.href).pathname;
      return {
        selector: `a[href="${path}"]`,
        strategy: 'semantic',
        confidence: 55,
      };
    }

    return null;
  }
}
```

### Selector Validation

```typescript
class SelectorValidator {
  constructor(private page: Page) {}

  async isUnique(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count === 1;
  }

  async validateSelector(selector: string): Promise<ValidationResult> {
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();

      return {
        valid: true,
        unique: count === 1,
        matchCount: count,
        visible: count > 0 ? await locator.first().isVisible() : false,
      };
    } catch (error) {
      return {
        valid: false,
        unique: false,
        matchCount: 0,
        visible: false,
        error: error.message,
      };
    }
  }
}
```

## Network Interception

### Route-Based Capture

```typescript
interface NetworkCapture {
  setup(context: BrowserContext): Promise<void>;
  getAPIcalls(): APICall[];
}

class PlaywrightNetworkCapture implements NetworkCapture {
  private apiCalls: APICall[] = [];
  private pendingRequests = new Map<string, PendingRequest>();

  async setup(context: BrowserContext): Promise<void> {
    await context.route('**/*', async (route, request) => {
      const url = request.url();

      // Skip static assets
      if (this.isStaticAsset(url)) {
        await route.continue();
        return;
      }

      const requestId = generateId();
      const startTime = Date.now();

      // Store pending request
      this.pendingRequests.set(requestId, {
        request,
        startTime,
        method: request.method(),
        url,
        headers: request.headers(),
        body: request.postData(),
      });

      // Continue request and capture response
      const response = await route.fetch();

      const apiCall = await this.createAPICall(requestId, response);
      this.apiCalls.push(apiCall);

      // Forward response to browser
      await route.fulfill({ response });
    });
  }

  private async createAPICall(
    requestId: string,
    response: APIResponse
  ): Promise<APICall> {
    const pending = this.pendingRequests.get(requestId)!;
    this.pendingRequests.delete(requestId);

    const responseBody = await this.safeGetBody(response);

    return {
      id: requestId,
      timestamp: new Date(pending.startTime),
      request: {
        method: pending.method as HTTPMethod,
        url: pending.url,
        headers: pending.headers,
        body: this.parseBody(pending.body),
      },
      response: {
        status: response.status(),
        headers: response.headers(),
        body: responseBody,
        duration: Date.now() - pending.startTime,
      },
      classification: this.classifyRequest(pending, response),
    };
  }

  private isStaticAsset(url: string): boolean {
    const staticExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
      '.css', '.woff', '.woff2', '.ttf', '.eot',
      '.js', '.map',
    ];

    return staticExtensions.some(ext => url.includes(ext));
  }

  private classifyRequest(
    request: PendingRequest,
    response: APIResponse
  ): APIClassification {
    const url = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    // Auth endpoints
    if (url.includes('/auth') || url.includes('/login') || url.includes('/token')) {
      return { type: 'auth', isPrimary: true };
    }

    // Data mutation
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return { type: 'mutation', isPrimary: true };
    }

    // Data fetch
    if (method === 'GET' && response.headers()['content-type']?.includes('json')) {
      return { type: 'data_fetch', isPrimary: true };
    }

    return { type: 'static', isPrimary: false };
  }
}
```

## Session Management

### Recording Session Lifecycle

```typescript
class RecordingSession {
  private status: 'idle' | 'recording' | 'paused' | 'stopped' = 'idle';
  private interactions: UIInteraction[] = [];
  private apiCalls: APICall[] = [];
  private startTime: Date | null = null;

  async start(url: string, options: RecordOptions): Promise<void> {
    this.status = 'recording';
    this.startTime = new Date();

    // Launch browser
    const browser = await launchBrowser(options);
    const context = await createRecordingContext(browser, options);
    const page = await context.newPage();

    // Setup captures
    await attachRecordingListeners(page);
    await networkCapture.setup(context);

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle' });

    // Listen for events
    eventEmitter.on('ui-event', event => {
      if (this.status === 'recording') {
        this.interactions.push(event);
      }
    });
  }

  pause(): void {
    this.status = 'paused';
  }

  resume(): void {
    this.status = 'recording';
  }

  async stop(): Promise<RecordingSession> {
    this.status = 'stopped';

    return {
      id: generateId(),
      name: this.options.name,
      url: this.options.url,
      startedAt: this.startTime!,
      endedAt: new Date(),
      browser: this.options.browser,
      interactions: this.interactions,
      apiCalls: networkCapture.getAPICalls(),
      correlations: [], // Populated by correlator
    };
  }
}
```

## Edge Case Handling

### SPA Navigation

```typescript
class SPANavigationHandler {
  constructor(private page: Page) {}

  async setup(): Promise<void> {
    // Listen for History API changes
    await this.page.exposeFunction('__ui2test_navigation', (data: NavigationData) => {
      eventEmitter.emit('navigation', data);
    });

    await this.page.addInitScript(`
      const originalPushState = history.pushState;
      history.pushState = function(...args) {
        window.__ui2test_navigation({
          type: 'pushState',
          from: window.location.href,
          to: args[2],
        });
        return originalPushState.apply(this, args);
      };

      window.addEventListener('popstate', () => {
        window.__ui2test_navigation({
          type: 'popstate',
          to: window.location.href,
        });
      });
    `);
  }
}
```

### Infinite Scroll Detection

```typescript
class InfiniteScrollHandler {
  private scrollEvents: ScrollEvent[] = [];

  detect(): boolean {
    // Check for repeated scroll events that trigger API calls
    const recentScrolls = this.scrollEvents.slice(-10);

    return recentScrolls.length >= 5 &&
           this.hasRepeatingPattern(recentScrolls);
  }

  consolidate(events: ScrollEvent[]): UIInteraction {
    // Consolidate multiple scroll events into one "scroll to load" action
    return {
      id: generateId(),
      type: 'scroll',
      timestamp: events[0].timestamp,
      target: { css: 'window' },
      data: {
        type: 'infinite_scroll',
        loadCount: events.length,
      },
    };
  }
}
```

## Real-Time Display

### Progress Reporting

```typescript
interface RecordingProgress {
  duration: number;
  interactionCount: number;
  apiCallCount: number;
  recentActions: RecentAction[];
  status: 'recording' | 'paused';
}

function formatProgress(progress: RecordingProgress): string {
  const duration = formatDuration(progress.duration);
  const actions = progress.recentActions
    .slice(-5)
    .map(a => `  ✓ ${a.type.padEnd(8)} ${a.selector.slice(0, 40)}`)
    .join('\n');

  return `
╔══════════════════════════════════════════════════════════════╗
║  Recording [${duration}]                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Actions: ${progress.interactionCount}  API Calls: ${progress.apiCallCount}
║
║  Recent:
${actions}
║
║  Press Ctrl+C to stop
╚══════════════════════════════════════════════════════════════╝`;
}
```
