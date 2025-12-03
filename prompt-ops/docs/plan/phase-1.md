# Phase 1: Foundation

**Timeline**: Month 1-2
**Goal**: Establish infrastructure and core backend services

## Scope

- Kubernetes cluster setup with Helm charts
- Go-based API skeleton with routing and middleware
- PostgreSQL database schema for core entities
- Basic LangGraph integration for single-agent execution
- Redis caching layer
- CI/CD pipeline setup

## Checklist

### Infrastructure (Week 1-2)
- [ ] Provision Kubernetes cluster (GKE/EKS/AKS)
- [ ] Configure kubectl and cluster access
- [ ] Set up Helm repository structure
- [ ] Create base Helm chart for services
- [ ] Configure ingress controller (nginx/traefik)
- [ ] Set up TLS certificates (cert-manager)
- [ ] Deploy PostgreSQL via Helm (or managed service)
- [ ] Deploy Redis via Helm
- [ ] Configure persistent volume claims

### Backend API (Week 2-4)
- [ ] Initialize Go project with module structure
- [ ] Set up Gin/Fiber framework with router
- [ ] Implement health check endpoints (`/health`, `/ready`)
- [ ] Configure environment-based configuration
- [ ] Set up structured logging (zerolog/zap)
- [ ] Implement graceful shutdown
- [ ] Create database connection pool
- [ ] Set up database migrations (golang-migrate)
- [ ] Implement request validation middleware
- [ ] Add CORS middleware
- [ ] Create error handling patterns

### Database Schema (Week 3-4)
- [ ] Design ERD for core entities
- [ ] Create `users` table
- [ ] Create `organizations` table
- [ ] Create `prompts` table with versioning fields
- [ ] Create `models` table (registered AI models)
- [ ] Create `executions` table (prompt run history)
- [ ] Create `evaluations` table
- [ ] Add indexes for common queries
- [ ] Write seed data scripts

### LangGraph Integration (Week 4-6)
- [ ] Set up Python sidecar service for LangGraph
- [ ] Create gRPC/REST interface between Go and Python
- [ ] Implement single-agent prompt execution
- [ ] Add timeout and cancellation support
- [ ] Handle streaming responses
- [ ] Implement basic error recovery
- [ ] Add execution logging

### CI/CD (Week 5-6)
- [ ] Set up GitHub Actions workflows
- [ ] Configure linting (golangci-lint)
- [ ] Add unit test runner
- [ ] Create Docker build pipeline
- [ ] Set up container registry
- [ ] Implement Helm deployment stage
- [ ] Add integration test stage

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Go framework | Gin | Performance, middleware ecosystem, community |
| Database | PostgreSQL 15+ | JSON support, full-text search, reliability |
| Cache | Redis 7+ | Pub/sub for real-time, sorted sets for leaderboards |
| LangGraph runtime | Python sidecar | Native LangGraph support, isolation |
| Inter-service comm | gRPC | Performance, streaming, strong typing |

## Database Schema Preview

```sql
-- Core tables for Phase 1

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    model_id UUID,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    provider VARCHAR(50) NOT NULL, -- openai, anthropic, huggingface, custom
    name VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL, -- e.g., gpt-4, claude-3
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id),
    model_id UUID REFERENCES models(id),
    input JSONB NOT NULL,
    output TEXT,
    tokens_input INT,
    tokens_output INT,
    latency_ms INT,
    status VARCHAR(50) DEFAULT 'pending',
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| POST | `/api/v1/prompts` | Create prompt |
| GET | `/api/v1/prompts` | List prompts |
| GET | `/api/v1/prompts/:id` | Get prompt |
| POST | `/api/v1/prompts/:id/execute` | Execute prompt |
| GET | `/api/v1/models` | List registered models |
| POST | `/api/v1/models` | Register model |

## Exit Criteria

- [ ] All infrastructure deployed and accessible
- [ ] API responding to health checks
- [ ] Database schema migrated successfully
- [ ] Single prompt execution working end-to-end
- [ ] CI/CD pipeline deploying to staging
- [ ] Basic documentation complete

## Notes

- Focus on simplicity; avoid premature optimization
- Use feature flags for incomplete functionality
- Document all environment variables
- Create runbooks for common operations

## Dependencies

None (first phase)

## Owners

- **Infrastructure**: DevOps Lead
- **Backend API**: Backend Team Lead
- **LangGraph**: AI/ML Engineer
