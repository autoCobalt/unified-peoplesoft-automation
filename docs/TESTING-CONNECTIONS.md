# Testing Production Connections

This guide walks you through configuring and testing Oracle SQL and PeopleSoft Component Interface (SOAP) connections in production mode.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Switching to Production Mode](#switching-to-production-mode)
4. [Testing Oracle SQL Connection](#testing-oracle-sql-connection)
5. [Testing PeopleSoft SOAP Connection](#testing-peoplesoft-soap-connection)
6. [Running a Test Query](#running-a-test-query)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before testing connections, ensure you have:

### For Oracle SQL
- [ ] Oracle database server hostname/IP address
- [ ] Oracle listener port (typically 1521)
- [ ] Oracle service name (ask your DBA if unsure)
- [ ] Valid Oracle database credentials (username/password)
- [ ] Network access to the Oracle server (no firewall blocking)

### For PeopleSoft SOAP
- [ ] PeopleSoft web server hostname
- [ ] PeopleSoft web server port (typically 443 or 8443 for HTTPS)
- [ ] PeopleSoft site name (e.g., HRPRD, HRTST)
- [ ] Portal name (e.g., EMPLOYEE)
- [ ] Node name (typically PT_LOCAL)
- [ ] Valid PeopleSoft user credentials with CI access

---

## Environment Configuration

### Step 1: Open your `.env` file

The `.env` file is located in the project root. It contains all connection settings.

```bash
# Open in your preferred editor
code .env
# or
notepad .env
```

### Step 2: Configure Oracle SQL Settings

Find the Oracle section and update these values:

```env
# ===========================================
# ORACLE SQL CONNECTION
# ===========================================

# [REQUIRED] Oracle database server hostname or IP
VITE_ORACLE_HOSTNAME=your-oracle-server.company.com

# [OPTIONAL] Oracle listener port (default: 1521)
VITE_ORACLE_PORT=1521

# [REQUIRED] Oracle service name
VITE_ORACLE_SERVICE_NAME=HRPRD
```

**Example for a typical PeopleSoft HR database:**
```env
VITE_ORACLE_HOSTNAME=hr-db-prod.mycompany.com
VITE_ORACLE_PORT=1521
VITE_ORACLE_SERVICE_NAME=HRPRD
```

### Step 3: Configure PeopleSoft SOAP Settings

Find the PeopleSoft SOAP section and update these values:

```env
# ===========================================
# PEOPLESOFT SOAP CONNECTION
# ===========================================

# [OPTIONAL] Protocol - use 'https' for production (default: https)
VITE_PS_PROTOCOL=https

# [REQUIRED] PeopleSoft web server hostname
VITE_PS_SERVER=your-peoplesoft-server.company.com

# [OPTIONAL] PeopleSoft web server port (default: 443 for https)
VITE_PS_PORT=8443

# [REQUIRED] PeopleSoft site name
VITE_PS_SITE_NAME=HRPRD

# [REQUIRED] Portal name
VITE_PS_PORTAL=EMPLOYEE

# [REQUIRED] Default local node name
VITE_PS_NODE=PT_LOCAL
```

**Example for a typical PeopleSoft environment:**
```env
VITE_PS_PROTOCOL=https
VITE_PS_SERVER=ps-web-prod.mycompany.com
VITE_PS_PORT=8443
VITE_PS_SITE_NAME=HRPRD
VITE_PS_PORTAL=EMPLOYEE
VITE_PS_NODE=PT_LOCAL
```

---

## Switching to Production Mode

### Step 4: Enable Production Mode

Change the application mode from `development` to `production`:

```env
# ===========================================
# APPLICATION MODE
# ===========================================
# Comment out development mode:
#VITE_APP_MODE=development

# Enable production mode:
VITE_APP_MODE=production
```

> **WARNING**: In production mode, all actions affect live data. Use with caution!

### Step 5: Restart the Application

After changing the `.env` file, restart the development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

The server will log the connection settings on startup:
```
[Oracle] Service ready
[SOAP] Service initialized
[SOAP] Server: https://ps-web-prod.mycompany.com:8443
[SOAP] Site: HRPRD/EMPLOYEE/PT_LOCAL
```

---

## Testing Oracle SQL Connection

### Step 6: Connect via the UI

1. Open the application in your browser: `http://localhost:5173`
2. Locate the **Connection Panel** (left side)
3. In the **Oracle SQL** section:
   - Enter your Oracle **username**
   - Enter your Oracle **password**
   - Click **Connect**

### Step 7: Verify Connection

A successful connection will show:
- Green "Connected" indicator
- Console log: `[Oracle] Connected successfully`

If connection fails, check the error message and see [Troubleshooting](#troubleshooting).

---

## Testing PeopleSoft SOAP Connection

### Step 8: Connect via the UI

1. In the **Connection Panel**, find the **PeopleSoft** section
2. Enter your PeopleSoft **username**
3. Enter your PeopleSoft **password**
4. Click **Connect**

### Step 9: Verify Connection

A successful connection will show:
- Green "Connected" indicator
- Console log: `[SOAP] Connection test successful`

The SOAP connection test performs a `GetCIShape` request against `CI_JOB_DATA` to validate credentials without modifying data.

---

## Running a Test Query

A built-in `connection-test` query is available to verify Oracle connectivity using the DUAL pseudo-table.

### Option A: Using Browser Developer Tools

1. Open browser DevTools (F12)
2. Go to the **Console** tab
3. Run this fetch request:

```javascript
// Test Oracle connection with DUAL query
fetch('/api/oracle/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ queryId: 'connection-test' })
})
.then(r => r.json())
.then(console.log);
```

**Expected successful response:**
```json
{
  "success": true,
  "data": {
    "rows": [{
      "CURRENT_TIME": "2024-01-15T14:30:00.000Z",
      "DATABASE_NAME": "HRPRD",
      "SESSION_USER": "YOUR_USERNAME",
      "CLIENT_HOST": "your-machine",
      "STATUS": "Connection successful"
    }],
    "rowCount": 1,
    "columns": ["CURRENT_TIME", "DATABASE_NAME", "SESSION_USER", "CLIENT_HOST", "STATUS"],
    "executionTimeMs": 15
  }
}
```

### Option B: Using curl (from terminal)

```bash
curl -X POST http://localhost:5173/api/oracle/query \
  -H "Content-Type: application/json" \
  -d '{"queryId": "connection-test"}'
```

### The Test Query

The `connection-test` query executes this SQL:

```sql
SELECT
    SYSDATE AS CURRENT_TIME,
    SYS_CONTEXT('USERENV', 'DB_NAME') AS DATABASE_NAME,
    SYS_CONTEXT('USERENV', 'SESSION_USER') AS SESSION_USER,
    SYS_CONTEXT('USERENV', 'HOST') AS CLIENT_HOST,
    'Connection successful' AS STATUS
FROM DUAL
```

This query:
- Uses only the `DUAL` pseudo-table (no real table access needed)
- Returns the current server time
- Shows which database you're connected to
- Confirms your session user
- Requires no special privileges

---

## Troubleshooting

### Oracle Connection Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ORA-01017: Invalid username/password` | Wrong credentials | Verify username and password |
| `ORA-12154: TNS: could not resolve connect identifier` | Bad hostname or service name | Check `VITE_ORACLE_HOSTNAME` and `VITE_ORACLE_SERVICE_NAME` |
| `ORA-12541: TNS: no listener` | Oracle not running or wrong port | Verify Oracle is running and check `VITE_ORACLE_PORT` |
| `ORA-12170: Connection timeout` | Network issue or firewall | Check network connectivity, VPN, firewall rules |
| `ORA-12514: TNS: listener does not know of service` | Wrong service name | Contact DBA for correct service name |
| `ORA-28000: Account is locked` | Too many failed logins | Contact DBA to unlock account |
| `ORA-28001: Password has expired` | Password expired | Reset password in Oracle |

### PeopleSoft SOAP Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `AUTHENTICATION_FAILED` | Wrong username/password | Verify PeopleSoft credentials |
| `SOAP Fault: Invalid user` | User doesn't exist or locked | Check PeopleSoft user status |
| `Connection refused` | Server down or wrong port | Verify server is up, check port |
| `Connection timed out` | Network issue | Check VPN, firewall, network |
| `SSL certificate error` | Self-signed cert | Server may need proper SSL cert |
| `SOAP Fault: Not authorized` | Missing CI permissions | User needs permission to access Component Interfaces |

### Common Network Issues

1. **VPN Required**: Corporate PeopleSoft/Oracle servers often require VPN connection
2. **Firewall**: Ensure ports 1521 (Oracle) and 443/8443 (PeopleSoft) are open
3. **Proxy**: If behind a proxy, it may block direct database connections

### Checking API Status

You can check connection status via these endpoints:

```bash
# Oracle status
curl http://localhost:5173/api/oracle/status

# SOAP status
curl http://localhost:5173/api/soap/status
```

---

## Environment Variable Reference

### Oracle SQL Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_ORACLE_HOSTNAME` | Yes | - | Oracle server hostname or IP |
| `VITE_ORACLE_PORT` | No | 1521 | Oracle listener port |
| `VITE_ORACLE_SERVICE_NAME` | Yes | - | Oracle service name |

### PeopleSoft SOAP Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_PS_PROTOCOL` | No | https | http or https |
| `VITE_PS_SERVER` | Yes | - | PeopleSoft web server hostname |
| `VITE_PS_PORT` | No | 443 | Web server port |
| `VITE_PS_SITE_NAME` | Yes | - | PeopleSoft site name |
| `VITE_PS_PORTAL` | Yes | - | Portal name (e.g., EMPLOYEE) |
| `VITE_PS_NODE` | Yes | - | Node name (usually PT_LOCAL) |
| `VITE_PS_LANGUAGE_CODE` | No | ENG | Language code for requests |
| `VITE_SOAP_BLOCKING_FACTOR` | No | 40 | Records per batch |

---

## Security Notes

1. **Never commit `.env` to git** - It contains sensitive connection info
2. **Use HTTPS** - Always use `VITE_PS_PROTOCOL=https` in production
3. **Principle of least privilege** - Use accounts with minimal required permissions
4. **Audit logging** - Enable `VITE_ENABLE_AUDIT_TRAIL=true` in production
5. **Password security** - Passwords are only stored in memory, never persisted to disk

---

## Quick Reference: Full `.env` Example

```env
# Application Mode
VITE_APP_MODE=production

# Oracle SQL Connection
VITE_ORACLE_HOSTNAME=hr-db-prod.mycompany.com
VITE_ORACLE_PORT=1521
VITE_ORACLE_SERVICE_NAME=HRPRD

# PeopleSoft SOAP Connection
VITE_PS_PROTOCOL=https
VITE_PS_SERVER=ps-web-prod.mycompany.com
VITE_PS_PORT=8443
VITE_PS_SITE_NAME=HRPRD
VITE_PS_PORTAL=EMPLOYEE
VITE_PS_NODE=PT_LOCAL

# Optional Settings
VITE_ENABLE_DEBUG_LOGGING=false
VITE_ENABLE_AUDIT_TRAIL=true
```
