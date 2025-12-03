# PromptOps System Architecture

## Overview

PromptOps is a distributed system for AI prompt management, orchestration, and evaluation. The architecture prioritizes scalability, multi-tenancy, and extensibility.

## High-Level Architecture

```
                                    ┌─────────────────────────────────┐
                                    │         Load Balancer           │
                                    │      (Nginx Ingress / ALB)      │
                                    └───────────────┬─────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
                    ▼                               ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
        │   React Frontend  │           │    Go API Server  │           │  WebSocket Server │
        │   (Static/CDN)    │           │   (Gin Framework) │           │  (Real-time)      │
        └───────────────────┘           └─────────┬─────────┘           └─────────┬─────────┘
                                                  │                               │
                    ┌─────────────────────────────┼───────────────────────────────┤
                    │                             │                               │
                    ▼                             ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
        │    PostgreSQL     │           │      Redis        │           │   LangGraph       │
        │    (Primary DB)   │           │   (Cache/Queue)   │           │   (AI Runtime)    │
        └───────────────────┘           └───────────────────┘           └─────────┬─────────┘
                                                                                  │
                                                  ┌───────────────────────────────┤
                                                  │                               │
                                                  ▼                               ▼
                                        ┌───────────────────┐           ┌───────────────────┐
                                        │  OpenAI / Claude  │           │   HuggingFace /   │
                                        │     API           │           │   Custom Models   │
                                        └───────────────────┘           └───────────────────┘
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   KUBERNETES CLUSTER                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              Ingress Controller                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                            │
│         ┌───────────────────────────────┼───────────────────────────────┐           │
│         │                               │                               │           │
│         ▼                               ▼                               ▼           │
│  ┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐    │
│  │   API Pod   │                 │   API Pod   │                 │   API Pod   │    │
│  │  (Go/Gin)   │                 │  (Go/Gin)   │                 │  (Go/Gin)   │    │
│  └──────┬──────┘                 └──────┬──────┘                 └──────┬──────┘    │
│         │                               │                               │           │
│         └───────────────────────────────┼───────────────────────────────┘           │
│                                         │                                            │
│  ┌──────────────────────────────────────┼──────────────────────────────────────┐    │
│  │                                      │                                      │    │
│  │         ┌────────────────────────────┴────────────────────────────┐         │    │
│  │         │                                                          │         │    │
│  │         ▼                                                          ▼         │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │    │
│  │  │  LangGraph  │    │  LangGraph  │    │  Evaluator  │    │  Evaluator  │   │    │
│  │  │   Worker    │    │   Worker    │    │   Worker    │    │   Worker    │   │    │
│  │  │  (Python)   │    │  (Python)   │    │  (Python)   │    │  (Python)   │   │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │    │
│  │                                                                              │    │
│  │                           Worker Pool (HPA)                                  │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌───────────────────────────────────┐    ┌───────────────────────────────────┐     │
│  │         PostgreSQL                │    │            Redis                  │     │
│  │    ┌─────────┐  ┌─────────┐       │    │    ┌─────────┐  ┌─────────┐      │     │
│  │    │ Primary │──│ Replica │       │    │    │ Primary │──│ Replica │      │     │
│  │    └─────────┘  └─────────┘       │    │    └─────────┘  └─────────┘      │     │
│  └───────────────────────────────────┘    └───────────────────────────────────┘     │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                            Observability Stack                                 │  │
│  │  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐            │  │
│  │  │Prometheus │    │  Grafana  │    │   Tempo   │    │Alertmanager│            │  │
│  │  └───────────┘    └───────────┘    └───────────┘    └───────────┘            │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Prompt Execution Flow

```
User Request                     Go API                      LangGraph Worker
     │                             │                              │
     │  POST /prompts/:id/execute  │                              │
     │────────────────────────────▶│                              │
     │                             │                              │
     │                             │  Validate request            │
     │                             │  Check permissions           │
     │                             │  Load prompt from DB         │
     │                             │                              │
     │                             │  Enqueue job (Redis)         │
     │                             │─────────────────────────────▶│
     │                             │                              │
     │  WebSocket: job_started     │                              │
     │◀────────────────────────────│                              │
     │                             │                              │  Build LangGraph
     │                             │                              │  Execute agent
     │                             │                              │  Call LLM API
     │                             │                              │
     │                             │◀──────────────────────────────  Stream tokens
     │  WebSocket: token_chunk     │                              │
     │◀────────────────────────────│                              │
     │          ...                │                              │
     │                             │                              │
     │                             │  Save to DB                  │
     │                             │◀──────────────────────────────  Complete
     │  WebSocket: job_complete    │                              │
     │◀────────────────────────────│                              │
