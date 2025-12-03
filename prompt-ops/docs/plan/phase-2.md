# Phase 2: Core Features

**Timeline**: Month 3-4
**Goal**: Deliver the Prompt Playground, evaluation engine, and authentication

## Scope

- Prompt Playground UI with real-time testing
- Prompt evaluation engine (BLEU, ROUGE, semantic similarity)
- User authentication with JWT
- Role-based access control (RBAC)
- AI inference microservice with auto-scaling

## Checklist

### Prompt Playground UI (Week 1-3)
- [ ] Set up React project with TypeScript
- [ ] Configure TailwindCSS and design system
- [ ] Create layout shell (sidebar, header, main content)
- [ ] Implement prompt editor with syntax highlighting
- [ ] Add model selector dropdown
- [ ] Build variables/parameters panel
- [ ] Create response preview panel
- [ ] Implement token counter (real-time)
- [ ] Add cost estimation display
- [ ] Build execution history sidebar
- [ ] Implement WebSocket connection for streaming
- [ ] Add dark mode support
- [ ] Create loading states and skeletons
- [ ] Implement error handling UI

### Evaluation Engine (Week 2-4)
- [ ] Design evaluation pipeline architecture
- [ ] Implement BLEU score calculation
- [ ] Implement ROUGE score calculation
- [ ] Add semantic similarity (embedding-based)
- [ ] Create latency tracking
- [ ] Build evaluation results storage
- [ ] Implement batch evaluation endpoint
- [ ] Add ground truth dataset management
- [ ] Create evaluation comparison views
- [ ] Build evaluation API endpoints

### Authentication & RBAC (Week 3-5)
- [ ] Implement JWT token generation
- [ ] Create login/signup endpoints
- [ ] Add password hashing (bcrypt/argon2)
- [ ] Implement refresh token rotation
- [ ] Create middleware for auth validation
- [ ] Design permission model
- [ ] Implement role definitions (admin, editor, viewer)
- [ ] Add organization-level permissions
- [ ] Create user management endpoints
- [ ] Build invite flow for organizations
- [ ] Add OAuth providers (Google, GitHub) - optional
- [ ] Implement session management
- [ ] Add audit logging for auth events

### AI Inference Service (Week 4-6)
- [ ] Design inference service architecture
- [ ] Implement OpenAI provider adapter
- [ ] Implement Anthropic provider adapter
- [ ] Implement HuggingFace provider adapter
- [ ] Create provider abstraction layer
- [ ] Add request queuing system
- [ ] Implement retry logic with backoff
- [ ] Add timeout handling
- [ ] Configure Kubernetes HPA for auto-scaling
- [ ] Implement response caching (Redis)
- [ ] Add rate limiting per organization
- [ ] Create usage tracking and metering
- [ ] Build provider health checks

### Frontend-Backend Integration (Week 5-6)
- [ ] Set up API client with axios/fetch
- [ ] Implement authentication flow in UI
- [ ] Add token refresh handling
- [ ] Create protected route wrapper
- [ ] Implement real-time updates (WebSocket/SSE)
- [ ] Add optimistic UI updates
- [ ] Create error boundary components
- [ ] Implement retry logic for failed requests

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Lightweight, TypeScript-first |
| API client | React Query + axios | Caching, background refresh |
| Auth tokens | JWT + refresh tokens | Stateless, secure rotation |
| Streaming | Server-Sent Events | Simpler than WebSocket for one-way |
| Evaluation metrics | Python service | NumPy/scikit-learn ecosystem |

## Permission Model

```
Roles:
├── admin
│   ├── manage_organization
│   ├── manage_users
│   ├── manage_models
│   ├── manage_prompts
│   └── view_all
├── editor
│   ├── manage_prompts (own)
│   ├── execute_prompts
│   └── view_evaluations
└── viewer
    ├── view_prompts
    └── view_evaluations
```

## API Endpoints (Phase 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/users/me` | Get current user |
| PUT | `/api/v1/users/me` | Update current user |
| GET | `/api/v1/organizations/:id/users` | List org users |
| POST | `/api/v1/organizations/:id/invite` | Invite user |
| POST | `/api/v1/prompts/:id/evaluate` | Evaluate prompt |
| GET | `/api/v1/prompts/:id/evaluations` | Get evaluations |
| POST | `/api/v1/evaluations/batch` | Batch evaluate |
| GET | `/api/v1/usage` | Get usage stats |

## UI Components

### Prompt Playground Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | Workspace Selector | User Menu                  │
├────────────────┬────────────────────────────────────────────────┤
│                │                                                │
│  Sidebar:      │  Main Area:                                    │
│  - Prompts     │  ┌────────────────────┬─────────────────────┐  │
│  - History     │  │  Prompt Editor     │  Response Panel     │  │
│  - Favorites   │  │  - System prompt   │  - Model output     │  │
│                │  │  - User prompt     │  - Token count      │  │
│                │  │  - Variables       │  - Latency          │  │
│                │  │                    │  - Cost estimate    │  │
│                │  ├────────────────────┴─────────────────────┤  │
│                │  │  Action Bar: Run | Save | Evaluate | Share │ │
│                │  └──────────────────────────────────────────┘  │
└────────────────┴────────────────────────────────────────────────┘
```

## Evaluation Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| BLEU | N-gram overlap with reference | 0-1 |
| ROUGE-L | Longest common subsequence | 0-1 |
| Semantic Similarity | Cosine similarity of embeddings | 0-1 |
| Latency | Response time in ms | 0-∞ |
| Token Efficiency | Output tokens / Input tokens | 0-∞ |

## Exit Criteria

- [ ] Users can sign up, log in, and manage profiles
- [ ] RBAC enforced on all endpoints
- [ ] Prompt Playground fully functional
- [ ] Streaming responses working
- [ ] Evaluation metrics calculating correctly
- [ ] Auto-scaling tested under load
- [ ] UI responsive on mobile/tablet

## Dependencies

- Phase 1 infrastructure complete
- Phase 1 database schema migrated
- Phase 1 basic LangGraph working

## Notes

- Prioritize Playground over advanced evaluation features
- Start with OpenAI provider, add others incrementally
- Use feature flags for unfinished evaluation metrics
- Performance target: <200ms API response time (p95)

## Owners

- **Frontend**: Frontend Team Lead
- **Auth/RBAC**: Backend Team Lead
- **Evaluation Engine**: AI/ML Engineer
- **Inference Service**: Backend + DevOps
