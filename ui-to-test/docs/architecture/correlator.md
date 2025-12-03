# Correlator Architecture

## Overview

The Correlator links UI interactions with their resulting API calls. It uses multiple strategies to determine causality and assigns confidence scores to each correlation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORRELATOR                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐     ┌─────────────────────┐                       │
│  │   UI Interactions   │     │     API Calls       │                       │
│  │                     │     │                     │                       │
│  │ • Click @ 00:01.200 │     │ • POST @ 00:01.350  │                       │
│  │ • Type  @ 00:02.500 │     │ • GET  @ 00:02.700  │                       │
│  │ • Click @ 00:03.100 │     │ • POST @ 00:03.250  │                       │
│  └─────────────────────┘     └─────────────────────┘                       │
│             │                         │                                     │
│             └───────────┬─────────────┘                                     │
│                         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Correlation Strategies                            │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │   Timing    │  │   Content   │  │  Sequence   │  │ Form       │ │   │
│  │  │   Strategy  │  │   Strategy  │  │  Strategy   │  │ Submit     │ │   │
│  │  │             │  │             │  │             │  │ Strategy   │ │   │
│  │  │ • < 100ms   │  │ • Data in   │  │ • Click →   │  │ • Form →   │ │   │
│  │  │ • < 500ms   │  │   request   │  │   Navigate  │  │   POST     │ │   │
│  │  │ • < 2000ms  │  │ • URL match │  │   → API     │  │            │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Evidence Aggregator                               │   │
│  │                                                                      │   │
│  │  Evidence[] ──▶ Weight Calculation ──▶ Confidence Score             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                         │                                                   │
│                         ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Correlations Output                               │   │
│  │                                                                      │   │
│  │  { interactionId, apiCallIds[], confidence, evidence[] }            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Interface

```typescript
interface Correlator {
  correlate(
    interactions: UIInteraction[],
    apiCalls: APICall[]
  ): InteractionAPICorrelation[];
}

interface CorrelationStrategy {
  name: string;
  evaluate(
    interaction: UIInteraction,
    candidates: APICall[]
  ): CorrelationEvidence[];
}

interface CorrelationEvidence {
  type: 'timing' | 'content' | 'sequence' | 'form_submit';
  description: string;
  weight: number;  // 0.0 - 1.0
  apiCallId: string;
}

interface InteractionAPICorrelation {
  id: string;
  interactionId: string;
  apiCallIds: string[];
  correlationType: CorrelationType;
  confidence: number;  // 0 - 100
  evidence: CorrelationEvidence[];
}

type CorrelationType =
  | 'direct'       // Click immediately triggers API
  | 'debounced'    // Type triggers delayed API
  | 'form_submit'  // Form submission triggers API
  | 'navigation'   // Navigation triggers API calls
  | 'polling'      // Background/periodic API
  | 'unknown';
```

## Correlation Strategies

### 1. Timing Strategy

Links API calls that occur within a time window after a UI interaction.

```typescript
class TimingCorrelationStrategy implements CorrelationStrategy {
  name = 'timing';

  private thresholds = {
    immediate: 100,   // < 100ms = highly correlated
    quick: 500,       // < 500ms = likely correlated
    delayed: 2000,    // < 2000ms = possibly correlated (debounce)
  };

  evaluate(
    interaction: UIInteraction,
    candidates: APICall[]
  ): CorrelationEvidence[] {
    const evidence: CorrelationEvidence[] = [];
    const interactionTime = interaction.timestamp.getTime();

    for (const call of candidates) {
      const callTime = call.timestamp.getTime();
      const delay = callTime - interactionTime;

      // Only consider API calls after the interaction
      if (delay < 0) continue;

      if (delay < this.thresholds.immediate) {
        evidence.push({
          type: 'timing',
          description: `API call ${delay}ms after interaction (immediate)`,
          weight: 0.9,
          apiCallId: call.id,
        });
      } else if (delay < this.thresholds.quick) {
        evidence.push({
          type: 'timing',
          description: `API call ${delay}ms after interaction (quick)`,
          weight: 0.6,
          apiCallId: call.id,
        });
      } else if (delay < this.thresholds.delayed) {
        evidence.push({
          type: 'timing',
          description: `API call ${delay}ms after interaction (delayed)`,
          weight: 0.3,
          apiCallId: call.id,
        });
      }
    }

    return evidence;
  }
}
```

### 2. Content Strategy

Matches data from UI interactions to API request content.

