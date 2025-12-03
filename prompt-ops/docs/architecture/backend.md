# Backend Architecture

## Overview

The backend is a Go-based REST API built with the Gin framework, following clean architecture principles with clear separation between handlers, services, and repositories.

## Project Structure

```
everquant-api/
├── cmd/
│   └── api/
│       └── main.go              # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go            # Environment configuration
│   ├── handlers/
│   │   ├── auth.go              # Authentication endpoints
│   │   ├── prompts.go           # Prompt CRUD
│   │   ├── workflows.go         # Workflow management
│   │   ├── executions.go        # Execution endpoints
│   │   ├── evaluations.go       # Evaluation endpoints
│   │   ├── models.go            # Model registration
│   │   ├── users.go             # User management
│   │   └── analytics.go         # Analytics endpoints
│   ├── middleware/
│   │   ├── auth.go              # JWT validation
│   │   ├── rbac.go              # Permission checking
│   │   ├── ratelimit.go         # Rate limiting
│   │   ├── audit.go             # Audit logging
│   │   └── cors.go              # CORS handling
│   ├── models/
│   │   ├── user.go
│   │   ├── organization.go
│   │   ├── prompt.go
│   │   ├── workflow.go
│   │   ├── execution.go
│   │   ├── evaluation.go
│   │   └── model.go
│   ├── repository/
│   │   ├── user_repo.go
│   │   ├── prompt_repo.go
│   │   ├── workflow_repo.go
│   │   ├── execution_repo.go
│   │   └── evaluation_repo.go
│   ├── services/
│   │   ├── auth_service.go      # Auth logic
│   │   ├── prompt_service.go    # Prompt business logic
│   │   ├── execution_service.go # Execution orchestration
│   │   └── evaluation_service.go
│   └── pkg/
│       ├── jwt/                 # JWT utilities
│       ├── validator/           # Request validation
│       └── errors/              # Error handling
├── migrations/
│   ├── 001_initial_schema.up.sql
│   ├── 001_initial_schema.down.sql
│   └── ...
├── go.mod
└── go.sum
```

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              HTTP Layer                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         Gin Router                               │    │
│  │  /api/v1/prompts  /api/v1/workflows  /api/v1/executions  ...    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│                            Middleware                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   CORS   │ │   Auth   │ │   RBAC   │ │  Audit   │ │RateLimit │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────────────────┤
│                             Handlers                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Prompt  │ │ Workflow │ │Execution │ │   Eval   │ │Analytics │      │
│  │  Handler │ │  Handler │ │  Handler │ │  Handler │ │  Handler │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │            │             │
├───────┼────────────┼────────────┼────────────┼────────────┼─────────────┤
│       ▼            ▼            ▼            ▼            ▼             │
│                             Services                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Prompt  │ │ Workflow │ │Execution │ │   Eval   │ │Analytics │      │
│  │  Service │ │  Service │ │  Service │ │  Service │ │  Service │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │            │             │
├───────┼────────────┼────────────┼────────────┼────────────┼─────────────┤
│       ▼            ▼            ▼            ▼            ▼             │
│                            Repositories                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │  Prompt  │ │ Workflow │ │Execution │ │   Eval   │                   │
│  │   Repo   │ │   Repo   │ │   Repo   │ │   Repo   │                   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                   │
│       │            │            │            │                          │
├───────┴────────────┴────────────┴────────────┴──────────────────────────┤
│                         PostgreSQL + Redis                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Design

### RESTful Conventions

```
GET    /api/v1/{resources}          # List
POST   /api/v1/{resources}          # Create
GET    /api/v1/{resources}/:id      # Get
PUT    /api/v1/{resources}/:id      # Update (full)
PATCH  /api/v1/{resources}/:id      # Update (partial)
DELETE /api/v1/{resources}/:id      # Delete

# Nested resources
GET    /api/v1/prompts/:id/versions
POST   /api/v1/prompts/:id/execute
GET    /api/v1/workflows/:id/runs

# Actions
POST   /api/v1/prompts/:id/duplicate
POST   /api/v1/ab-tests/:id/start
POST   /api/v1/ab-tests/:id/stop
```

### Request/Response Format

```go
// Standard success response
type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type Meta struct {
    Page       int `json:"page,omitempty"`
    PerPage    int `json:"per_page,omitempty"`
    Total      int `json:"total,omitempty"`
    TotalPages int `json:"total_pages,omitempty"`
}

// Standard error response
type ErrorResponse struct {
    Success bool   `json:"success"`
    Error   Error  `json:"error"`
}

type Error struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}
```

