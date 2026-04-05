-- =====================================================
-- Report Room — Full Database DDL Script
-- Run this script to create all tables, sequences, and indexes.
-- =====================================================

-- =====================================================
-- SEQUENCES
-- =====================================================
CREATE SEQUENCE seq_users START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_reports START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_report_params START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_execution_logs START WITH 1 INCREMENT BY 1;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id            NUMBER DEFAULT seq_users.NEXTVAL PRIMARY KEY,
    username      VARCHAR2(100) NOT NULL UNIQUE,
    email         VARCHAR2(255) NOT NULL UNIQUE,
    password_hash VARCHAR2(255) NOT NULL,
    is_active     NUMBER(1) DEFAULT 1,
    created_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at    TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- =====================================================
-- REPORTS TABLE
-- =====================================================
CREATE TABLE reports (
    id           NUMBER DEFAULT seq_reports.NEXTVAL PRIMARY KEY,
    name         VARCHAR2(255) NOT NULL,
    description  CLOB,
    sql_query    CLOB NOT NULL,
    created_by   NUMBER NOT NULL REFERENCES users(id),
    is_active    NUMBER(1) DEFAULT 1,
    connection_key VARCHAR2(100) DEFAULT 'default',
    created_at   TIMESTAMP DEFAULT SYSTIMESTAMP,
    updated_at   TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_reports_created_by ON reports(created_by);

-- =====================================================
-- REPORT_PARAMS TABLE
-- =====================================================
CREATE TABLE report_params (
    id            NUMBER DEFAULT seq_report_params.NEXTVAL PRIMARY KEY,
    report_id     NUMBER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    param_name    VARCHAR2(100) NOT NULL,
    param_label   VARCHAR2(255) NOT NULL,
    param_type    VARCHAR2(50) NOT NULL
                  CHECK (param_type IN ('text','number','date','multi_value','select')),
    placeholder   VARCHAR2(255),
    is_required   NUMBER(1) DEFAULT 1,
    default_value CLOB,
    options_json  CLOB,
    sort_order    NUMBER DEFAULT 0,
    CONSTRAINT uq_report_param UNIQUE (report_id, param_name)
);

CREATE INDEX idx_report_params_rid ON report_params(report_id);

-- =====================================================
-- EXECUTION_LOGS TABLE
-- =====================================================
CREATE TABLE execution_logs (
    id                NUMBER DEFAULT seq_execution_logs.NEXTVAL PRIMARY KEY,
    report_id         NUMBER NOT NULL REFERENCES reports(id),
    user_id           NUMBER NOT NULL REFERENCES users(id),
    params_json       CLOB,
    row_count         NUMBER,
    execution_time_ms NUMBER,
    status            VARCHAR2(20) CHECK (status IN ('success', 'error')),
    error_message     CLOB,
    executed_at       TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_exec_logs_report ON execution_logs(report_id);
CREATE INDEX idx_exec_logs_user   ON execution_logs(user_id);
CREATE INDEX idx_exec_logs_date   ON execution_logs(executed_at);
