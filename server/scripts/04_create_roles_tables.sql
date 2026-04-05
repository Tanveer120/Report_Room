-- =====================================================
-- Report Room — Roles & Categories Schema
-- =====================================================

CREATE SEQUENCE seq_roles START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_categories START WITH 1 INCREMENT BY 1;

-- ROLES TABLE (replaces hardcoded admin/user)
CREATE TABLE roles (
    id          NUMBER DEFAULT seq_roles.NEXTVAL PRIMARY KEY,
    name        VARCHAR2(100) NOT NULL UNIQUE,
    description VARCHAR2(255),
    is_default  NUMBER(1) DEFAULT 0,
    is_admin    NUMBER(1) DEFAULT 0,
    is_active   NUMBER(1) DEFAULT 1,
    created_at  TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- CATEGORIES TABLE (for organizing reports)
CREATE TABLE categories (
    id          NUMBER DEFAULT seq_categories.NEXTVAL PRIMARY KEY,
    name        VARCHAR2(100) NOT NULL UNIQUE,
    description VARCHAR2(255),
    created_at  TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ROLE ↔ CATEGORY (which categories a role can access)
CREATE TABLE role_categories (
    role_id     NUMBER NOT NULL REFERENCES roles(id),
    category_id NUMBER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (role_id, category_id)
);

-- USER ↔ ROLE (users can have multiple roles)
CREATE TABLE user_roles (
    user_id NUMBER NOT NULL REFERENCES users(id),
    role_id NUMBER NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- REPORT ↔ CATEGORY (reports can belong to multiple categories)
CREATE TABLE report_categories (
    report_id   NUMBER NOT NULL REFERENCES reports(id),
    category_id NUMBER NOT NULL REFERENCES categories(id),
    PRIMARY KEY (report_id, category_id)
);

CREATE INDEX idx_user_roles_uid ON user_roles(user_id);
CREATE INDEX idx_user_roles_rid ON user_roles(role_id);
CREATE INDEX idx_report_categories_rid ON report_categories(report_id);
CREATE INDEX idx_report_categories_cid ON report_categories(category_id);
