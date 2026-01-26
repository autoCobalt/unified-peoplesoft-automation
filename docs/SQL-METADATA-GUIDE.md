# SQL Metadata Guide

This guide explains how to add metadata comments to SQL files for the unified-peoplesoft-automation project.

## Overview

SQL files can include a structured metadata block that provides:
- Documentation for what the query does
- Parameter definitions for bind variables
- Return column specifications
- Categorization and versioning

The metadata is parsed by the application and displayed in the SQL management UI.

---

## Quick Start

Add a comment block at the top of your SQL file:

```sql
/*
 * @sql-meta
 * name: my-query
 * description: Brief description of what this query does
 * @end-sql-meta
 */

SELECT * FROM MY_TABLE
```

That's it! The `name` and `description` fields are the minimum recommended metadata.

---

## Full Format

Here's a complete example with all available fields:

```sql
/*
 * @sql-meta
 * name: employee-by-department
 * description: Retrieves active employees filtered by department
 * author: Walter Alcazar
 * version: 1.2.0
 * category: hr
 * created: 2025-01-15
 * modified: 2025-01-24
 *
 * @returns
 * - EMPLID: VARCHAR2 - Employee ID
 * - NAME: VARCHAR2 - Full name (last, first)
 * - DEPARTMENT: VARCHAR2 - Department code
 * - HIRE_DATE: DATE [DD-MMM-YY] - Original hire date
 * - SALARY: NUMBER [currency] - Annual salary in USD
 * - STATUS: VARCHAR2 - Employment status (A=Active, I=Inactive)
 *
 * @params
 * - department_id: VARCHAR2 (required) - Department code to filter by
 * - as_of_date: DATE (optional) - Effective date for the query
 *
 * @tags
 * - hr
 * - employees
 * - reporting
 *
 * @notes
 * This query joins multiple tables and may be slow for large departments.
 * Consider using the indexed version for departments > 1000 employees.
 * @end-sql-meta
 */

SELECT
    e.EMPLID,
    e.NAME,
    e.DEPARTMENT,
    e.HIRE_DATE,
    e.STATUS
FROM PS_EMPLOYEES e
WHERE e.DEPARTMENT = :department_id
  AND e.EFFDT <= NVL(:as_of_date, SYSDATE)
  AND e.STATUS = 'A'
ORDER BY e.NAME
```

---

## Field Reference

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Unique identifier (matches filename without .sql) | `employee-by-department` |
| `description` | Brief summary of query purpose | `Retrieves active employees...` |

If these are missing, the parser uses defaults:
- `name`: Derived from filename
- `description`: "No description"

### Optional Fields

| Field | Format | Description |
|-------|--------|-------------|
| `author` | Free text | Who created/maintains this query |
| `version` | X.Y.Z | Semantic version number |
| `category` | Free text | Grouping category (hr, finance, utility) |
| `created` | YYYY-MM-DD | Original creation date |
| `modified` | YYYY-MM-DD | Last modification date |

### Sections

#### @returns

Documents the columns returned by the query.

**Format:** `- COLUMN_NAME: TYPE [format] - description`

The `[format]` specifier is optional but recommended for DATE and NUMBER columns.

```sql
 * @returns
 * - EMPLID: VARCHAR2 - Employee ID
 * - SALARY: NUMBER [currency] - Annual salary in USD
 * - HIRE_DATE: DATE [DD-MMM-YY] - Original hire date
 * - RATE: NUMBER [4dp] - Exchange rate
```

**Common Oracle Types:**
- `VARCHAR2` - Variable-length string
- `NUMBER` - Numeric value (integer or decimal)
- `DATE` - Date and time
- `CLOB` - Large text
- `BLOB` - Binary data

**Date Formats:**

Oracle uses the `DD-MMM-YY` format by default (e.g., `12-APR-23`).

| Format | Example | Description |
|--------|---------|-------------|
| `DD-MMM-YY` | `12-APR-23` | Oracle default date format |
| `oracle-date` | `12-APR-23` | Named alias for DD-MMM-YY |

The application provides utilities to convert common input formats:
- `MM/DD/YY` (e.g., `04/12/23`) → `12-APR-23`
- `MM/DD/YYYY` (e.g., `04/12/2023`) → `12-APR-23`

**Number Formats:**

| Format | Example | Description |
|--------|---------|-------------|
| `integer` | `1234` | Whole numbers only |
| `currency` | `1234.56` | 2 decimal places (monetary) |
| `2dp` | `1234.56` | Alias for currency |
| `4dp` | `0.1234` | 4 decimal places (rates) |
| `percentage` | `0.1500` | Decimal representation (15% = 0.15) |

