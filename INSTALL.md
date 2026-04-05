# Report Room — Installation & Running Guide

## Prerequisites

### 1. System Requirements
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Oracle Database** (11g or later) with a user that has CREATE TABLE, CREATE SEQUENCE, CREATE INDEX privileges
- **Oracle Instant Client** (required for the `oracledb` Node.js driver)

### 2. Install Oracle Instant Client

#### Windows
1. Download Instant Client Basic from [Oracle](https://www.oracle.com/database/technologies/instant-client/microsoft-windows-x64-downloads.html)
2. Extract to `C:\oracle\instantclient_21_x`
3. Add the directory to your system `PATH`
4. Set environment variable: `set OCI_LIB_DIR=C:\oracle\instantclient_21_x`
5. Set environment variable: `set OCI_INC_DIR=C:\oracle\instantclient_21_x\sdk\include`

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install libaio1
sudo mkdir -p /opt/oracle
cd /opt/oracle
# Download and extract instant client zip
echo /opt/oracle/instantclient_21_1 | sudo tee /etc/ld.so.conf.d/oracle-instantclient.conf
sudo ldconfig
```

#### macOS
```bash
brew install instantclient-basic
```

---

## Step 1: Clone / Set Up Project

```bash
# Navigate to your project root
cd Report_Room
```

The project structure:
```
Report_Room/
├── server/                 # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Database, environment, CORS
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation, rate limiting, error
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Business logic + query engine
│   │   └── utils/          # Helpers, constants, logger
│   ├── scripts/            # SQL DDL scripts + seed script
│   ├── logs/               # Winston log output
│   └── package.json
├── client/                 # Frontend (Vite + React + Tailwind)
│   ├── src/
│   │   ├── api/            # Axios client with interceptors
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth + Theme providers
│   │   └── pages/          # Route pages
│   └── package.json
├── README.md
├── INSTALL.md
└── data_dictionary.md
```

---

## Step 2: Set Up Oracle Database

### 2.1 Create Tables, Sequences, Indexes, and GTT

Connect to your Oracle database using SQL*Plus, SQL Developer, or any Oracle client, then run the DDL scripts **in order**:

```sql
-- 1. Create core tables, sequences, and indexes
@server/scripts/01_create_tables.sql

-- 2. Create the Global Temporary Table (GTT)
@server/scripts/02_create_gtt.sql

-- 3. Create roles, categories, and junction tables
@server/scripts/04_create_roles_tables.sql

-- 4. Seed default roles and categories
@server/scripts/04_seed_roles.sql
```

If you need to tear down and start fresh:
```sql
@server/scripts/03_drop_all.sql
-- Then re-run 01, 02, 04, and seed
```

### 2.2 Seed Admin User

After the tables exist, run the seed script from the `server/` directory:

```bash
cd server
npm run db:seed
```

This creates a default admin user:
- **Username:** `admin`
- **Email:** `admin@reportroom.local`
- **Password:** `Admin@12345`

The admin user is automatically assigned the **Admin** role (full access to everything).

To customize, set these env vars before running:
```bash
SEED_ADMIN_USERNAME=myadmin
SEED_ADMIN_EMAIL=admin@mycompany.com
SEED_ADMIN_PASSWORD=MySecurePass1
```

### 2.3 Test Database Connectivity

```bash
cd server
npm run db:test
```

Expected output:
```
=== Report Room — Database Connectivity Test ===

1. Testing direct connection...
   Connected successfully.

2. Fetching Oracle version...
   Oracle Database 19c Enterprise Edition ...

3. Testing connection pool...
   Pool created (min: 2, max: 5)

4. Testing pool stats...
   Connections in use: 0
   Connections open:   2
   Queue length:       0

5. Testing concurrent connections...
   Concurrent results: 1, 2, 3

6. Checking if tables exist...
   Found tables:
     - CATEGORIES
     - EXECUTION_LOGS
     - REPORT_CATEGORIES
     - REPORT_PARAMS
     - REPORTS
     - ROLE_CATEGORIES
     - ROLES
     - USER_ROLES
     - USERS

7. Checking if GTT exists...
   GTT gtt_filter_values exists.

8. Checking role/category tables...
   All role/category tables exist:
     - CATEGORIES
     - REPORT_CATEGORIES
     - ROLE_CATEGORIES
     - ROLES
     - USER_ROLES

=== All connectivity tests passed ===
```

---

## Step 3: Configure Backend Environment

### 3.1 Create `.env` File

```bash
cd server
cp .env.example .env
```

### 3.2 Edit `.env` with Your Values

```env
NODE_ENV=development
PORT=3000

# Oracle Database
ORACLE_USER=your_db_user
ORACLE_PASSWORD=your_db_password
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1

# Connection Pool (defaults are fine for most cases)
ORACLE_POOL_MIN=4
ORACLE_POOL_MAX=20
ORACLE_POOL_INCREMENT=2
ORACLE_POOL_TIMEOUT=60
ORACLE_QUEUE_TIMEOUT=30000
ORACLE_STMT_CACHE_SIZE=30
ORACLE_PREFETCH_ROWS=1000

# JWT Secrets — GENERATE YOUR OWN!
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Query Limits
QUERY_TIMEOUT_MS=60000
MAX_MULTI_VALUES=50000
IN_CLAUSE_LIMIT=999
```

**Important:** Generate strong, random JWT secrets. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 4: Install Backend Dependencies & Start

```bash
cd server
npm install
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Expected output:
```
[2026-04-03 10:00:00] INFO: Oracle connection pool created (min: 4, max: 20)
[2026-04-03 10:00:00] INFO: Database pool initialized successfully
[2026-04-03 10:00:00] INFO: Server running on port 3000 in development mode
```

### Verify Backend is Running

Open a browser or use curl:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2026-04-03T10:00:00.000Z",
  "database": {
    "connectionsInUse": 0,
    "connectionsOpen": 4,
    "queueLength": 0
  }
}
```

---

## Step 5: Configure Frontend Environment

### 5.1 Create `.env` File

```bash
cd client
echo VITE_API_URL=http://localhost:3000/api > .env
```

If your backend runs on a different host/port, adjust accordingly:
```env
VITE_API_URL=http://your-backend-host:port/api
```

---

## Step 6: Install Frontend Dependencies & Start

```bash
cd client
npm install
```

### Development Mode (with HMR)
```bash
npm run dev
```

The frontend will start at `http://localhost:5173` and automatically open in your browser.

