# Task Management System - Database Schema

**Version**: 1.0
**Last Updated**: 2025-01-16
**Database**: PostgreSQL 16

---

## Table of Contents

1. [Foundation Tables](#foundation-tables) (Phase 0)
2. [Project Tables](#project-tables) (Phase 1)
3. [Task Tables](#task-tables) (Phase 2)
4. [Analytics](#analytics) (Phase 3)

---

## Foundation Tables (Phase 0)

### organizations

Multi-tenancy support - each organization has isolated data.

```sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE organizations IS 'Multi-tenant organizations for data isolation';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN organizations.deleted_at IS 'Soft delete timestamp';
```

---

### users

User accounts with Google OAuth integration.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE users IS 'User accounts with Google OAuth authentication';
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
```

---

### user_groups

Permission groups for RBAC (e.g., Admin, Member, Viewer).

```sql
CREATE TABLE user_groups (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_user_groups_organization_id ON user_groups(organization_id);

-- Comments
COMMENT ON TABLE user_groups IS 'RBAC groups for permission management';
COMMENT ON COLUMN user_groups.name IS 'Group name (Admin, Member, Viewer)';
```

---

### permissions

Available permissions in the system.

```sql
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);

-- Comments
COMMENT ON TABLE permissions IS 'System-wide permissions catalog';
COMMENT ON COLUMN permissions.resource IS 'Resource type (users, projects, tasks)';
COMMENT ON COLUMN permissions.action IS 'Action type (read, write, delete)';

-- Seed data
INSERT INTO permissions (resource, action, description) VALUES
('users', 'read', 'View users'),
('users', 'write', 'Create/update users'),
('users', 'delete', 'Delete users'),
('projects', 'read', 'View projects'),
('projects', 'write', 'Create/update projects'),
('projects', 'delete', 'Delete projects'),
('tasks', 'read', 'View tasks'),
('tasks', 'write', 'Create/update tasks'),
('tasks', 'delete', 'Delete tasks');
```

---

### group_permissions

Many-to-many relationship between groups and permissions.

```sql
CREATE TABLE group_permissions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, permission_id)
);

CREATE INDEX idx_group_permissions_group_id ON group_permissions(group_id);
CREATE INDEX idx_group_permissions_permission_id ON group_permissions(permission_id);

-- Comments
COMMENT ON TABLE group_permissions IS 'Assigns permissions to user groups';
```

---

### user_group_members

Many-to-many relationship between users and groups.

```sql
CREATE TABLE user_group_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, group_id)
);

CREATE INDEX idx_user_group_members_user_id ON user_group_members(user_id);
CREATE INDEX idx_user_group_members_group_id ON user_group_members(group_id);

-- Comments
COMMENT ON TABLE user_group_members IS 'Assigns users to permission groups';
```

---

## Project Tables (Phase 1)

### projects

Project management - each project belongs to an organization.

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE projects IS 'Projects for organizing tasks';
COMMENT ON COLUMN projects.status IS 'Project status (active, archived, completed)';
COMMENT ON COLUMN projects.owner_id IS 'User who created/owns the project';
```

---

### project_members

Users assigned to projects with specific roles.

```sql
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- Comments
COMMENT ON TABLE project_members IS 'Users assigned to projects';
COMMENT ON COLUMN project_members.role IS 'Role in project (owner, admin, member, viewer)';
```

---

## Task Tables (Phase 2)

### tasks