#### @params

Documents bind parameters expected by the query.

**Format:** `- param_name: TYPE (required|optional) - description`

```sql
 * @params
 * - employee_id: NUMBER (required) - The employee ID to look up
 * - as_of_date: DATE (optional) - Effective date, defaults to today
 * - include_inactive: NUMBER (optional) - 1 to include inactive, 0 for active only
```

**Notes:**
- Parameter names should match bind variables in the SQL (without the colon)
- Use `required` or `optional` to indicate whether the parameter must be provided
- Oracle doesn't have a boolean type; use NUMBER (0/1) or VARCHAR2 ('Y'/'N')

#### @tags

Keywords for searching and categorization.

**Format:** `- tag_name`

```sql
 * @tags
 * - hr
 * - employees
 * - monthly-report
```

Tags should be lowercase, using hyphens for multi-word tags.

#### @notes

Free-form documentation for additional context.

```sql
 * @notes
 * This query requires SELECT access to PS_EMPLOYEES and PS_JOB tables.
 * Performance: Uses index on DEPARTMENT column, fast for < 10000 rows.
 * @end-sql-meta
```

Notes can span multiple lines. All content between `@notes` and `@end-sql-meta` is captured.

---

## Validation

The application validates metadata and reports issues:

### Error Levels

| Level | Icon | Meaning |
|-------|------|---------|
| Error | ❌ | Must be fixed (e.g., invalid date format) |
| Warning | ⚠️ | Should be fixed (e.g., missing description) |
| Info | ℹ️ | Suggestions for improvement |

### Common Issues

| Code | Level | Description |
|------|-------|-------------|
| `MISSING_META_BLOCK` | Warning | No @sql-meta block found |
| `UNCLOSED_META_BLOCK` | Error | @sql-meta not closed with @end-sql-meta |
| `MISSING_DESCRIPTION` | Warning | No description provided |
| `INVALID_DATE_FORMAT` | Error | Date not in YYYY-MM-DD format |
| `INVALID_VERSION_FORMAT` | Warning | Version not in X.Y.Z format |
| `UNDOCUMENTED_BIND_PARAM` | Warning | Bind parameter in SQL not documented |
| `MISSING_DATE_FORMAT` | Warning | DATE column has no format specification |
| `UNKNOWN_FORMAT_NAME` | Warning | Unrecognized format name in column definition |

### Validation API

You can validate SQL files via the API:

```bash
# Validate a specific file
GET /api/sql/validate?source=server&filename=my-query.sql

# Validate content before saving
POST /api/sql/validate-content
Content-Type: application/json

{
  "content": "/* @sql-meta ... */\nSELECT ...",
  "filename": "new-query.sql"
}
```

---

## Three-Tier Directory System

SQL files are organized in three tiers:

### 1. Server (Built-in)

- **Location:** `src/server/sql/server/`
- **Access:** Read-only
- **Purpose:** Curated queries bundled with the application

These are the "official" queries maintained by developers.

### 2. Shared (Department)

- **Location:** Configured via `VITE_SQL_SHARED_PATH` or UI
- **Access:** Read/Write (with appropriate permissions)
- **Purpose:** Department-level queries shared among users

Example paths:
```bash
# Windows network share
VITE_SQL_SHARED_PATH=//fileserver/department/sql

# Mapped drive
VITE_SQL_SHARED_PATH=S:/shared/sql
```

### 3. Personal (User)

- **Location:** User-specified, stored in browser localStorage
- **Access:** Full control
- **Purpose:** Individual user's custom queries

The personal path is configured through the UI and cached locally.

---

## Best Practices

### Naming Conventions

- Use lowercase with hyphens: `employee-by-department.sql`
- Keep names descriptive but concise
- Prefix with category if helpful: `hr-employee-search.sql`

### Versioning

Use semantic versioning (X.Y.Z):
- **Major (X):** Breaking changes to parameters or return columns
- **Minor (Y):** New functionality, backward compatible
- **Patch (Z):** Bug fixes, performance improvements

### Documentation Quality

1. **Description:** Write as if explaining to someone unfamiliar with the query
2. **Parameters:** Include valid ranges, default behavior, examples
3. **Returns:** Document all columns, especially calculated ones
4. **Notes:** Include performance considerations, required permissions

### Example: Well-Documented Query

