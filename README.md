# 📊 Report Room

**Report Room** is a secure, no-code SQL report builder designed to bridge the gap between technical database queries and non-technical end-users. It allows administrators to write complex parameterized SQL queries once, and automatically generates dynamic, user-friendly frontend forms for staff to run those reports securely.

Built specifically for **Oracle Database**, it features advanced query rewriting to bypass Oracle's strict 999-value `IN` clause limit using Session-based Global Temporary Tables (GTTs), while ensuring zero data leakage between concurrent users.

---

## ✨ Key Features

- **No-Code Execution**: End-users simply fill out clean web forms. No SQL knowledge required.
- **Dynamic Form Generation**: The UI automatically builds itself based on the parameters (text, number, date, select, multi-value lists) defined by the admin.
- **Oracle 999-Limit Bypass**: Seamlessly handles arrays of >999 values (e.g., pasting 10,000 employee IDs) by automatically routing them through a bulk-inserted Global Temporary Table.
- **Strict Parsing Security**: A robust SQL Validator natively strips string literals to scan for DML/DDL (e.g., `DROP`, `UPDATE`) ensuring only safe `SELECT` constraints are executed.
- **High-Performance Excel Export**: Built-in streaming exporter capable of offloading 50k+ row datasets directly to `.xlsx` files without crashing Node.js memory.
- **Role-Based Access Control**: Custom roles with category-based report visibility. Admins create roles, assign categories to roles, and assign roles to users.
- **Execution Audit Trail**: Logs every query execution time, row count, user ID, and parameter footprint.
- **Dark Mode**: Built-in dark mode with system preference detection.

---

## 🏗️ Architecture overview

Report Room is decoupled into three primary layers:

### 1. The Frontend (React 19 + Vite)
Built with React and Tailwind CSS. The interface is split into Role-Based dashboards.
- **Admin Flow**: A SQL syntax-highlighted editor with a parameter builder, category assignment, plus full management of roles, categories, and users.
- **User Flow**: A dynamic schema renderer that takes parameter definitions and builds a clean form (using `react-datepicker` and custom multi-value tag inputs).

### 2. The Backend (Node.js + Express)
The backend acts as the secure orchestrator. It uses the `oracledb` driver.
- **Query Engine Pipeline**:
  - `SqlValidator`: Ensures the query is safe.
  - `ParamBinder`: Differentiates between standard bind variables and array values.
  - `GttManager`: Uses `executeMany` for fast bulk staging.
  - `SqlRewriter`: Mutates the AST/Regex of the SQL to swap `IN (:val)` with `IN (SELECT val FROM gtt_filter_values)`.

### 3. The Database (Oracle >= 11g)
Relies on a specific `ON COMMIT DELETE ROWS` Global Temporary Table. This natively forces Oracle to isolate the staged data exclusively to the Node.js connection session currently holding the transaction, automatically wiping it the millisecond the request completes.

---

## 🔐 Role-Based Access Model

Report Room uses a flexible role system instead of hardcoded admin/user roles:

| Concept | Description |
|---|---|
| **Roles** | Custom permission groups created by admin (e.g., "Finance", "HR", "Viewer") |
| **Categories** | Report groupings (e.g., "Financial Reports", "HR Reports") |
| **Role ↔ Category** | Admin assigns which categories each role can access |
| **User ↔ Role** | Users can have multiple roles; auto-assigned to default role on creation |
| **Admin Role** | Special flag — bypasses all category checks, sees all reports |
| **Default Role** | Auto-assigned to new users; reports in its categories are visible to everyone |

### Access Logic

A user can see a report if:
1. The report has **no categories** (public/uncategorized), OR
2. The user has an **admin role**, OR
3. The user has **any role** that has access to **any category** assigned to the report

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, React Router v7, Tailwind CSS v3, Axios, react-datepicker, react-hot-toast.
- **Backend**: Node.js 18+, Express v5, Joi (Validation), JSON Web Tokens (JWT), winston (Logging), exceljs (Exports), bcrypt.
- **Database**: Oracle Database 11g+ + `node-oracledb`.

---

## 🚀 Installation & Setup

For a complete, step-by-step guide on how to configure Oracle Instant Client, run the DDL files, seed the initial database, and start both servers, please refer to the core [INSTALL.md](./INSTALL.md) file.

### Quick Start Overview:
1. Run `@server/scripts/01_create_tables.sql`, `@02_create_gtt.sql`, and `@04_create_roles_tables.sql` in your Oracle DB.
2. `cd server && cp .env.example .env` (Populate your DB credentials).
3. `npm run db:seed` to create the initial Admin account.
4. `npm run dev` to start the backend on port 3000.
5. `cd client && npm install && npm run dev` to start the frontend on port 5173.

---

## 🔒 Security Posture

- **Parameter Binding Only**: String concatenation is strictly prohibited in the engine layer.
- **Rate Limiting**: Distinct rate limiters for Authentication (brute force prevention), General API, Report Execution, and costly Export Operations.
- **Concurrency Locks**: Exports are wrapped in a Node.js Semaphore limiting memory-heavy streams to 5 concurrent jobs.
- **JWT Rotation**: Implement short-lived Access Tokens (15m) alongside Refresh Tokens.
- **SQL Validator**: Blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, EXEC, MERGE, CALL, DBMS_, UTL_.
- **Helmet.js**: HTTP security headers in production.
- **No Public Registration**: Only admins can create user accounts.

---

## 📝 License

Proprietary / Internal Business Use.
