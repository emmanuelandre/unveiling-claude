-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

CREATE INDEX idx_permissions_resource ON permissions(resource);

-- Create group_permissions junction table
CREATE TABLE IF NOT EXISTS group_permissions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, permission_id)
);

CREATE INDEX idx_group_permissions_group_id ON group_permissions(group_id);
CREATE INDEX idx_group_permissions_permission_id ON group_permissions(permission_id);

-- Insert permissions
INSERT INTO permissions (resource, action, description) VALUES
-- User permissions
('users', 'read', 'View users'),
('users', 'write', 'Create/update users'),
('users', 'delete', 'Delete users'),

-- Project permissions
('projects', 'read', 'View projects'),
('projects', 'write', 'Create/update projects'),
('projects', 'delete', 'Delete projects'),

-- Task permissions
('tasks', 'read', 'View tasks'),
('tasks', 'write', 'Create/update tasks'),
('tasks', 'delete', 'Delete tasks');

-- Assign all permissions to Admin group
INSERT INTO group_permissions (group_id, permission_id)
SELECT ug.id, p.id
FROM user_groups ug
CROSS JOIN permissions p
WHERE ug.name = 'Admin';
