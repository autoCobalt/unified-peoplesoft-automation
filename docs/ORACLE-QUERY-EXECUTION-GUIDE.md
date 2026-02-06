# Oracle SQL Query Execution Guide

How an Oracle SQL query is executed in this project — from button click to database results.

---

## Architecture Overview

There are **5 layers** involved in executing a SQL query:

```
┌─────────────── FRONTEND ───────────────┐
│  Button Click → oracleApi.query.execute│
│  Attaches X-Session-Token from         │
│  sessionStorage                        │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         FASTIFY SERVER                │
│  Route match → Auth hook → Session     │
│  validate (Map lookup, 30min sliding)  │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         QUERY HANDLER                  │
│  Parse body → Validate queryId in      │
│  QUERY_REGISTRY → executeQuery()       │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         ORACLE SERVICE                 │
│  Load SQL (cache/disk) → Sanitize      │
│  (strip meta, semicolons) → Execute    │
│  via oracledb bind params              │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         RESPONSE TO CLIENT             │
│  { rows, rowCount, columns,            │
│    executionTimeMs }                   │
└────────────────────────────────────────┘
```

---

## Layer 1: The SQL File

SQL files live in a **two-directory fallback** system:

| Priority | Directory | Purpose |
|----------|-----------|---------|
| 1st | `src/server/sql/server/` | Local/untracked files (overrides bundled) |
| 2nd | `src/server/sql/bundled/` | Git-tracked files |

Files can optionally include a `@sql-meta` documentation block, which gets **stripped before execution**:

```sql
/*
 * @sql-meta
 * name: meow
 * description: Fetches all the cats
 * @end-sql-meta
 */
SELECT EMPLID, NAME, DEPARTMENT
FROM PS_EMPLOYEES
WHERE STATUS = 'A'
```

**Sanitization** (in `oracleService.ts`):
- Strips the `@sql-meta` comment block (metadata for UI only)
- Removes trailing semicolons (oracledb rejects them)
- Trims whitespace

---

## Layer 2: Query Registry (Server)

**File:** `src/server/sql/index.ts`

Every executable query must be registered in `QUERY_REGISTRY`. This acts as a **whitelist** — unregistered query IDs are rejected:

```typescript
export const QUERY_REGISTRY: QueryRegistry = {
  'connection-test': {
    filename: 'connection-test.sql',
    description: 'Simple DUAL query to verify Oracle connectivity',
    parameters: [],
  },
  'smartform-pending-transactions': {
    filename: 'smartform-pending-transactions.sql',
    description: 'Retrieves pending CI transactions awaiting approval',
    parameters: [],
  },
};
```

### Adding a New Query

Add an entry to the registry:

```typescript
'meow': {
  filename: 'meow.sql',
  description: 'Fetches all the cats',
  parameters: [],  // or define bind params here
},
```

**Why a registry?** Prevents path traversal attacks — arbitrary filenames can't be executed via the API even if they exist on disk.

---

## Layer 3: Authentication (Fastify Hooks)

**File:** `src/server/plugins/auth.ts`

Before any query executes, the request passes through Fastify preHandler hooks:

```
POST /api/oracle/query
  │
  ├─ 1. Fastify route match: '/api/oracle/query' with preHandler hooks
  │
  ├─ 2. app.requireSession hook: Extract X-Session-Token header
  │     ├─ Token not in Map? → 401 "Authentication required"
  │     ├─ Token expired (30min inactivity)? → Delete + 401
  │     └─ Token valid? → Update lastActivityAt (sliding window), continue
  │
  ├─ 3. app.requireOracle hook: Check oracle auth level
  │     └─ Not verified? → 403 "Oracle connection required"
  │
  └─ 4. Pass to route handler
```

### How the Session Token Gets Created

1. User enters Oracle credentials in **ConnectionPanel** UI
2. Frontend calls `POST /api/oracle/connect` with `{ connectionString, username, password }`
3. Server calls `oracleService.connect()` → tests with `SELECT 1 FROM DUAL`
4. On success, `sessionService.createSession(username, 'oracle')` generates a 256-bit random hex token
5. Token returned to client → stored in `sessionStorage` via `sessionStore.setSessionToken()`
6. Every subsequent request attaches it via `getSessionHeaders()` → `{ 'X-Session-Token': '...' }`

