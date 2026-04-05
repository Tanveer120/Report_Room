# Report Room — Data Dictionary

This document outlines the database schema, sequences, tables, and columns used throughout the Report Room project. The database backend is Oracle Database.

## Sequences

The project uses the following Oracle sequences for generating primary keys automatically:

| Sequence | Purpose |
|---|---|
| `seq_users` | Auto-increment for `users.id` |
| `seq_reports` | Auto-increment for `reports.id` |
| `seq_report_params` | Auto-increment for `report_params.id` |
| `seq_execution_logs` | Auto-increment for `execution_logs.id` |
| `seq_roles` | Auto-increment for `roles.id` |
| `seq_categories` | Auto-increment for `categories.id` |

---

## 1. Table: `users`

Stores all user accounts and credentials. Roles are assigned via the `user_roles` junction table.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | NUMBER | **PRIMARY KEY** | Auto-incremented via `seq_users`. |
| `username` | VARCHAR2(100) | **NOT NULL, UNIQUE** | The user's login name. |
| `email` | VARCHAR2(255) | **NOT NULL, UNIQUE** | The user's email address. |
| `password_hash` | VARCHAR2(255) | **NOT NULL** | Bcrypt hashed password. |
| `is_active` | NUMBER(1) | | Flag indicating account status (1=active, 0=inactive). Default: `1` |
| `created_at` | TIMESTAMP | | Timestamp when account was created. Default: `SYSTIMESTAMP` |
| `updated_at` | TIMESTAMP | | Timestamp when account was last updated. Default: `SYSTIMESTAMP` |

---

## 2. Table: `roles`

Custom permission groups. Replaces the old hardcoded admin/user roles.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | NUMBER | **PRIMARY KEY** | Auto-incremented via `seq_roles`. |
| `name` | VARCHAR2(100) | **NOT NULL, UNIQUE** | Role name (e.g., "Finance", "HR", "Viewer"). |
| `description` | VARCHAR2(255) | | Human-readable description. |
| `is_default` | NUMBER(1) | DEFAULT 0 | 1 = auto-assigned to new users on creation. |
| `is_admin` | NUMBER(1) | DEFAULT 0 | 1 = bypasses all category checks (sees all reports). |
| `is_active` | NUMBER(1) | DEFAULT 1 | 1 = active, 0 = disabled. |
| `created_at` | TIMESTAMP | | Timestamp of creation. Default: `SYSTIMESTAMP` |

---

## 3. Table: `categories`

Report groupings used for access control.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | NUMBER | **PRIMARY KEY** | Auto-incremented via `seq_categories`. |
| `name` | VARCHAR2(100) | **NOT NULL, UNIQUE** | Category name (e.g., "Financial Reports"). |
| `description` | VARCHAR2(255) | | Human-readable description. |
| `created_at` | TIMESTAMP | | Timestamp of creation. Default: `SYSTIMESTAMP` |

---

## 4. Table: `reports`

Stores metadata and the native SQL code for reports generated within the platform.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | NUMBER | **PRIMARY KEY** | Auto-incremented via `seq_reports`. |
| `name` | VARCHAR2(255) | **NOT NULL** | Display name of the report. |
| `description` | CLOB | | Detailed description of what the report does. |
| `sql_query` | CLOB | **NOT NULL** | The executable Oracle SQL SELECT statement with parameter placeholders. |
| `created_by` | NUMBER | **FOREIGN KEY** -> `users(id)` | The user (admin) who created the report. |
| `is_active` | NUMBER(1) | | Indicates if the report is currently available (1=active). Default: `1` |
| `created_at` | TIMESTAMP | | Timestamp of creation. Default: `SYSTIMESTAMP` |
| `updated_at` | TIMESTAMP | | Timestamp of last modification. Default: `SYSTIMESTAMP` |

*Indexes*:
- `idx_reports_created_by` on `reports(created_by)`

---

## 5. Table: `report_params`

Stores the parameters required by each report natively linking to their `sql_query` placeholders (e.g., `:department_id`).

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | NUMBER | **PRIMARY KEY** | Auto-incremented via `seq_report_params`. |
| `report_id` | NUMBER | **FOREIGN KEY** -> `reports(id)` ON DELETE CASCADE | Associated report identifier. |
| `param_name` | VARCHAR2(100) | **NOT NULL** | Internal bind variable name (e.g. `department_id`). |
| `param_label` | VARCHAR2(255) | **NOT NULL** | Display name for the frontend UI (e.g. `Select Department`). |
| `param_type` | VARCHAR2(50) | **NOT NULL**, CHECK | Can be: `text`, `number`, `date`, `multi_value`, `select`. |
| `placeholder` | VARCHAR2(255) | | Input field placeholder text. |
| `is_required` | NUMBER(1) | | Flag (1=required, 0=optional). Default: `1` |
| `default_value` | CLOB | | Default value to populate in the UI. |
| `options_json` | CLOB | | JSON array of static options for `select` typed bounds. |
| `sort_order` | NUMBER | | Configures visual order rendering. Default: `0` |