```typescript
class ContentCorrelationStrategy implements CorrelationStrategy {
  name = 'content';

  evaluate(
    interaction: UIInteraction,
    candidates: APICall[]
  ): CorrelationEvidence[] {
    const evidence: CorrelationEvidence[] = [];

    // Extract values from interaction
    const interactionValues = this.extractValues(interaction);

    for (const call of candidates) {
      for (const value of interactionValues) {
        // Check query parameters
        const queryMatch = this.checkQueryParams(value, call);
        if (queryMatch) {
          evidence.push({
            type: 'content',
            description: `Value "${value}" found in query param "${queryMatch}"`,
            weight: 0.8,
            apiCallId: call.id,
          });
        }

        // Check request body
        const bodyMatch = this.checkRequestBody(value, call);
        if (bodyMatch) {
          evidence.push({
            type: 'content',
            description: `Value "${value}" found in request body at "${bodyMatch}"`,
            weight: 0.85,
            apiCallId: call.id,
          });
        }

        // Check URL path
        const pathMatch = this.checkURLPath(value, call);
        if (pathMatch) {
          evidence.push({
            type: 'content',
            description: `Value "${value}" found in URL path`,
            weight: 0.7,
            apiCallId: call.id,
          });
        }
      }
    }

    return evidence;
  }

  private extractValues(interaction: UIInteraction): string[] {
    const values: string[] = [];

    switch (interaction.type) {
      case 'type':
        const typeData = interaction.data as TypeData;
        if (!typeData.isPassword && typeData.value) {
          values.push(typeData.value);
        }
        break;

      case 'select':
        const selectData = interaction.data as SelectData;
        values.push(selectData.selectedValue);
        break;

      case 'click':
        // Check if clicking on element with data
        if (interaction.target.id) {
          values.push(interaction.target.id);
        }
        break;
    }

    return values.filter(v => v && v.length > 2);
  }

  private checkQueryParams(value: string, call: APICall): string | null {
    const url = new URL(call.request.url);

    for (const [key, paramValue] of url.searchParams) {
      if (paramValue.includes(value)) {
        return key;
      }
    }

    return null;
  }

  private checkRequestBody(value: string, call: APICall): string | null {
    if (!call.request.body) return null;

    const bodyStr = JSON.stringify(call.request.body);
    if (bodyStr.includes(value)) {
      // Find the path to the value
      return this.findJsonPath(call.request.body, value);
    }

    return null;
  }

  private findJsonPath(obj: unknown, value: string, path = ''): string | null {
    if (typeof obj === 'string' && obj.includes(value)) {
      return path || 'root';
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const [key, val] of Object.entries(obj)) {
        const result = this.findJsonPath(val, value, path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }

    return null;
  }
}
```

### 3. Sequence Strategy

Identifies patterns like click → navigate → API calls.

```typescript
class SequenceCorrelationStrategy implements CorrelationStrategy {
  name = 'sequence';

  evaluate(
    interaction: UIInteraction,
    candidates: APICall[]
  ): CorrelationEvidence[] {
    const evidence: CorrelationEvidence[] = [];

    // Check for navigation trigger
    if (interaction.type === 'click') {
      const linkElement = interaction.target.tagName === 'a';
      const buttonElement = interaction.target.tagName === 'button';

      // Clicks on links/buttons often trigger navigation + API calls
      if (linkElement || buttonElement) {
        // Find API calls to the new page's domain
        const pageLoadCalls = candidates.filter(call =>
          this.isPageLoadCall(call, interaction)
        );

        for (const call of pageLoadCalls) {
          evidence.push({
            type: 'sequence',
            description: 'Click triggered navigation and subsequent API call',
            weight: 0.75,
            apiCallId: call.id,
          });
        }
      }
    }

    // Check for search pattern: type → debounce → GET
    if (interaction.type === 'type') {
      const searchCalls = candidates.filter(call =>
        call.request.method === 'GET' &&
        call.request.url.includes('search')
      );

      for (const call of searchCalls) {
        evidence.push({
          type: 'sequence',
          description: 'Type interaction likely triggered search API',
          weight: 0.7,
          apiCallId: call.id,
        });
      }
    }

    return evidence;
  }

  private isPageLoadCall(call: APICall, interaction: UIInteraction): boolean {
    // Data fetches that happen after navigation
    return call.request.method === 'GET' &&
           call.classification.type === 'data_fetch';
  }
}
```

### 4. Form Submit Strategy

Detects form submissions and correlates with POST/PUT requests.