### Session Details

| Property | Value |
|----------|-------|
| Token generation | `randomBytes(32).toString('hex')` — 256-bit crypto |
| Storage (server) | In-memory `Map<string, Session>` — O(1) lookup |
| Storage (client) | `sessionStorage` — cleared on tab close |
| Timeout | 30 minutes of inactivity (sliding window) |
| Cleanup | Every 5 minutes, expired sessions pruned |
| On disconnect | All sessions for that auth source invalidated |

---

## Layer 4: Server Execution Pipeline

### Handler: `handleQuery()` (`src/server/oracle/handlers.ts`)

```
handleQuery(request, reply)
  │
  ├─ request.body as { queryId, parameters? }    // Fastify auto-parses (2MB limit)
  │
  ├─ isValidQueryId('meow')                       // Check QUERY_REGISTRY
  │   └─ Returns true → get config { filename: 'meow.sql' }
  │
  └─ oracleService.executeQuery('meow', parameters?)
```

### Service: `oracleService.executeQuery()` (`src/server/oracle/oracleService.ts`)

```
executeQuery('meow', parameters?)
  │
  ├─ Check this.state.isConnected === true
  │
  ├─ loadSqlFile('meow.sql')
  │   ├─ Check sqlCache (Map<string, string>) — hit? return cached
  │   ├─ Try: readFile('src/server/sql/server/meow.sql')
  │   ├─ sanitizeSqlForExecution(raw)
  │   │   ├─ Strip @sql-meta block
  │   │   └─ Remove trailing semicolon
  │   └─ Cache sanitized SQL for future calls
  │
  ├─ executeReal(sql, parameters)
  │   ├─ Convert parameters: booleans → 0/1 (Oracle compatibility)
  │   ├─ connection.execute(sql, bindParams, {
  │   │     outFormat: OUT_FORMAT_OBJECT,  // rows as objects, not arrays
  │   │     fetchArraySize: 1000           // performance tuning
  │   │   })
  │   └─ Extract columns from result.metaData
  │
  └─ Return { rows, rowCount, columns, executionTimeMs }
```

### Parameter Handling

