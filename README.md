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
- **Build Tool:** Vite
- **Compiler:** React Compiler (for optimized rendering)

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

# Start development server
npm run dev
```

### Environment Configuration

Copy the example environment file and configure your local settings:

```bash
cp .env.example .env.local
```

See `.env.example` for available configuration options.

## Application Modes

The application operates in two distinct modes controlled by the `VITE_APP_MODE` environment variable:

### Development Mode (`VITE_APP_MODE=development`)

- **Default mode** for local development and demonstrations
- Uses placeholder functions with mock data
- Connects to localhost-enabled placeholder servers
- Safe for testing and showcasing functionality without affecting production systems
- No actual PeopleSoft or Oracle SQL connections are made

### Production Mode (`VITE_APP_MODE=production`)

- Connects to real PeopleSoft Component Interface via SOAP requests
- Executes actual Oracle SQL queries against configured servers
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

> 🚧 **Under Development** — Features will be documented as they are implemented.

| Feature | Status | Description |
|---------|--------|-------------|
| Core UI Framework | 🟡 In Progress | Base application structure and navigation |
| Record Update Automation | ⬜ Planned | Batch processing for PeopleSoft updates |
| SQL Query Interface | ⬜ Planned | Oracle SQL query automation |
| Data Validation Engine | ⬜ Planned | Automated failsafes and validation |
| Export/Reporting | ⬜ Planned | Results export and audit logging |

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

<sub>Built with React + TypeScript + Vite</sub>
