# Unified PeopleSoft Automation

A single-page application designed to automate and streamline PeopleSoft HR processes, providing functionality not available in standard PeopleSoft interfaces.

## Overview

Unified PeopleSoft Automation addresses critical gaps in PeopleSoft HR workflows by providing:

- **Automated Record Updates** — Batch processing capabilities for PeopleSoft system updates that would otherwise require manual, repetitive data entry
- **Oracle SQL Integration** — Direct query automation against Oracle SQL Servers storing PeopleSoft data
- **Data Validation** — Built-in failsafes and validation checks that replace error-prone manual verification processes
- **Process Acceleration** — Dramatic reduction in processing time for departmental procedures, in many cases by orders of magnitude

## Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite with server middleware (API routes without separate backend)
- **Compiler:** React Compiler (for optimized rendering)
- **Animations:** Framer Motion (modular component system with accessibility support)
- **Browser Automation:** Playwright (Microsoft Edge) for PeopleSoft workflow automation
- **HTML Parsing:** Cheerio (server-side template rendering)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/autoCobalt/unified-peoplesoft-automation.git

# Navigate to project directory
cd unified-peoplesoft-automation

# Install dependencies
npm install

# Install Microsoft Edge for Playwright automation
npm run install-browser

# Create local environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Configuration

The `.env.local` file (created during installation) controls application behavior:

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_APP_MODE` | Yes | `development` (mock data) or `production` (real systems) |
| `VITE_ORACLE_HOSTNAME` | Yes | Oracle database server hostname |
| `VITE_ORACLE_SERVICE_NAME` | Yes | Oracle service name (ask DBA if unsure) |
| `VITE_PS_SERVER` | Yes | PeopleSoft web server hostname |
| `VITE_PS_SITE_NAME` | Yes | PeopleSoft site name (e.g., HRPRD, HRTST) |
| `VITE_PS_PORTAL` | Yes | Portal name (e.g., EMPLOYEE) |
| `VITE_PS_NODE` | Yes | Node name (usually PT_LOCAL) |
| `VITE_ALLOWED_ORIGINS` | Prod | CORS origins (comma-separated, e.g., `https://app.example.com`) |

See `.env.example` for all available options with descriptions.

## Application Modes

The application operates in two distinct modes controlled by the `VITE_APP_MODE` environment variable:

### Development Mode (`VITE_APP_MODE=development`)

- **Default mode** for local development and demonstrations
- Uses placeholder functions with mock data
- **Mock Test Site** available at `/test-site` — simulates PeopleSoft transaction pages for Playwright testing
- **Dev Simulation Helpers** available on `window.devSimulate` for testing connection states
- Safe for testing and showcasing functionality without affecting production systems
- No actual PeopleSoft or Oracle SQL connections are made

### Production Mode (`VITE_APP_MODE=production`)

- Connects to real PeopleSoft Component Interface via SOAP requests
- Executes actual Oracle SQL queries against configured servers
- **Workflow CI submissions** make real SOAP calls to create/update PeopleSoft records
- Requires valid server credentials and endpoints in `.env` file
- **Use with caution** — actions affect live systems

```bash
# Development (default - safe for testing)
VITE_APP_MODE=development

# Production (connects to real systems)
VITE_APP_MODE=production
```

> ⚠️ **Important:** Always verify your `VITE_APP_MODE` setting before running the application. Production mode will execute real queries and updates against your PeopleSoft and Oracle systems.

### Using Application Mode in Code

Access the mode in your TypeScript/React code via Vite's environment variables:

