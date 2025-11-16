# My API Project

A RESTful API project built with Go, PostgreSQL, and JWT authentication.

## Overview

This project provides a RESTful API with JWT-based authentication, PostgreSQL database integration, and Docker deployment capabilities.

## Architecture

```
Client → API Server (Go:8080)
            ↓
       PostgreSQL (5432)
```

### Tech Stack

**Backend**
- **Language**: Go 1.21+
- **Router**: gorilla/mux
- **Database**: PostgreSQL 16
- **Auth**: JWT (golang-jwt/jwt/v5)
- **ORM/Driver**: lib/pq (PostgreSQL driver)

**Infrastructure**
- **Containerization**: Docker + Docker Compose
- **Database Migrations**: SQL migration files

## Project Structure

```
my-api-project/
├── cmd/
│   └── api/
│       └── main.go              # Application entry point
├── internal/
│   ├── handlers/                # HTTP handlers
│   ├── middleware/              # Auth, logging middleware
│   ├── models/                  # Data models
│   └── repository/              # Database access layer
├── migrations/                  # SQL migration files
│   ├── 001_create_users.up.sql
│   └── 001_create_users.down.sql
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── go.mod
├── go.sum
├── .env.example
└── CLAUDE.md                    # This file
```

## Development Commands

### Local Development

```bash
# Install dependencies
go mod download

# Run locally
go run cmd/api/main.go

# Run tests
go test ./...

# Run tests with coverage
go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Format code
go fmt ./...

# Lint (if golangci-lint installed)
golangci-lint run
```

### Docker Commands

```bash
# Build and start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f api

# Rebuild after code changes
docker-compose up -d --build

# Shell into API container
docker exec -it my-api-project-api sh
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it my-api-project-postgres psql -U apiuser -d apidb

# Run migrations manually
psql -U apiuser -d apidb -f migrations/001_create_users.up.sql

# Rollback migration
psql -U apiuser -d apidb -f migrations/001_create_users.down.sql
```

## Git Workflow

### Branch Naming Convention

```
<type>/<short-description>

Types:
- feature/  - New features or enhancements
- fix/      - Bug fixes
- refactor/ - Code refactoring
- docs/     - Documentation changes
- test/     - Test additions/modifications
- chore/    - Maintenance tasks

Examples:
feature/user-authentication
fix/jwt-token-expiry
refactor/repository-layer
```

### Commit Message Format

Follow **Conventional Commits** (https://www.conventionalcommits.org):

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, docs, style, test, chore
Scopes: api, auth, db, handlers, middleware

Examples:
feat(auth): add JWT token generation
fix(handlers): resolve null pointer in user handler
refactor(db): optimize query performance
test(auth): add authentication flow tests
```

### Workflow Rules

1. **NEVER commit directly to main branch**
2. Always create a feature branch from main
3. **Run tests and lint before committing**
4. Push branch and open pull request
5. Merge after review (human reviews, not AI)
6. Delete branch after merge

### Pre-Commit Checklist

Before every commit:
```bash
# 1. Format code
go fmt ./...

# 2. Run tests
go test ./...

# 3. Check for errors
go vet ./...
```

## Testing Strategy

### Test Levels

**Unit Tests (Mandatory)**
- Test business logic in isolation
- Test repository functions with mock database
- Test utility functions
- Coverage target: 70%+

**Integration Tests (Mandatory)**
- Test API endpoints end-to-end
- Test with real database (Docker test container)
- Test authentication flows
- Test error handling

**Test Organization**
```
internal/
├── handlers/
│   ├── user_handler.go
│   └── user_handler_test.go
├── repository/
│   ├── user_repository.go
│   └── user_repository_test.go
```

### Running Tests

```bash
# All tests
go test ./...

# Specific package
go test ./internal/handlers

# With coverage
go test -v -coverprofile=coverage.out ./...

# Verbose output
go test -v ./...
```

## Authentication

### JWT Token Flow

1. User sends credentials to `/api/auth/login`
2. Server validates credentials
3. Server generates JWT token with claims
4. Client stores token
5. Client includes token in `Authorization: Bearer <token>` header
6. Middleware validates token on protected routes

### Environment Variables

```bash
# .env file
DATABASE_URL=postgres://apiuser:password@localhost:5432/apidb
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
PORT=8080
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Users (Protected)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile

## Docker Deployment

### docker-compose.yml

The project uses Docker Compose to orchestrate:
- **API service**: Go application (port 8080)
- **PostgreSQL**: Database (port 5432)

### Production Deployment

```bash
# Build production image
docker build -t my-api-project:latest -f docker/Dockerfile .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Development Workflow

### Adding a New Feature

1. **Create branch**: `git checkout -b feature/new-feature`
2. **Create migration** (if database changes needed)
3. **Implement repository layer** (database access)
4. **Implement handlers** (HTTP endpoints)
5. **Write tests** (unit + integration)
6. **Run all tests**: `go test ./...`
7. **Format code**: `go fmt ./...`
8. **Commit**: `git commit -m "feat: add new feature"`
9. **Push**: `git push origin feature/new-feature`
10. **Create PR** for review

### Migration Workflow

```bash
# Create new migration
touch migrations/002_add_posts_table.up.sql
touch migrations/002_add_posts_table.down.sql

# Write SQL in migration files
# Run migration
psql -d apidb -f migrations/002_add_posts_table.up.sql
```

## Troubleshooting

### Common Issues

**Cannot connect to database**
- Verify PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in .env
- Ensure migrations have run

**JWT token invalid**
- Verify JWT_SECRET matches between token creation and validation
- Check token expiry time
- Ensure Authorization header format: `Bearer <token>`

**Tests failing**
- Run `go mod download` to ensure dependencies installed
- Check if test database is running
- Verify environment variables for tests

## Code Quality Standards

- **Go fmt**: All code must be formatted with `go fmt`
- **No warnings**: `go vet ./...` must pass without warnings
- **Test coverage**: Minimum 70% coverage
- **Error handling**: All errors must be properly handled
- **Comments**: Public functions must have godoc comments

## Dependencies

```go
// go.mod
module my-api-project

go 1.21

require (
    github.com/gorilla/mux v1.8.1
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/lib/pq v1.10.9
    golang.org/x/crypto v0.17.0
)
```

---

**Maintained By**: Development Team
**Last Updated**: 2025-01-16