## Authentication

### JWT Token Structure

```go
type Claims struct {
    UserID         uuid.UUID `json:"user_id"`
    OrganizationID uuid.UUID `json:"organization_id"`
    Email          string    `json:"email"`
    Role           string    `json:"role"`
    jwt.RegisteredClaims
}

// Token lifetime
const (
    AccessTokenDuration  = 15 * time.Minute
    RefreshTokenDuration = 7 * 24 * time.Hour
)
```

### Auth Flow

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  Client  │       │   API    │       │   DB     │
└────┬─────┘       └────┬─────┘       └────┬─────┘
     │                  │                  │
     │  POST /login     │                  │
     │  {email, pass}   │                  │
     │─────────────────▶│                  │
     │                  │  Verify creds    │
     │                  │─────────────────▶│
     │                  │◀─────────────────│
     │                  │                  │
     │  {access_token,  │                  │
     │   refresh_token} │                  │
     │◀─────────────────│                  │
     │                  │                  │
     │  GET /prompts    │                  │
     │  Auth: Bearer xx │                  │
     │─────────────────▶│                  │
     │                  │  Validate JWT    │
     │                  │  Check RBAC      │
     │  {prompts: [...]}│                  │
     │◀─────────────────│                  │
```

## Permission System

### Role Definitions

```go
type Permission string

const (
    // Prompt permissions
    PermPromptCreate  Permission = "prompts:create"
    PermPromptRead    Permission = "prompts:read"
    PermPromptUpdate  Permission = "prompts:update"
    PermPromptDelete  Permission = "prompts:delete"
    PermPromptExecute Permission = "prompts:execute"

    // Workflow permissions
    PermWorkflowCreate  Permission = "workflows:create"
    PermWorkflowRead    Permission = "workflows:read"
    PermWorkflowUpdate  Permission = "workflows:update"
    PermWorkflowDelete  Permission = "workflows:delete"
    PermWorkflowExecute Permission = "workflows:execute"

    // Admin permissions
    PermUsersManage   Permission = "users:manage"
    PermModelsManage  Permission = "models:manage"
    PermBillingManage Permission = "billing:manage"
)

var RolePermissions = map[string][]Permission{
    "admin": {
        PermPromptCreate, PermPromptRead, PermPromptUpdate, PermPromptDelete, PermPromptExecute,
        PermWorkflowCreate, PermWorkflowRead, PermWorkflowUpdate, PermWorkflowDelete, PermWorkflowExecute,
        PermUsersManage, PermModelsManage, PermBillingManage,
    },
    "editor": {
        PermPromptCreate, PermPromptRead, PermPromptUpdate, PermPromptExecute,
        PermWorkflowCreate, PermWorkflowRead, PermWorkflowUpdate, PermWorkflowExecute,
    },
    "viewer": {
        PermPromptRead,
        PermWorkflowRead,
    },
}
```

### RBAC Middleware

```go
func RequirePermission(perm Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        claims := GetClaims(c)
        if !HasPermission(claims.Role, perm) {
            c.AbortWithStatusJSON(403, ErrorResponse{
                Success: false,
                Error: Error{
                    Code:    "FORBIDDEN",
                    Message: "Insufficient permissions",
                },
            })
            return
        }
        c.Next()
    }
}

// Usage
r.POST("/prompts", RequirePermission(PermPromptCreate), h.CreatePrompt)
```

## Database Access

### Repository Pattern

```go
type PromptRepository interface {
    Create(ctx context.Context, prompt *Prompt) error
    GetByID(ctx context.Context, id uuid.UUID) (*Prompt, error)
    List(ctx context.Context, orgID uuid.UUID, opts ListOptions) ([]*Prompt, int, error)
    Update(ctx context.Context, prompt *Prompt) error
    Delete(ctx context.Context, id uuid.UUID) error
}

type promptRepository struct {
    db *sql.DB
}

