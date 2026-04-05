-- =====================================================
-- Report Room — Drop All Objects (Cleanup Script)
-- Run this to tear down the schema for a fresh start.
-- =====================================================

DROP TABLE execution_logs PURGE;
DROP TABLE report_params PURGE;
DROP TABLE reports PURGE;
DROP TABLE users PURGE;
DROP TABLE gtt_filter_values PURGE;

DROP TABLE report_categories PURGE;
DROP TABLE user_roles PURGE;
DROP TABLE role_categories PURGE;
DROP TABLE categories PURGE;
DROP TABLE roles PURGE;

DROP SEQUENCE seq_users;
DROP SEQUENCE seq_reports;
DROP SEQUENCE seq_report_params;
DROP SEQUENCE seq_execution_logs;
DROP SEQUENCE seq_roles;
DROP SEQUENCE seq_categories;