```typescript
class FormSubmitCorrelationStrategy implements CorrelationStrategy {
  name = 'form_submit';

  evaluate(
    interaction: UIInteraction,
    candidates: APICall[]
  ): CorrelationEvidence[] {
    const evidence: CorrelationEvidence[] = [];

    // Check if interaction is a form submit trigger
    const isSubmitClick = this.isSubmitClick(interaction);
    const isFormSubmit = interaction.type === 'submit';

    if (!isSubmitClick && !isFormSubmit) {
      return evidence;
    }

    // Find mutation API calls
    const mutationCalls = candidates.filter(call =>
      ['POST', 'PUT', 'PATCH'].includes(call.request.method)
    );

    for (const call of mutationCalls) {
      // High confidence if call has form data
      if (this.hasFormData(call)) {
        evidence.push({
          type: 'form_submit',
          description: 'Form submission triggered API call with form data',
          weight: 0.95,
          apiCallId: call.id,
        });
      } else {
        evidence.push({
          type: 'form_submit',
          description: 'Form submission likely triggered mutation API call',
          weight: 0.8,
          apiCallId: call.id,
        });
      }
    }

    return evidence;
  }

  private isSubmitClick(interaction: UIInteraction): boolean {
    if (interaction.type !== 'click') return false;

    const target = interaction.target;

    return (
      target.tagName === 'button' && target.type === 'submit'
    ) || (
      target.tagName === 'input' && target.type === 'submit'
    ) || (
      target.innerText?.toLowerCase().includes('submit') ||
      target.innerText?.toLowerCase().includes('save') ||
      target.innerText?.toLowerCase().includes('send')
    );
  }

  private hasFormData(call: APICall): boolean {
    const contentType = call.request.headers['content-type'] || '';

    return contentType.includes('form-data') ||
           contentType.includes('x-www-form-urlencoded');
  }
}
```

## Evidence Aggregation

### Confidence Calculation

```typescript
class EvidenceAggregator {
  private minConfidenceThreshold = 30;

  aggregate(
    interaction: UIInteraction,
    allEvidence: CorrelationEvidence[]
  ): InteractionAPICorrelation | null {
    // Group evidence by API call
    const evidenceByCall = new Map<string, CorrelationEvidence[]>();

    for (const evidence of allEvidence) {
      const existing = evidenceByCall.get(evidence.apiCallId) || [];
      existing.push(evidence);
      evidenceByCall.set(evidence.apiCallId, existing);
    }

    // Calculate confidence for each API call
    const correlatedCalls: { callId: string; confidence: number; evidence: CorrelationEvidence[] }[] = [];

    for (const [callId, evidenceList] of evidenceByCall) {
      const confidence = this.calculateConfidence(evidenceList);

      if (confidence >= this.minConfidenceThreshold) {
        correlatedCalls.push({ callId, confidence, evidence: evidenceList });
      }
    }

    if (correlatedCalls.length === 0) return null;

    // Sort by confidence
    correlatedCalls.sort((a, b) => b.confidence - a.confidence);

    // Determine correlation type
    const correlationType = this.inferCorrelationType(
      interaction,
      correlatedCalls[0].evidence
    );

    // Combine all evidence
    const combinedEvidence = correlatedCalls.flatMap(c => c.evidence);
    const avgConfidence = correlatedCalls.reduce((sum, c) => sum + c.confidence, 0) / correlatedCalls.length;

    return {
      id: generateId(),
      interactionId: interaction.id,
      apiCallIds: correlatedCalls.map(c => c.callId),
      correlationType,
      confidence: Math.round(avgConfidence),
      evidence: combinedEvidence,
    };
  }

  private calculateConfidence(evidence: CorrelationEvidence[]): number {
    if (evidence.length === 0) return 0;

    // Weight combination with diminishing returns
    let combinedWeight = 0;

    // Sort by weight descending
    const sorted = [...evidence].sort((a, b) => b.weight - a.weight);

    for (let i = 0; i < sorted.length; i++) {
      // Each additional piece of evidence has diminishing impact
      const diminishingFactor = Math.pow(0.7, i);
      combinedWeight += sorted[i].weight * diminishingFactor;
    }

    // Cap at 100
    return Math.min(100, Math.round(combinedWeight * 100));
  }

  private inferCorrelationType(
    interaction: UIInteraction,
    evidence: CorrelationEvidence[]
  ): CorrelationType {
    // Check evidence types
    const hasFormSubmit = evidence.some(e => e.type === 'form_submit');
    const hasSequence = evidence.some(e => e.type === 'sequence');
    const timingEvidence = evidence.filter(e => e.type === 'timing');

    if (hasFormSubmit) {
      return 'form_submit';
    }

    if (hasSequence && interaction.type === 'click') {
      return 'navigation';
    }

    if (interaction.type === 'type') {
      const avgDelay = this.getAverageDelay(timingEvidence);
      if (avgDelay > 300) {
        return 'debounced';
      }
    }

    if (timingEvidence.length > 0) {
      const avgWeight = timingEvidence.reduce((s, e) => s + e.weight, 0) / timingEvidence.length;
      if (avgWeight > 0.7) {
        return 'direct';
      }
    }

    return 'unknown';
  }
}
```

