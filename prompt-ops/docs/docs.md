# PromptOps Documentation Hub

> Enterprise-grade AI prompt management and orchestration platform

## Quick Navigation

| Document | Description |
|----------|-------------|
| [README](README.md) | Documentation folder guide |
| [Requirements](requirements.md) | Product requirements and core modules |
| [Architecture](architecture.md) | System architecture overview |
| [UI Specifications](ui-specs.md) | Screen layouts and design principles |
| [Implementation Plan](plan.md) | Phased roadmap summary |

## Architecture Deep Dives

| Document | Description |
|----------|-------------|
| [Backend](architecture/backend.md) | Go API, database schema, authentication |
| [Frontend](architecture/frontend.md) | React components, state management |
| [AI Layer](architecture/ai-layer.md) | LangGraph orchestration, model management |
| [Infrastructure](architecture/infrastructure.md) | Kubernetes, Helm, observability |

## Implementation Phases

| Phase | Timeline | Focus |
|-------|----------|-------|
| [Phase 1](plan/phase-1.md) | Month 1-2 | Foundation |
| [Phase 2](plan/phase-2.md) | Month 3-4 | Core Features |
| [Phase 3](plan/phase-3.md) | Month 5-6 | Advanced Features |
| [Phase 4](plan/phase-4.md) | Month 7+ | Enterprise Readiness |

## Project Overview

**PromptOps** is an AI-first platform for managing, testing, and orchestrating LLM prompts at scale. Key capabilities:

- **Prompt Playground**: Create, test, and iterate on prompts with real-time feedback
- **Workflow Builder**: Visual LangGraph-based agent orchestration
- **Evaluation Engine**: BLEU, ROUGE, semantic similarity metrics with A/B testing
- **Model Management**: Multi-provider support with fine-tuned model deployment
- **Governance**: RBAC, versioning, and audit logs for compliance

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Go (Gin/Fiber)
- **AI Layer**: LangGraph
- **Database**: PostgreSQL + Redis
- **Infrastructure**: Kubernetes + Helm
- **Observability**: Prometheus + Grafana