func (r *promptRepository) GetByID(ctx context.Context, id uuid.UUID) (*Prompt, error) {
    query := `
        SELECT id, organization_id, name, content, model_id, version,
               is_active, created_by, created_at, updated_at
        FROM prompts
        WHERE id = $1 AND deleted_at IS NULL
    `

    var p Prompt
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &p.ID, &p.OrganizationID, &p.Name, &p.Content, &p.ModelID,
        &p.Version, &p.IsActive, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
    )
    if err == sql.ErrNoRows {
        return nil, ErrNotFound
    }
    return &p, err
}
```

### Transaction Handling

```go
func (s *PromptService) CreateWithVersion(ctx context.Context, input CreatePromptInput) (*Prompt, error) {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // Create prompt
    prompt := &Prompt{...}
    if err := s.promptRepo.CreateTx(ctx, tx, prompt); err != nil {
        return nil, err
    }

    // Create initial version
    version := &PromptVersion{
        PromptID:      prompt.ID,
        VersionNumber: 1,
        Content:       input.Content,
    }
    if err := s.versionRepo.CreateTx(ctx, tx, version); err != nil {
        return nil, err
    }

    if err := tx.Commit(); err != nil {
        return nil, err
    }

    return prompt, nil
}
```

## Error Handling

### Error Types

```go
var (
    ErrNotFound       = errors.New("resource not found")
    ErrUnauthorized   = errors.New("unauthorized")
    ErrForbidden      = errors.New("forbidden")
    ErrBadRequest     = errors.New("bad request")
    ErrConflict       = errors.New("resource conflict")
    ErrRateLimited    = errors.New("rate limited")
    ErrInternalServer = errors.New("internal server error")
)

func ErrorToHTTPStatus(err error) int {
    switch {
    case errors.Is(err, ErrNotFound):
        return http.StatusNotFound
    case errors.Is(err, ErrUnauthorized):
        return http.StatusUnauthorized
    case errors.Is(err, ErrForbidden):
        return http.StatusForbidden
    case errors.Is(err, ErrBadRequest):
        return http.StatusBadRequest
    case errors.Is(err, ErrConflict):
        return http.StatusConflict
    case errors.Is(err, ErrRateLimited):
        return http.StatusTooManyRequests
    default:
        return http.StatusInternalServerError
    }
}
```

## Logging

### Structured Logging

```go
import "github.com/rs/zerolog"

// Request logging middleware
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        c.Next()

        log.Info().
            Str("method", c.Request.Method).
            Str("path", path).
            Int("status", c.Writer.Status()).
            Dur("latency", time.Since(start)).
            Str("client_ip", c.ClientIP()).
            Str("user_agent", c.Request.UserAgent()).
            Msg("request")
    }
}
```

## Configuration

### Environment Variables

```go
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    JWT      JWTConfig
    LangGraph LangGraphConfig
}

type ServerConfig struct {
    Port         int    `env:"PORT" envDefault:"8080"`
    Environment  string `env:"ENVIRONMENT" envDefault:"development"`
    ReadTimeout  int    `env:"READ_TIMEOUT" envDefault:"30"`
    WriteTimeout int    `env:"WRITE_TIMEOUT" envDefault:"30"`
}

type DatabaseConfig struct {
    URL             string `env:"DATABASE_URL,required"`
    MaxOpenConns    int    `env:"DB_MAX_OPEN_CONNS" envDefault:"25"`
    MaxIdleConns    int    `env:"DB_MAX_IDLE_CONNS" envDefault:"5"`
    ConnMaxLifetime int    `env:"DB_CONN_MAX_LIFETIME" envDefault:"300"`
}
```

## Testing

### Test Structure

```go
func TestPromptHandler_Create(t *testing.T) {
    // Setup
    db := setupTestDB(t)
    defer db.Close()

    repo := NewPromptRepository(db)
    service := NewPromptService(repo)
    handler := NewPromptHandler(service)

    router := gin.New()
    router.POST("/prompts", handler.Create)

    // Test cases
    tests := []struct {
        name       string
        input      CreatePromptRequest
        wantStatus int
    }{
        {
            name: "valid prompt",
            input: CreatePromptRequest{
                Name:    "Test Prompt",
                Content: "Hello, {{name}}!",
            },
            wantStatus: http.StatusCreated,
        },
        {
            name: "missing name",
            input: CreatePromptRequest{
                Content: "Hello!",
            },
            wantStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            body, _ := json.Marshal(tt.input)
            req := httptest.NewRequest("POST", "/prompts", bytes.NewReader(body))
            req.Header.Set("Content-Type", "application/json")
            rec := httptest.NewRecorder()

            router.ServeHTTP(rec, req)

            assert.Equal(t, tt.wantStatus, rec.Code)
        })
    }
}
```

## Performance Considerations

- **Connection Pooling**: Configure `MaxOpenConns` based on load testing
- **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
- **Indexing**: Add indexes for frequently filtered columns
- **Caching**: Use Redis for frequently accessed, rarely changed data
- **Pagination**: Always paginate list endpoints
- **Context Timeouts**: Set appropriate timeouts for all operations