Task items within projects.

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE tasks IS 'Task items within projects';
COMMENT ON COLUMN tasks.status IS 'Task status (todo, in_progress, done)';
COMMENT ON COLUMN tasks.priority IS 'Task priority (low, medium, high, urgent)';
COMMENT ON COLUMN tasks.assignee_id IS 'User assigned to complete the task';
COMMENT ON COLUMN tasks.creator_id IS 'User who created the task';
```

---

### comments

Comments on tasks for collaboration.

```sql
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comments_deleted_at ON comments(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE comments IS 'Comments on tasks for team collaboration';
```

---

### attachments

File attachments for tasks.

```sql
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_attachments_task_id ON attachments(task_id);
CREATE INDEX idx_attachments_user_id ON attachments(user_id);
CREATE INDEX idx_attachments_deleted_at ON attachments(deleted_at) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE attachments IS 'File attachments for tasks';
COMMENT ON COLUMN attachments.file_path IS 'Storage path (local or cloud)';
COMMENT ON COLUMN attachments.file_size IS 'File size in bytes';
```

---

## Analytics (Phase 3)

### Materialized View: project_stats

Aggregated project statistics for dashboard.

```sql
CREATE MATERIALIZED VIEW project_stats AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.organization_id,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) AS in_progress_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'todo' THEN t.id END) AS todo_tasks,
    COUNT(DISTINCT pm.user_id) AS member_count,
    ROUND(
        CASE
            WHEN COUNT(DISTINCT t.id) > 0 THEN
                (COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END)::NUMERIC / COUNT(DISTINCT t.id)::NUMERIC) * 100
            ELSE 0
        END,
        2
    ) AS completion_percentage
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
LEFT JOIN project_members pm ON p.id = pm.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.organization_id;

CREATE UNIQUE INDEX idx_project_stats_project_id ON project_stats(project_id);
CREATE INDEX idx_project_stats_organization_id ON project_stats(organization_id);

-- Comments
COMMENT ON MATERIALIZED VIEW project_stats IS 'Aggregated project statistics for analytics';

-- Refresh strategy (call periodically)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY project_stats;
```

---

### Materialized View: user_productivity

User productivity metrics.

```sql
CREATE MATERIALIZED VIEW user_productivity AS
SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.organization_id,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_tasks,
    COUNT(DISTINCT c.id) AS total_comments,
    COUNT(DISTINCT a.id) AS total_attachments,
    MAX(t.completed_at) AS last_completion_date
FROM users u
LEFT JOIN tasks t ON u.id = t.assignee_id AND t.deleted_at IS NULL
LEFT JOIN comments c ON u.id = c.user_id AND c.deleted_at IS NULL
LEFT JOIN attachments a ON u.id = a.user_id AND a.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name, u.organization_id;

CREATE UNIQUE INDEX idx_user_productivity_user_id ON user_productivity(user_id);
CREATE INDEX idx_user_productivity_organization_id ON user_productivity(organization_id);

-- Comments
COMMENT ON MATERIALIZED VIEW user_productivity IS 'User productivity and activity metrics';
```

---

## Database Constraints Summary

### Foreign Keys
- All child tables CASCADE delete when parent is deleted
- `assignee_id` in tasks uses SET NULL (task remains if user deleted)

### Unique Constraints
- `organizations.slug` - URL-friendly unique identifier
- `users.email` - No duplicate emails
- `users.google_id` - No duplicate OAuth accounts
- `permissions.(resource, action)` - No duplicate permissions
- `group_permissions.(group_id, permission_id)` - No duplicate assignments
- `user_group_members.(user_id, group_id)` - No duplicate memberships
- `project_members.(project_id, user_id)` - No duplicate project assignments

### Soft Deletes
Tables with `deleted_at` column:
- organizations
- users
- projects
- tasks
- comments
- attachments

Indexes created on `deleted_at` with WHERE clause for active records only.

---

## Migration Order

1. **001_create_organizations.up.sql** - Foundation table
2. **002_create_users.up.sql** - Depends on organizations
3. **003_create_user_groups.up.sql** - Depends on organizations
4. **004_create_permissions.up.sql** - Independent, seed data
5. **005_create_group_permissions.up.sql** - Depends on user_groups, permissions
6. **006_create_user_group_members.up.sql** - Depends on users, user_groups
7. **007_create_projects.up.sql** - Depends on organizations, users
8. **008_create_project_members.up.sql** - Depends on projects, users
9. **009_create_tasks.up.sql** - Depends on projects, users
10. **010_create_comments.up.sql** - Depends on tasks, users
11. **011_create_attachments.up.sql** - Depends on tasks, users
12. **012_create_analytics_views.up.sql** - Depends on all tables

---

**Total Tables**: 11
**Total Materialized Views**: 2
**Total Indexes**: 40+
**Maintained By**: Development Team
**Last Updated**: 2025-01-16