### Production Build
```bash
npm run build
```

Output goes to `client/dist/`. Serve with any static file server:
```bash
npm run preview
```

---

## Step 7: First Login & Usage

### 7.1 Log In
1. Open `http://localhost:5173`
2. You'll be redirected to `/login`
3. Use the seeded admin credentials:
   - **Username:** `admin`
   - **Password:** `Admin@12345`

### 7.2 Set Up Roles & Categories (Admin)
1. Click **Roles** in the sidebar → Create roles (e.g., "Finance", "HR", "Viewer")
2. Click **Categories** → Create categories (e.g., "Financial Reports", "HR Reports")
3. Edit each role → Assign which categories that role can access
4. Toggle **Default** on a role to auto-assign it to new users

### 7.3 Create Users (Admin)
1. Click **Users** in the sidebar → **New User**
2. Fill in username, email, password
3. Assign one or more roles
4. Users without explicit roles get the default role automatically

### 7.4 Create Your First Report
1. Click **Reports** in the admin section
2. Click **New Report**
3. Fill in:
   - **Report Name:** e.g., "Employee List"
   - **Description:** e.g., "All active employees"
   - **SQL Query:** e.g., `SELECT employee_id, first_name, last_name, department FROM employees WHERE status = 'ACTIVE'`
4. Add parameters if needed (e.g., a `department` multi_value param)
5. Assign categories to control who can see this report
6. Click **Create Report**

### 7.5 Run a Report
1. Go to **Reports** in the sidebar
2. Click on your report card
3. Fill in any parameters
4. Click **Run Report**
5. Results appear in a table (first 100 rows shown)
6. Click **Export** to download full results as XLSX

---

## Available API Endpoints

### Authentication (no auth required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Authentication required
| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/api/auth/me` | any | Get current user info |
| GET | `/api/reports` | any | List accessible reports (filtered by role categories) |
| GET | `/api/reports/:id` | any | Get report details + params + categories |
| POST | `/api/reports/:id/execute` | any | Execute report with params |
| GET | `/api/reports/:id/logs` | any | Get execution history |
| POST | `/api/reports/:id/export` | any | Export results as XLSX |

### Admin only
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports` | Create new report |
| PUT | `/api/reports/:id` | Update report |
| DELETE | `/api/reports/:id` | Soft-delete report |
| GET | `/api/admin/roles` | List all roles |
| POST | `/api/admin/roles` | Create role |
| PUT | `/api/admin/roles/:id` | Update role |
| DELETE | `/api/admin/roles/:id` | Delete role |
| POST | `/api/admin/roles/:id/categories` | Assign categories to role |
| GET | `/api/admin/categories` | List all categories |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category |
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/users/:id/roles` | Assign roles to user |

### Public
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check + pool stats |

---

## Troubleshooting

### `oracledb` installation fails
```bash
# Windows — ensure OCI_LIB_DIR and OCI_INC_DIR are set
set OCI_LIB_DIR=C:\oracle\instantclient_21_x
set OCI_INC_DIR=C:\oracle\instantclient_21_x\sdk\include
npm install oracledb

# Linux — ensure ldconfig is updated
sudo ldconfig
npm install oracledb
```

### "Connection pool not initialized"
- Verify `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING` in `.env`
- Ensure Oracle Instant Client is installed and in PATH
- Test with `npm run db:test`

### Frontend can't connect to backend
- Verify `VITE_API_URL` in `client/.env` matches your backend URL
- Check CORS: `CORS_ORIGIN` in `server/.env` must match your frontend URL
- Check browser dev tools for CORS errors

### "Forbidden keyword detected" when creating a report
- The SQL validator blocks: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, EXEC, EXECUTE, MERGE, CALL, DBMS_, UTL_
- Only SELECT and WITH (CTE) queries are allowed
- Keywords inside string literals are safely ignored

### Export fails with "Too many export requests"
- Rate limited to 30 exports per hour per IP
- Wait or adjust `exportLimiter` in `server/src/middleware/rate-limiter.js`

### "Access Denied" on a report
- The report has categories assigned that your roles don't have access to
- Contact an admin to assign your role to the report's categories, or make the report public (remove all categories)

### Logs directory errors
- The `server/logs/` directory is created automatically
- If missing, create it: `mkdir server\logs`

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secrets (64+ random bytes)
- [ ] Set production `CORS_ORIGIN`
- [ ] Use Oracle connection string for production DB
- [ ] Adjust `ORACLE_POOL_MAX` based on expected concurrent users
- [ ] Set up process manager (PM2, systemd, Docker)
- [ ] Set up reverse proxy (nginx, Caddy) for SSL
- [ ] Run `npm run build` in `client/` and serve `dist/` statically
- [ ] Configure log rotation for `server/logs/`
- [ ] Set up monitoring for pool stats via `/api/health`
- [ ] Run `npm run test:integration` to verify all services
