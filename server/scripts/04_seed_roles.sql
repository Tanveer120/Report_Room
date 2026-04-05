-- =====================================================
-- Report Room — Seed Roles & Categories
-- =====================================================

-- Default roles
INSERT INTO roles (name, description, is_default) VALUES ('Viewer', 'Can view reports', 1);
INSERT INTO roles (name, description, is_default, is_admin) VALUES ('Admin', 'Full access to everything', 0, 1);

-- Default category
INSERT INTO categories (name, description) VALUES ('General', 'General reports visible to all');

-- Assign default role to General category
INSERT INTO role_categories (role_id, category_id) VALUES (1, 1);

-- Assign admin user to Admin role (if admin exists)
INSERT INTO user_roles (user_id, role_id)
SELECT id, 2 FROM users WHERE username = 'admin';

COMMIT;