*Constraints & Indexes*:
- `UNIQUE(report_id, param_name)` ensuring no duplicate parameter handles on the same report.
- `idx_report_params_rid` on `report_params(report_id)`.

---

## 6. Table: `execution_logs`

Logs report execution metrics to provide auditing and performance tracking.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | NUMBER | **PRIMARY KEY** | Auto-incremented via `seq_execution_logs`. |
| `report_id` | NUMBER | **FOREIGN KEY** -> `reports(id)` | The report that was executed. |
| `user_id` | NUMBER | **FOREIGN KEY** -> `users(id)` | The user who executed the report. |
| `params_json` | CLOB | | Stringified JSON of parameters supplied during execution. |
| `row_count` | NUMBER | | Number of results returned. |
| `execution_time_ms`| NUMBER| | Query duration in milliseconds. |
| `status` | VARCHAR2(20) | CHECK in `('success', 'error')` | Did the query execute successfully? |
| `error_message` | CLOB | | Error output/stack trace if the query failed. |
| `executed_at` | TIMESTAMP | | Run time. Default: `SYSTIMESTAMP` |

*Indexes*:
- `idx_exec_logs_report` on `execution_logs(report_id)`
- `idx_exec_logs_user` on `execution_logs(user_id)`
- `idx_exec_logs_date` on `execution_logs(executed_at)`

---

## Junction Tables

### 7. Table: `user_roles`

Maps users to roles (many-to-many). A user can have multiple roles.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | NUMBER | **PK, FK** -> `users(id)` | User reference. |
| `role_id` | NUMBER | **PK, FK** -> `roles(id)` | Role reference. |

*Indexes*:
- `idx_user_roles_uid` on `user_roles(user_id)`
- `idx_user_roles_rid` on `user_roles(role_id)`

---

### 8. Table: `role_categories`

Maps roles to accessible categories (many-to-many). Controls which report categories a role can see.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `role_id` | NUMBER | **PK, FK** -> `roles(id)` | Role reference. |
| `category_id` | NUMBER | **PK, FK** -> `categories(id)` | Category reference. |

---

### 9. Table: `report_categories`

Maps reports to categories (many-to-many). Controls which categories a report belongs to.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `report_id` | NUMBER | **PK, FK** -> `reports(id)` | Report reference. |
| `category_id` | NUMBER | **PK, FK** -> `categories(id)` | Category reference. |

*Indexes*:
- `idx_report_categories_rid` on `report_categories(report_id)`
- `idx_report_categories_cid` on `report_categories(category_id)`

---

## Global Temporary Table

### 10. Table: `gtt_filter_values`

A Global Temporary Table (GTT) designated purely to bypass Oracle's strict 999 bounds for `IN` clauses during `multi_value` parameters.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `param_key` | VARCHAR2(100) | | Identifier bridging the filter values per query request. |
| `val` | VARCHAR2(4000)| | Value element matching the database column target criteria. |

*Properties*:
- Automatically drops rows per session isolation via `ON COMMIT DELETE ROWS`.
- Contains index `idx_gtt_filter_val` on `(param_key, val)` for ultra-fast performance.

---

## Access Control Logic

A user can access a report if **any** of the following is true:

1. The report has **no categories** assigned (public/uncategorized)
2. The user has a role with `is_admin = 1`
3. The user has **any role** that is linked to **any category** that the report belongs to

### Example Flow

```
User "john" has roles: [Finance, HR]
Finance role → categories: [Financial Reports, Budget Reports]
HR role → categories: [HR Reports, Payroll Reports]

Report "Monthly Revenue" → categories: [Financial Reports]
→ john CAN access (Finance → Financial Reports)

Report "Employee Salaries" → categories: [Payroll Reports]
→ john CAN access (HR → Payroll Reports)

Report "Board Meeting Notes" → categories: [Executive Reports]
→ john CANNOT access (no role has Executive Reports)

Report "Company Announcements" → NO categories
→ john CAN access (public/uncategorized)
```