```typescript
// Check if running in development mode
const isDevelopment = import.meta.env.VITE_APP_MODE === 'development';

// Example: Service function that switches between mock and real data
async function fetchEmployeeData(employeeId: string) {
  if (isDevelopment) {
    // Use mock data from placeholder server
    return mockEmployeeService.fetch(employeeId);
  } else {
    // Use real PeopleSoft SOAP call
    return peoplesoftService.fetch(employeeId);
  }
}
```

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| Core UI Framework | 🟢 Complete | Tab-based navigation with 6 feature panels, type-safe routing |
| SmartForm Panel | 🟢 Complete | Primary workflow panel with data tables, sub-tabs, workflow sections, CI preview tables, Excel export, and collapsible sections |
| Manager Workflow | 🟢 Complete | Approval processing via Playwright with real-time per-transaction status tracking + SOAP CI submissions (Dept Co, Position, Job) in production |
| Other Workflow | 🟢 Complete | SOAP CI submissions (Dept Co, Position Create) + approval processing via Playwright with real-time per-transaction status tracking in production |
| Transaction Selection | 🟢 Complete | Per-row checkbox selection with tri-state header, per-sub-tab persistence, disabled during active workflows |
| CI Preview Tables | 🟢 Complete | Per-template preview tables with two-row headers, duplicate detection, cross-table hover, auto-collapse on success |
| Excel Export | 🟢 Complete | Download Excel on main results and CI preview tables with optional TRANSACTION_NBR toggle for CI tables |
| Oracle SQL Interface | 🟢 Complete | Full API: connect, disconnect, and query endpoints (`/api/oracle/*`) |
| PeopleSoft SOAP Interface | 🟢 Complete | Full API with HTTPS enforcement in production (`/api/soap/*`) |
| Mock Test Site | 🟢 Complete | Development-only PeopleSoft simulator for testing automation |
| Security Layer | 🟢 Complete | Session auth, security headers, CORS, secure logging |
| EDW Transfers | 🟡 In Progress | Panel structure ready, implementation pending |
| Bulk PAF | 🟡 In Progress | Panel structure ready, implementation pending |
| Parking Deductions | 🟡 In Progress | Panel structure ready, implementation pending |
| CI Record Entry | 🟡 In Progress | Panel structure ready, implementation pending |
| Mass Email Notices | 🟡 In Progress | Panel structure ready, implementation pending |
| Data Validation Engine | ⬜ Planned | Automated failsafes and validation |
| Export/Reporting | ⬜ Planned | Results export and audit logging |

## Security

The application implements multiple security layers:

- **Session Authentication** — All API endpoints require authentication via `X-Session-Token` header
- **HTTPS Enforcement** — SOAP connections require HTTPS in production mode
- **Security Headers** — All responses include `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, and other protective headers
- **CORS Protection** — Explicit origin allowlist (configurable via `VITE_ALLOWED_ORIGINS`)
- **Request Size Limits** — 2MB body limit prevents memory exhaustion attacks
- **Secure Logging** — Sensitive data (passwords, tokens) automatically redacted in production logs

## SQL Management

The application includes a three-tier SQL file management system:

| Tier | Location | Access | Purpose |
|------|----------|--------|---------|
| **Server** | `src/server/sql/server/` | Read-only | Bundled queries maintained by developers |
| **Shared** | Configurable path | Read/Write | Department-level queries on network share |
| **Personal** | User-specified | Full | Individual user's custom queries |

### SQL Metadata

SQL files support structured metadata comments for documentation:

```sql
/*
 * @sql-meta
 * name: my-query
 * description: What this query does
 * author: Your Name
 * version: 1.0.0
 *
 * @returns
 * - COLUMN_NAME: TYPE - description
 *
 * @params
 * - param_name: TYPE (required) - description
 *
 * @tags
 * - category
 * @end-sql-meta
 */
```

See [`docs/SQL-METADATA-GUIDE.md`](docs/SQL-METADATA-GUIDE.md) for complete documentation.

## Architecture

The application uses **Vite Server Middleware** to provide API routes without a separate backend:

```
Vite Dev Server (npm run dev)
├── React Frontend (HMR, static assets)
└── Server Middleware
    ├── /api/workflows/* → Workflow automation endpoints (authenticated)
    ├── /api/oracle/*    → Oracle database queries (authenticated)
    ├── /api/soap/*      → PeopleSoft SOAP integration (authenticated)
    └── /test-site/*     → Mock PeopleSoft (development only)
```

### Key Patterns

- **Tab/Panel System** — Type-safe tab registration with automatic TypeScript enforcement
- **Context Architecture** — Provider composition pattern for state persistence across tab navigation
- **Workflow State Machines** — Discriminated unions for type-safe multi-step processes
- **Motion Components** — Reusable animation wrappers with polymorphic `as` prop and `prefers-reduced-motion` support
- **Playwright Integration** — Server-side browser automation (not exposed via HTTP, used internally by workflows)

For detailed architecture documentation, see `CLAUDE.md` in the project root.

## Use Cases

This application is designed for HR departments using PeopleSoft who need to:

- Process large volumes of employee record updates efficiently
- Run and automate recurring Oracle SQL queries
- Validate data integrity before committing changes
- Reduce manual data entry errors through automated checks
- Accelerate routine departmental procedures

## License

This project is licensed under the **Elastic License 2.0 (ELv2)**.

You are free to:
- View and study the source code
- Use the software for internal, non-production purposes
- Modify the software for personal use

You may **not**:
- Provide this software to third parties as a hosted or managed service
- Remove or circumvent any license key functionality

For commercial licensing inquiries, please contact the author.

See the [LICENSE](LICENSE) file for full terms.

## Author

**Walter Alcazar**

---

<sub>Built with React 19 + TypeScript + Vite + Playwright + Framer Motion</sub>