```

### Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW EXECUTION                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Workflow: Research → Analyze → Summarize

    ┌───────────┐         ┌───────────┐         ┌───────────┐
    │  Research │────────▶│  Analyze  │────────▶│ Summarize │
    │   Node    │         │   Node    │         │   Node    │
    └─────┬─────┘         └─────┬─────┘         └─────┬─────┘
          │                     │                     │
          ▼                     ▼                     ▼
    ┌───────────┐         ┌───────────┐         ┌───────────┐
    │  GPT-4o   │         │ Claude 3  │         │  GPT-4o   │
    │   Call    │         │   Call    │         │   Call    │
    └───────────┘         └───────────┘         └───────────┘

State Machine:
  PENDING → RUNNING → (per node: EXECUTING → COMPLETED) → FINISHED
                    ↘ (on error: FAILED → RETRY or ABORT)
```

## Architecture Deep Dives

| Component | Document | Description |
|-----------|----------|-------------|
| Backend | [backend.md](architecture/backend.md) | Go API, database, repositories |
| Frontend | [frontend.md](architecture/frontend.md) | React, state management, components |
| AI Layer | [ai-layer.md](architecture/ai-layer.md) | LangGraph, model providers, evaluation |
| Infrastructure | [infrastructure.md](architecture/infrastructure.md) | Kubernetes, Helm, observability |

## Key Architectural Decisions

### 1. Go + Python Hybrid

**Decision**: Go for API, Python for AI/ML workloads

**Rationale**:
- Go: Excellent for high-throughput HTTP APIs, low latency, easy deployment
- Python: LangGraph native, ML ecosystem (NumPy, scikit-learn), model integration

**Communication**: gRPC between Go API and Python workers for performance

### 2. Multi-Tenant Isolation

**Decision**: Namespace-per-tenant in Kubernetes

**Rationale**:
- Strong network isolation
- Resource quotas per tenant
- Simplified compliance and auditing
- Independent scaling

### 3. Event-Driven Processing

**Decision**: Redis for job queue and pub/sub

**Rationale**:
- Low latency for real-time updates
- Simple deployment
- Built-in TTL for transient data
- Scales horizontally

### 4. Stateless API Servers

**Decision**: No session state in API pods

**Rationale**:
- Horizontal scaling without sticky sessions
- Easy rolling deployments
- JWT for authentication (stateless)
- Redis for shared cache

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Edge                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WAF → Rate Limiting → TLS Termination → DDoS Protection   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 2: Authentication                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  JWT Validation → API Key Check → Token Refresh             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 3: Authorization                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  RBAC Middleware → Resource Ownership → Org Boundaries      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 4: Data                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Encryption at Rest → Encryption in Transit → PII Masking  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Layer 5: Audit                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Request Logging → Mutation Audit → Compliance Reports      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Open Questions

- [ ] **Model Caching**: How aggressive should response caching be for deterministic prompts?
- [ ] **Multi-Region**: When to introduce multi-region deployment for latency?
- [ ] **Custom Models**: How to support customer-deployed models in their own infrastructure?
- [ ] **Compliance**: Which compliance frameworks to prioritize (SOC2, HIPAA, GDPR)?

## Scalability Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| API Requests | 10K RPM | HPA, read replicas |
| Concurrent Workflows | 1K | Worker pool scaling |
| Prompt Executions | 100K/day | Queue-based processing |
| Data Retention | 90 days | Archival to cold storage |
| p99 Latency | <500ms | Caching, connection pooling |