## Polling Detection

Identify and filter out background/polling API calls:

```typescript
class PollingDetector {
  detect(apiCalls: APICall[]): Set<string> {
    const pollingCallIds = new Set<string>();

    // Group calls by endpoint
    const callsByEndpoint = new Map<string, APICall[]>();

    for (const call of apiCalls) {
      const key = `${call.request.method}:${this.normalizeUrl(call.request.url)}`;
      const existing = callsByEndpoint.get(key) || [];
      existing.push(call);
      callsByEndpoint.set(key, existing);
    }

    // Check for polling patterns
    for (const [endpoint, calls] of callsByEndpoint) {
      if (calls.length < 3) continue;

      // Sort by timestamp
      calls.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Check for regular intervals
      const intervals: number[] = [];
      for (let i = 1; i < calls.length; i++) {
        const interval = calls[i].timestamp.getTime() - calls[i-1].timestamp.getTime();
        intervals.push(interval);
      }

      // If intervals are consistent (within 20% variance), it's polling
      const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;
      const variance = intervals.map(i => Math.abs(i - avgInterval) / avgInterval);
      const avgVariance = variance.reduce((s, v) => s + v, 0) / variance.length;

      if (avgVariance < 0.2) {
        // This is a polling endpoint
        for (const call of calls) {
          pollingCallIds.add(call.id);
        }
      }
    }

    return pollingCallIds;
  }

  private normalizeUrl(url: string): string {
    const parsed = new URL(url);
    // Remove query params for comparison
    return `${parsed.origin}${parsed.pathname}`;
  }
}
```

## Correlation Pipeline

```typescript
class CorrelationPipeline {
  private strategies: CorrelationStrategy[] = [
    new TimingCorrelationStrategy(),
    new ContentCorrelationStrategy(),
    new SequenceCorrelationStrategy(),
    new FormSubmitCorrelationStrategy(),
  ];

  private aggregator = new EvidenceAggregator();
  private pollingDetector = new PollingDetector();

  correlate(
    interactions: UIInteraction[],
    apiCalls: APICall[]
  ): InteractionAPICorrelation[] {
    // Detect and filter polling calls
    const pollingIds = this.pollingDetector.detect(apiCalls);
    const nonPollingCalls = apiCalls.filter(c => !pollingIds.has(c.id));

    // Sort by timestamp
    const sortedInteractions = [...interactions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const correlations: InteractionAPICorrelation[] = [];

    for (const interaction of sortedInteractions) {
      // Find candidate API calls (within time window)
      const candidates = this.findCandidates(interaction, nonPollingCalls);

      if (candidates.length === 0) continue;

      // Apply all strategies
      const allEvidence: CorrelationEvidence[] = [];

      for (const strategy of this.strategies) {
        const evidence = strategy.evaluate(interaction, candidates);
        allEvidence.push(...evidence);
      }

      // Aggregate evidence into correlation
      const correlation = this.aggregator.aggregate(interaction, allEvidence);

      if (correlation) {
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  private findCandidates(
    interaction: UIInteraction,
    apiCalls: APICall[]
  ): APICall[] {
    const interactionTime = interaction.timestamp.getTime();
    const windowMs = 3000; // 3 second window

    return apiCalls.filter(call => {
      const callTime = call.timestamp.getTime();
      return callTime >= interactionTime &&
             callTime <= interactionTime + windowMs;
    });
  }
}
```

## Output

The correlator produces data used by the test generator:

```typescript
interface CorrelationOutput {
  correlations: InteractionAPICorrelation[];

  // Summary statistics
  summary: {
    totalInteractions: number;
    totalAPICalls: number;
    correlatedInteractions: number;
    correlatedAPICalls: number;
    avgConfidence: number;
    pollingCallsFiltered: number;
  };

  // Uncorrelated items for review
  uncorrelated: {
    interactions: UIInteraction[];
    apiCalls: APICall[];
  };
}
```