```sql
/*
 * @sql-meta
 * name: pending-approvals-summary
 * description: Aggregates pending approval counts by type and age bracket
 * author: Walter Alcazar
 * version: 2.0.0
 * category: workflow
 * created: 2025-01-10
 * modified: 2025-01-24
 *
 * @returns
 * - APPROVAL_TYPE: VARCHAR2 - Type of approval (POSITION, JOB, TERMINATION)
 * - AGE_BRACKET: VARCHAR2 - Age category (0-7 days, 8-14 days, 15+ days)
 * - PENDING_COUNT: NUMBER - Number of pending items in this bracket
 * - OLDEST_DATE: DATE - Oldest pending item's submission date
 *
 * @params
 * - manager_id: VARCHAR2 (optional) - Filter to specific manager, null for all
 * - cutoff_date: DATE (optional) - Only count items submitted after this date
 *
 * @tags
 * - workflow
 * - approvals
 * - dashboard
 * - reporting
 *
 * @notes
 * Used by the dashboard widget to show approval backlog.
 * Query is optimized with indexes on SUBMIT_DATE and MANAGER_ID.
 * Returns no rows if no pending approvals exist (not an error).
 * @end-sql-meta
 */

SELECT
    APPROVAL_TYPE,
    CASE
        WHEN TRUNC(SYSDATE) - TRUNC(SUBMIT_DATE) <= 7 THEN '0-7 days'
        WHEN TRUNC(SYSDATE) - TRUNC(SUBMIT_DATE) <= 14 THEN '8-14 days'
        ELSE '15+ days'
    END AS AGE_BRACKET,
    COUNT(*) AS PENDING_COUNT,
    MIN(SUBMIT_DATE) AS OLDEST_DATE
FROM PS_PENDING_APPROVALS
WHERE STATUS = 'PENDING'
  AND (:manager_id IS NULL OR MANAGER_ID = :manager_id)
  AND (:cutoff_date IS NULL OR SUBMIT_DATE >= :cutoff_date)
GROUP BY
    APPROVAL_TYPE,
    CASE
        WHEN TRUNC(SYSDATE) - TRUNC(SUBMIT_DATE) <= 7 THEN '0-7 days'
        WHEN TRUNC(SYSDATE) - TRUNC(SUBMIT_DATE) <= 14 THEN '8-14 days'
        ELSE '15+ days'
    END
ORDER BY APPROVAL_TYPE, AGE_BRACKET
```

---

## Using Format Converters in Code

The application provides utility functions for converting user input to Oracle-compatible formats.

### Date Conversion

```typescript
import { toOracleDate, isValidOracleDate } from '@/utils/formatConverters';

// Convert user input to Oracle format
const userInput = '04/12/23';
const oracleDate = toOracleDate(userInput);  // '12-APR-23'

// Validate Oracle format
if (isValidOracleDate(oracleDate)) {
  // Safe to send to Oracle
}

// In a workflow handler
await executeQuery(sql, { hire_date: toOracleDate(userInput) });
```

**Supported input formats:**
- `MM/DD/YY` → `DD-MMM-YY`
- `MM/DD/YYYY` → `DD-MMM-YY`
- `DD-MMM-YY` → passthrough (normalized to uppercase)

### Number Conversion

```typescript
import { formatNumber, parseCurrencyInput } from '@/utils/formatConverters';

// Parse user currency input (removes $, commas)
const userInput = '$1,234.56';
const amount = parseCurrencyInput(userInput);  // 1234.56

// Format for Oracle
const oracleValue = formatNumber(amount, 'currency');  // '1234.56'

// Format for display (with commas)
import { formatNumberDisplay } from '@/utils/formatConverters';
const display = formatNumberDisplay(amount, 'currency');  // '1,234.56'
```

**Available formats:**
- `integer` - Rounds to whole number
- `currency` / `2dp` - 2 decimal places
- `4dp` - 4 decimal places (for rates)
- `percentage` - Decimal representation

---

## Troubleshooting

### Metadata Not Appearing

1. Check that `@sql-meta` is at the start of the block
2. Ensure `@end-sql-meta` closes the block
3. Verify the file has `.sql` extension

### Validation Errors

1. **Invalid date format:** Use YYYY-MM-DD (e.g., 2025-01-24)
2. **Invalid version:** Use X.Y.Z format (e.g., 1.0.0)
3. **Undocumented parameters:** Add missing params to `@params` section

### Parser Behavior

The parser is **lenient** - it never fails:
- Missing metadata block → Uses filename as name, "No description"
- Malformed fields → Skipped silently
- Validation runs separately to report issues

This ensures legacy SQL files work immediately.