- Uses **named bind parameters** (oracledb native — SQL injection safe)
- Boolean values converted to `1`/`0` (oracledb doesn't accept booleans)
- Parameters are NOT string-concatenated into SQL

---

## Layer 5: Front-End Call & UI

### Option A: Add a Convenience Method

**File:** `src/services/oracle/oracleApi.ts`

```typescript
// Inside the oracleApi.query object:
meow: () => executeQuery('meow'),
```

### Option B: Call the Generic Execute Directly

```typescript
const response = await oracleApi.query.execute('meow');
```

### Wiring to a Button

```typescript
import { useConnectionStore } from '../../../../stores/connectionStore';
import { oracleApi } from '../../../../services/oracle/oracleApi';

function MeowSection() {
  const oracleState = useConnectionStore(s => s.oracleState);

  const handleRunMeow = async () => {
    const response = await oracleApi.query.execute('meow');

    if (!response.success) {
      // If code === 'UNAUTHORIZED', sessionStore already cleared the token
      console.error(response.error.message);
      return;
    }

    // response.data = { rows, rowCount, columns, executionTimeMs }
    console.log(response.data.rows);
  };

  return (
    <button
      onClick={() => { void handleRunMeow(); }}
      disabled={!oracleState.isConnected}
    >
      Run Meow Query
    </button>
  );
}
```

**Notes:**
- `disabled={!oracleState.isConnected}` is a UX guard — the server enforces auth independently via the session token
- `oracleApi` auto-clears the session token on 401 responses, triggering the connection panel to reappear

---

## Complete Request Lifecycle

```
┌─────────────── FRONTEND ───────────────┐
│                                         │
│  Button Click                           │
│    ↓                                    │
│  oracleApi.query.execute('meow')        │
│    ↓                                    │
│  fetch('/api/oracle/query', {           │
│    method: 'POST',                      │
│    headers: {                           │
│      'Content-Type': 'application/json',│
│      'X-Session-Token': '<token>'  ◄────── sessionStorage
│    },                                   │
│    body: { queryId: 'meow' }            │
│  })                                     │
│                                         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         FASTIFY SERVER                  │
│                                         │
│  Route match: /api/oracle/query         │
│  preHandler: requireSession + requireOracle │
│  Session validate: token → Map lookup   │
│    → Expired? 401                       │
│    → Valid? Update lastActivityAt       │
│                                         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         QUERY HANDLER                   │
│                                         │
│  Parse body: { queryId: 'meow' }        │
│  Validate: QUERY_REGISTRY['meow'] ✓     │
│  oracleService.executeQuery('meow')     │
│    → Load meow.sql (cache or disk)      │
│    → Sanitize (strip meta, semicolons)  │
│    → connection.execute(sql, params)    │
│    → Return { rows, columns, timing }   │
│                                         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         RESPONSE TO CLIENT              │
│                                         │
│  { success: true, data: {               │
│      rows: [...],                       │
│      rowCount: 42,                      │
│      columns: ['EMPLID','NAME',...],    │
│      executionTimeMs: 850               │
│  }}                                     │
│                                         │
└─────────────────────────────────────────┘
```

---

## Quick Reference: Adding a New Query

| Step | File | Action |
|------|------|--------|
| 1 | `src/server/sql/server/<name>.sql` | Create the SQL file |
| 2 | `src/server/sql/index.ts` | Add entry to `QUERY_REGISTRY` |
| 3 | `src/services/oracle/oracleApi.ts` | *(Optional)* Add convenience method |
| 4 | Your component/store | Call `oracleApi.query.execute('<name>')` |
| 5 | — | **Nothing else** — auth, session, sanitization, caching are automatic |

---

## Reference Implementation

The SmartForm store (`src/stores/smartFormStore.ts`) is the primary reference:
- Calls `oracleApi.query.smartFormTransactions()` (wrapper for `execute('smartform-pending-transactions')`)
- Transforms rows via `transformOracleRows()` (adds client-side `status: 'pending'`)
- Parses CI data via `parseCIDataFromRecords(transactions)`
- Stores results in store state for DataTable rendering

---

## Key Files

| Layer | File | Purpose |
|-------|------|---------|
| SQL | `src/server/sql/server/*.sql` | SQL files (local, untracked) |
| SQL | `src/server/sql/bundled/*.sql` | SQL files (git-tracked) |
| Registry | `src/server/sql/index.ts` | `QUERY_REGISTRY` whitelist |
| Auth | `src/server/auth/sessionService.ts` | Session create/validate/cleanup |
| Auth Hooks | `src/server/plugins/auth.ts` | Fastify preHandler hooks (requireSession, requireOracle) |
| App Factory | `src/server/app.ts` | Route registration, CORS, plugins |
| Route | `src/server/routes/oracle.ts` | Oracle API route plugin |
| Handler | `src/server/oracle/handlers.ts` | Query execution logic |
| Service | `src/server/oracle/oracleService.ts` | Connection + query execution |
| Client API | `src/services/oracle/oracleApi.ts` | Fetch wrapper with session headers |
| Session | `src/services/session/sessionStore.ts` | Client-side token storage |
| Store | `src/stores/connectionStore.ts` | Connection state + session polling |

---

## Security Summary

| Protection | How |
|------------|-----|
| SQL Injection | oracledb native bind parameters (not string concat) |
| Unauthorized access | 256-bit session tokens, 30min sliding expiration |
| Path traversal | `QUERY_REGISTRY` whitelist — only registered IDs execute |
| DoS | 2MB request body limit via Fastify `bodyLimit` |
| Token theft | `sessionStorage` (cleared on tab close), not `localStorage` |
| CORS | Explicit origin allowlist, preflight handling |
| Headers | `nosniff`, `DENY` framing, strict CSP on API responses |
