# Server-Side State & Services — Comprehensive Architecture Reference

> **Purpose:** Complete reference of all server-side in-memory state, session management, event bus, WebSocket routing, and workflow orchestration. Intended for debugging state synchronization issues between client and server.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [SessionService](#sessionservice)
3. [EventBus](#eventbus)
4. [WebSocketManager](#websocketmanager)
5. [Server Workflow State](#server-workflow-state)
6. [Auth Plugin (Route Guards)](#auth-plugin-route-guards)
7. [API Endpoints & Data Contracts](#api-endpoints--data-contracts)
8. [Client ↔ Server Field Mapping](#client--server-field-mapping)
9. [Session Lifecycle](#session-lifecycle)
10. [Event Flow Diagrams](#event-flow-diagrams)

---

## Architecture Overview

The Fastify server holds **all state in memory** — no database, no Redis, no persistence. A server restart wipes all sessions, connections, and workflow state.

```
Fastify Server (single process in production)
│
├── sessionService (singleton)
│   └── sessions: Map<token, Session>        ← ALL authentication state
│       └── Session { auth.oracle, auth.soap, lastActivityAt }
│
├── eventBus (singleton)
│   └── Node EventEmitter
│       └── Listeners: wsManager.onAll(), internal subscribers
│
├── wsManager (singleton)
│   └── connections: Map<token, Set<ConnectionMeta>>
│       └── ConnectionMeta { ws, heartbeatTimer, pongTimeout, alive }
│
├── Workflow State (per-service module variables)
│   ├── managerWorkflowService → ManagerWorkflowState
│   └── otherWorkflowService → OtherWorkflowState
│
├── Oracle Connection State (oracledb connection pool/instances)
│
└── SOAP Connection State (credentials + config in memory)
```

**Key principle:** The server is the **source of truth** for:
- Session validity (token → Session map)
- Auth levels (oracle/soap verified per session)
- Workflow progress (current step, transaction results)
- WebSocket connection tracking

The client is the **source of truth** for:
- UI state (active tab, collapse overrides, cell selection)
- Selection state (which transactions are checked)
- Submission tracking (PreparedSubmission status per record)

---

## SessionService

**File:** `src/server/auth/sessionService.ts`
**Singleton:** `sessionService`

### In-Memory State

```typescript
private sessions = new Map<string, Session>();
private cleanupInterval: ReturnType<typeof setInterval> | null;
```

### Session Object Shape

```typescript
interface Session {
  token: string;            // 256-bit hex string (64 chars)
  createdAt: Date;
  lastActivityAt: Date;     // Updated on every validateSession() call (sliding expiration)

  auth: {
    oracle: AuthLevel;
    soap: AuthLevel;
  };
}

interface AuthLevel {
  verified: boolean;         // Whether this auth level is currently active
  username: string | null;   // Who authenticated (null if not verified)
  verifiedAt: Date | null;   // When last verified
}
```

### Token Generation

```typescript
randomBytes(32).toString('hex')  // 256-bit cryptographic random → 64-char hex string
```

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `SESSION_TIMEOUT_MS` | `30 * 60 * 1000` (30 min) | Inactivity timeout |
| `CLEANUP_INTERVAL_MS` | `5 * 60 * 1000` (5 min) | Expired session cleanup interval |

### Methods

| Method | Behavior |
|--------|----------|
| `createSession(existingToken?)` | If `existingToken` is valid and not expired: updates `lastActivityAt`, returns same token. Otherwise: generates new token, creates Session with both auth levels unverified. |
| `upgradeAuth(authSource, username, existingToken?)` | Ensures session exists (creates if needed). Sets `auth[authSource].verified = true` with username and timestamp. Emits `auth:*-changed` event via eventBus. Returns token. |
| `downgradeAuth(token, authSource)` | Sets `auth[authSource]` to unverified. Emits `auth:*-changed` event if the level was previously verified. |
| `downgradeAllByAuthSource(authSource)` | Iterates ALL sessions, downgrades the specified auth level on each. Used when a service disconnects affecting all users (e.g., Oracle connection pool dies). |
| `validateSession(token)` | Looks up session. If expired: deletes it, emits `session:expired`. If valid: updates `lastActivityAt` (sliding expiration), returns Session. **This is called on every authenticated request.** |
| `invalidateSession(token)` | Deletes session entirely. |
| `getSessionInfo(token)` | **Read-only** — returns `{ valid, expiresInMs, oracleVerified, soapVerified }` WITHOUT updating `lastActivityAt`. Used by the status polling endpoint so passive checks don't extend sessions. |
| `getActiveSessionCount()` | Returns `sessions.size`. |
| `shutdown()` | Clears cleanup interval, clears all sessions. |

### Cleanup Scheduler

Runs every 5 minutes (via `setInterval.unref()` — doesn't prevent process exit):
1. Iterates all sessions
2. If `(Date.now() - lastActivityAt) > 30 min`: removes session, emits `session:expired` via eventBus
3. Logs count of removed sessions

### Critical Behavior: Sliding Expiration

`validateSession()` updates `lastActivityAt` on every call. This means:
- Active API requests extend the session
- The session status endpoint (`getSessionInfo()`) does NOT extend it (intentional)
- The 2-minute client-side polling uses `getSessionInfo()` — passive

**Race condition note:** If a session is very close to expiring (< 2 minutes left), the client poll might see it as valid, but by the next poll or API call, it could be expired. The server handles this gracefully — `validateSession()` deletes expired sessions atomically and emits `session:expired`.

---

## EventBus

**File:** `src/server/events/eventBus.ts`
**Singleton:** `eventBus`

### Architecture

Wraps Node.js `EventEmitter` with a typed API. Max listeners set to 500 (handles ~100 users × 5 tabs).

### Event Types (Discriminated Union)

```typescript
type ServerEvent =
  | { type: 'workflow:progress'; sessionToken: string; payload: WorkflowProgressPayload }
  | { type: 'auth:oracle-changed'; sessionToken: string; payload: AuthChangedPayload }
  | { type: 'auth:soap-changed'; sessionToken: string; payload: AuthChangedPayload }
  | { type: 'session:expired'; sessionToken: string; payload: {} };
```

### Event Payloads

**`WorkflowProgressPayload`:**
```typescript
{
  workflowType: 'manager' | 'other';
  status: WorkflowStatus;           // 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled'
  step: string;                     // e.g., 'approving', 'idle', 'completed'
  progress: RawWorkflowProgress | null;  // { current, total, currentItem? }
  error: string | null;
  results: {
    approvedCount?: number;
    transactionResults?: Record<string, 'approved' | 'error'>;  // per-txn outcomes
    pauseReason?: string;           // 'tab-switch', 'browser-closed', or undefined
  };
}
```

**`AuthChangedPayload`:**
```typescript
{
  verified: boolean;         // true = connected, false = disconnected
  username: string | null;   // who authenticated (null on disconnect)
  reason: string;            // 'connected', 'disconnected', 'service-disconnected'
}
```

### Methods

| Method | Behavior |
|--------|----------|
| `emit(event: ServerEvent)` | Emits on the specific event type channel AND on the wildcard `'*'` channel. |
| `on(type, handler)` | Subscribe to a specific event type. Returns unsubscribe function. |
| `onAll(handler)` | Subscribe to ALL events (wildcard). Used by wsManager. Returns unsubscribe function. |
| `shutdown()` | Removes all listeners. |

### Who Emits What

| Event | Emitted by | When |
|-------|-----------|------|
| `workflow:progress` | Workflow services | Every progress change during approval/submission |
| `auth:oracle-changed` | `sessionService.upgradeAuth('oracle')`, `sessionService.downgradeAuth(*, 'oracle')`, `sessionService.downgradeAllByAuthSource('oracle')` | Oracle connect/disconnect |
| `auth:soap-changed` | Same as above but for SOAP | SOAP connect/disconnect |
| `session:expired` | `sessionService.validateSession()` (on expired check), `sessionService.cleanupExpiredSessions()` | Session timeout |

---

## WebSocketManager

**File:** `src/server/services/wsManager.ts`
**Singleton:** `wsManager`

### In-Memory State

```typescript
// Connections indexed by session token. One token can have multiple connections (multi-tab).
private connections = new Map<string, Set<ConnectionMeta>>();

interface ConnectionMeta {
  ws: WebSocket;
  token: string;
  heartbeatTimer: ReturnType<typeof setInterval> | null;  // 30s ping interval
  pongTimeout: ReturnType<typeof setTimeout> | null;       // 10s pong deadline
  alive: boolean;                                           // reset to true on pong
}
```

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `HEARTBEAT_INTERVAL_MS` | `30,000` (30s) | Server pings each client |
| `HEARTBEAT_TIMEOUT_MS` | `10,000` (10s) | Client must respond with pong |

### Methods

| Method | Behavior |
|--------|----------|
| `addClient(token, ws)` | Creates `ConnectionMeta`, adds to connections map, starts heartbeat, listens for pong/close events. |
| `removeConnection(meta)` | Clears pong timeout first (prevents race), then clears heartbeat interval, removes from map. |
| `removeAllForToken(token)` | Removes ALL connections for a token. Closes each with code `4002` (session expired). Used on session expiry. |
| `sendToSession(token, event)` | Finds all connections for token. Strips `sessionToken` from event before sending. Sends JSON to each open connection. |
| `totalConnections()` | Sum of all connection sets. |
| `totalSessions()` | Number of unique tokens with connections. |
| `shutdown()` | Unsubscribes from event bus, closes all connections with code `1001` (going away), clears map. |

### Heartbeat Protocol

```
Every 30 seconds per connection:
  1. If !meta.alive → client didn't respond to last ping → ws.terminate() + remove
  2. Set meta.alive = false
  3. Send ping
  4. Set 10s timeout: if still !alive → ws.terminate() + remove

On pong received:
  meta.alive = true
  Clear pong timeout
```

### Event Routing

At construction, wsManager subscribes to `eventBus.onAll()`:
```
eventBus emits ServerEvent →
  wsManager.sendToSession(event.sessionToken, event) →
    For each WebSocket connection with that token:
      Strip sessionToken from event
      Send JSON: { type: event.type, payload: event.payload }
```

### Client Message Format (sent over WebSocket)

```typescript
// Server sends:
interface ClientMessage {
  type: ServerEventType;   // 'workflow:progress' | 'auth:*-changed' | 'session:expired'
  payload: ServerEvent['payload'];  // Payload WITHOUT sessionToken
}
```

**Security:** `sessionToken` is NEVER sent to the client. It's used only for routing.

### WebSocket Connection Establishment

```
Client: wsService.connect(token) →
  WebSocket URL: ws://host/ws?token=<token>

Server (src/server/routes/websocket.ts):
  1. Extract token from query string
  2. Validate session via sessionService.validateSession(token)
  3. If invalid: ws.close(4001, 'Invalid session')
  4. If valid: wsManager.addClient(token, ws)
```

### WebSocket Close Codes

| Code | Meaning | Reconnect? |
|------|---------|-----------|
| `1000` | Normal close (client disconnect) | No (intentional) |
| `1001` | Server shutting down | No |
| `4001` | Invalid/missing session token | No |
| `4002` | Session expired | No (client dispatches `session:expired` locally) |
| Any other | Unexpected close | Yes (exponential backoff, max 3 attempts) |

---

## Server Workflow State

**File:** `src/server/workflows/types.ts`

### Manager Workflow State

```typescript
interface ManagerWorkflowState {
  status: WorkflowStatus;      // 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled'
  currentStep: 'idle' | 'preparing' | 'approving' | 'submitting' | 'completed';
  progress: RawWorkflowProgress | null;  // { current, total, currentItem? }
  error: string | null;
  isPaused: boolean;
  results: {
    preparedCount?: number;
    approvedCount?: number;
    submittedCount?: number;
    transactionResults?: Record<string, 'approved' | 'error'>;
    pauseReason?: string;
  };
}

const INITIAL_MANAGER_STATE: ManagerWorkflowState = {
  status: 'idle', currentStep: 'idle', progress: null,
  error: null, isPaused: false, results: {},
};
```

### Other Workflow State

```typescript
interface OtherWorkflowState {
  status: WorkflowStatus;
  currentStep: 'idle' | 'approving' | 'completed';
  progress: RawWorkflowProgress | null;
  error: string | null;
  isPaused: boolean;
  results: {
    approvedCount?: number;
    transactionResults?: Record<string, 'approved' | 'error'>;
    pauseReason?: string;
  };
}

const INITIAL_OTHER_STATE: OtherWorkflowState = {
  status: 'idle', currentStep: 'idle', progress: null,
  error: null, isPaused: false, results: {},
};
```

### API Response Shape (for polling)

```typescript
interface WorkflowStatusResponse {
  status: WorkflowStatus;
  step: string;
  progress: RawWorkflowProgress | null;
  error: string | null;
  results?: {
    transactionResults?: Record<string, 'approved' | 'error'>;
    [key: string]: unknown;
  };
}
```

### Server vs Client Workflow Step Names

**Manager:**

| Server `status` | Server `currentStep` | Client `managerWorkflow.step` |
|-----------------|---------------------|-------------------------------|
| `'idle'` | `'idle'` | `'idle'` |
| `'running'` | `'approving'` | `'approving'` |
| `'paused'` | `'approving'` | `'approving'` (+ `isWorkflowPaused=true`) |
| `'completed'` | `'completed'` | `'approved'` |
| `'error'` | any | `'error'` |
| `'cancelled'` | any | `'idle'` |

**Note:** The client has additional steps (`submitting-dept-co`, `submitting-position`, `submitting-job`, `complete`) that are entirely client-side — they don't map to server workflow state. SOAP submissions happen from the client directly.

**Other:**

| Server `status` | Client `otherWorkflow.step` |
|-----------------|-------------------------------|
| `'running'` | `'approving'` |
| `'paused'` | `'approving'` (+ `isOtherWorkflowPaused=true`) |
| `'completed'` | `'approved'` → (300ms timeout) → `'complete'` |
| `'error'` | `'error'` |
| `'cancelled'` | `'idle'` |

Client-only steps: `submitting-dept-co`, `submitting-position-create`, `submissions-complete`.

---

## Auth Plugin (Route Guards)

**File:** `src/server/plugins/auth.ts`

Three `preHandler` hooks registered as Fastify decorators:

| Hook | Validates | On failure |
|------|----------|-----------|
| `requireSession` | Token present AND `sessionService.validateSession()` returns non-null | 401 with `UNAUTHORIZED` error |
| `requireOracle` | Session exists AND `auth.oracle.verified === true` | 403 with `ORACLE_NOT_CONNECTED` error |
| `requireSoap` | Session exists AND `auth.soap.verified === true` | 403 with `SOAP_NOT_CONNECTED` error |

**Usage pattern in routes:**
```typescript
app.post('/query', {
  preHandler: [app.requireSession, app.requireOracle]
}, handler);
```

**Critical behavior:** `requireSession` calls `sessionService.validateSession(token)`, which:
1. Looks up the session
2. If expired: **deletes it**, emits `session:expired`, returns null → 401
3. If valid: updates `lastActivityAt` (extends session), returns Session

This means every authenticated API request extends the session by 30 minutes.

---

## API Endpoints & Data Contracts

### Session Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/api/session/status` | None (public) | Header: `X-Session-Token` | `{ success, data: { valid, expiresInMs, oracleVerified, soapVerified, reason? } }` |
| POST | `/api/session/create` | None (public) | Header: `X-Session-Token` (optional) | `{ success, data: { sessionToken } }` |

### Oracle Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/oracle/connect` | None | `{ connectionString, username, password }` | `{ success, data: { sessionToken } }` — calls `sessionService.upgradeAuth('oracle')` |
| POST | `/api/oracle/disconnect` | Session | — | `{ success }` — calls `sessionService.downgradeAuth(token, 'oracle')` |
| POST | `/api/oracle/query` | Session + Oracle | `{ queryId, parameters? }` | `{ success, data: { rows, rowCount, columns, executionTimeMs } }` |

### SOAP Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/soap/connect` | None | `{ username, password }` | `{ success, data: { sessionToken } }` — calls `sessionService.upgradeAuth('soap')` |
| POST | `/api/soap/disconnect` | Session | — | `{ success }` — calls `sessionService.downgradeAuth(token, 'soap')` |
| POST | `/api/soap/submit` | Session + SOAP | `{ ciName, action, payload }` | `{ success, data: SOAPResponse }` |
| POST | `/api/soap/fetch-ci-shape` | Session + SOAP | `{ ciName }` | `{ success, data: CIShapeDefinition }` |

### Workflow Endpoints (Manager)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/workflows/manager/start-approvals` | Session | `{ transactionIds, testSiteUrl? }` | `{ success, message }` |
| GET | `/api/workflows/manager/status` | Session | — | `WorkflowStatusResponse` |
| POST | `/api/workflows/manager/pause` | Session | `{ reason? }` | `{ success, message }` |
| POST | `/api/workflows/manager/resume` | Session | — | `{ success, message }` |
| POST | `/api/workflows/manager/stop` | Session | — | `{ success, message }` |

### Workflow Endpoints (Other)

Same pattern as Manager but under `/api/workflows/other/*`.

### CI Shape & Template Endpoints

| Method | Path | Auth | Request/Params | Response |
|--------|------|------|---------------|----------|
| GET | `/api/ci-shapes` | Session | — | `{ success, data: string[] }` (shape names) |
| GET | `/api/ci-shapes/detail?name=X` | Session | Query: `name` | `{ success, data: CIShapeDefinition }` |
| GET | `/api/ci-shapes/labels?name=X` | Session | Query: `name` | `{ success, data: Record<string, string> }` |
| GET | `/api/ci-templates` | Session | — | `{ success, data: CustomCITemplate[] }` |
| GET | `/api/ci-templates/by-id?id=X` | Session | Query: `id` | `{ success, data: CustomCITemplate }` |
| POST | `/api/ci-templates/save` | Session | `CustomCITemplate` body | `{ success, data: { id } }` |
| POST | `/api/ci-templates/update` | Session | `CustomCITemplate` body | `{ success }` |
| POST | `/api/ci-templates/delete` | Session | `{ id }` body | `{ success }` |

### Development-Only Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/api/dev/create-session` | None | `{ username, authSource }` | `{ success, data: { sessionToken } }` — creates session AND upgrades auth in one call |

---

## Client ↔ Server Field Mapping

### Session Token Flow

```
CLIENT                           SERVER
──────                           ──────
sessionStorage['unified-        sessions.get(token) → Session
  peoplesoft-session-token']

getSessionToken() ──────────→   extractToken(request) = request.headers['x-session-token']
                                validateSession(token) → updates lastActivityAt

wsService.connect(token) ──→    ws?token=<token> → wsManager.addClient(token, ws)
```

### Connection State Mapping

| Client State | Server State | How they sync |
|-------------|-------------|---------------|
| `connectionStore.oracleState.isConnected` | `session.auth.oracle.verified` | Client sets on API response. Server validates on each request. If server says expired/invalid, client gets 401/403. WebSocket `auth:oracle-changed` can push changes. |
| `connectionStore.soapState.isConnected` | `session.auth.soap.verified` | Same pattern as Oracle. |
| `connectionStore.oracleCredentials` | Not stored server-side (in Oracle connection pool) | Client stores creds for UI display. Server uses them for the actual Oracle connection. |

### Workflow State Mapping

| Client Field | Server Field | Sync Mechanism |
|-------------|-------------|----------------|
| `smartFormStore.managerWorkflow.step` | `managerWorkflowState.status + currentStep` | WebSocket `workflow:progress` events (real-time) or HTTP polling fallback |
| `smartFormStore.managerWorkflow.current/total` | `managerWorkflowState.progress.current/total` | Same |
| `smartFormStore.managerWorkflow.currentItem` | `managerWorkflowState.progress.currentItem` | Same |
| `smartFormStore.isWorkflowPaused` | `managerWorkflowState.isPaused` | Derived from `status === 'paused'` in the progress handler |
| `smartFormStore.managerPauseReason` | `managerWorkflowState.results.pauseReason` | Same |
| Record `status` field | `results.transactionResults[txnNbr]` | `updateRecordStatuses()` maps server results to client record statuses |

### Per-Transaction Result Mapping

Server accumulates `transactionResults` as a `Record<string, 'approved' | 'error'>` during the approval workflow. Each progress event includes the full map (cumulative, not incremental).

Client's `updateRecordStatuses()` maps these to `SmartFormRecord.status`:
```
Server 'approved'  → Client 'success'
Server 'error'     → Client 'error'
progress.currentItem === txnNbr → Client 'processing'
Not in results     → unchanged (stays 'pending')
```

### Data NOT Synced Between Client and Server

| Data | Lives only on | Reason |
|------|--------------|--------|
| `selectedByTab` (checkbox selections) | Client | UI-only concern; server doesn't need to know which are selected |
| `parsedCIData` | Client | Parsed from Oracle query results client-side; server never sees parsed CI |
| `preparedDeptCoData/PositionData/JobData` | Client | Submission tracking is client-side; SOAP calls go directly from client to server |
| `tableCollapseOverrides` | Client | UI preference |
| `txnExcludedTables` | Client | UI preference |
| `ciLabelsStore.labels` | Client (cached from server) | Fetched on-demand, cached in memory |
| Oracle connection pool | Server | Client only knows `isConnected` boolean |
| SOAP credentials (actual) | Server | Client stores for UI; server uses for real SOAP calls |

---

## Session Lifecycle

### Complete Lifecycle Diagram

```
1. USER OPENS TAB
   Client: sessionStorage is empty
   Server: no session exists

2. USER CONNECTS ORACLE
   Client: connectionStore.connectOracle(creds)
     → clearSessionToken()
     → [Dev] POST /api/dev/create-session
     → [Prod] POST /api/oracle/connect
   Server: sessionService.upgradeAuth('oracle', username)
     → Creates Session if needed (randomBytes(32).toString('hex'))
     → Sets auth.oracle.verified = true
     → Emits auth:oracle-changed { verified: true }
   Client: setSessionToken(token) → sessionStorage
   Client: wsService.connect(token) → WebSocket opens
   Server: wsManager.addClient(token, ws) → heartbeat starts

3. SESSION IS ACTIVE
   Every authenticated API request:
     Server: validateSession(token) → updates lastActivityAt (extends 30 min)
   Every 2 minutes:
     Client: checkSessionStatus() → GET /api/session/status
     Server: getSessionInfo(token) → returns { valid, expiresInMs } (NO extension)
   Every 30 seconds:
     Server: wsManager heartbeat ping → client pong

4. USER CONNECTS SOAP (same token)
   Client: connectionStore.connectSoap(creds)
     → clearSessionToken()                    ⚠️ CLEARS existing token
     → POST /api/soap/connect
   Server: sessionService.upgradeAuth('soap', username, existingToken?)
     → If existingToken valid: upgrades same session
     → If not: creates NEW session
   Client: setSessionToken(newToken)          ⚠️ May be different token
   Client: wsService.connect(newToken)        ⚠️ Reconnects with new token

5. INACTIVITY TIMEOUT (30 min)
   Server cleanup scheduler (every 5 min):
     → Finds expired sessions
     → Deletes them
     → Emits session:expired for each
   wsManager receives via eventBus:
     → Closes all WebSocket connections for that token with code 4002
   Client receives WebSocket close 4002:
     → Dispatches session:expired locally
     → connectionStore.handleSessionExpired()
       → wsService.disconnect()
       → clearSessionToken()
       → Reset ALL connection state

6. USER DISCONNECTS (voluntary)
   Client: connectionStore.disconnectOracle()
     → [Prod] POST /api/oracle/disconnect
   Server: sessionService.downgradeAuth(token, 'oracle')
     → Sets auth.oracle.verified = false
     → Emits auth:oracle-changed { verified: false, reason: 'disconnected' }
   Client: resets oracle state
   Note: Session token STAYS ALIVE — only the auth level is revoked

7. TAB CLOSES
   Client: sessionStorage cleared (browser behavior)
   Server: WebSocket close detected → wsManager removes connection
   Server: Session stays in memory until 30-min timeout
```

### Potential Synchronization Issues

#### Issue 1: Token Cleared During Second Connection

When connecting SOAP after Oracle (step 4 above), `clearSessionToken()` is called BEFORE the SOAP connect request. If the SOAP connect fails, the Oracle session token is gone. The client thinks Oracle is still connected, but has no token to prove it.

**Impact:** All subsequent authenticated requests will fail with 401.

#### Issue 2: Session Polling vs API Request Race

The session status poll uses `getSessionInfo()` (read-only, no extension). If the session has 1 minute left and the user makes an API request, `validateSession()` extends it. But if the poll fires first and sees `expiresInMs < 0`, it would (incorrectly) clear the session before the API request has a chance to extend it.

**Mitigation:** The client only acts on `valid === false`, and the server cleanup only runs every 5 minutes. The 2-minute poll interval means there's always a window.

#### Issue 3: Server Restart

All in-memory state is lost. Client still has the session token in `sessionStorage`, but the server no longer recognizes it. Next API request gets 401, which triggers the client's unauthorized handling.

**No automatic recovery** — user must reconnect manually.

#### Issue 4: Oracle/SOAP Disconnect Affects ALL Sessions

The disconnect route handlers call `sessionService.downgradeAllByAuthSource()`, NOT `downgradeAuth()`:

```typescript
// src/server/routes/oracle.ts:106
sessionService.downgradeAllByAuthSource('oracle');

// src/server/routes/soap.ts:90
sessionService.downgradeAllByAuthSource('soap');
```

This means **any user disconnecting Oracle/SOAP downgrades ALL active sessions' auth levels** — not just their own. Every connected user receives an `auth:*-changed` WebSocket event with `verified: false, reason: 'service-disconnected'`, causing their connectionStore to reset that connection type.

**Impact:** In a multi-user scenario, one user disconnecting from Oracle would kick every other user's Oracle connection state back to disconnected, even though their Oracle connection pool may still be alive server-side.

#### Issue 5: Multi-Tab Token Sharing

Each browser tab gets its own `sessionStorage` (browser spec). But if a user opens the app in two tabs in the same window using the same session (e.g., via URL copy), they share the same token. The server handles this (multiple connections per token), but auth changes affect all tabs simultaneously.

---

## Event Flow Diagrams

### Workflow Progress Event Flow

```
Server (workflow service loop iteration):
  workflowState.progress.current++
  workflowState.results.transactionResults[txnNbr] = 'approved'
  eventBus.emit({
    type: 'workflow:progress',
    sessionToken: token,
    payload: {
      workflowType: 'manager',
      status: 'running',
      step: 'approving',
      progress: { current: 5, total: 10, currentItem: '123456' },
      error: null,
      results: {
        transactionResults: { '123451': 'approved', '123452': 'approved', ... },
      },
    },
  })
      ↓
  eventBus emits on 'workflow:progress' AND '*'
      ↓
  wsManager.onAll handler receives event
      ↓
  wsManager.sendToSession(token, event)
      ↓
  Strips sessionToken, serializes to JSON
      ↓
  Sends to all WebSocket connections for that token
      ↓
Client:
  wsService.onmessage → parse JSON → dispatch to handlers
      ↓
  smartFormStore's wsService.on('workflow:progress') handler
      ↓
  handleManagerStatus(payload):
    - Updates managerWorkflow step/progress
    - Calls updateRecordStatuses():
      - Maps transactionResults to SmartFormRecord.status
      - Sets currentItem record to 'processing'
      ↓
  React components re-render via Zustand subscription
```

### Auth Change Event Flow

```
Server:
  sessionService.downgradeAuth(token, 'oracle')
    → Sets auth.oracle.verified = false
    → eventBus.emit({
        type: 'auth:oracle-changed',
        sessionToken: token,
        payload: { verified: false, username: null, reason: 'disconnected' },
      })
      ↓
  wsManager routes to client
      ↓
Client:
  connectionStore's wsService.on('auth:oracle-changed') handler
    → If !payload.verified && oracleState.isConnected:
      → Reset oracleState to initial
      → Clear oracleCredentials
      → Update derivedFlags
```

### Session Expiration Event Flow

```
Server (cleanup scheduler or validateSession):
  Session found expired
    → sessions.delete(token)
    → eventBus.emit({ type: 'session:expired', sessionToken: token, payload: {} })
      ↓
  wsManager receives via onAll:
    → Normal event routing: sends { type: 'session:expired', payload: {} } to client

  Additionally, wsManager.removeAllForToken(token) may be called:
    → Closes all WS connections for that token with code 4002

Client (two possible paths):

  Path A — WebSocket message received first:
    connectionStore's wsService.on('session:expired') handler
      → handleSessionExpired()
        → wsService.disconnect()
        → clearSessionToken()
        → Reset ALL connection state

  Path B — WebSocket close code 4002 received:
    wsService.onclose handler
      → Detects code 4002
      → Dispatches { type: 'session:expired', payload: {} } locally
      → connectionStore's handler fires (same as Path A)

  Path C — Polling detects invalid session:
    checkSessionStatus() returns { valid: false }
      → handleSessionExpired() (same cleanup as above)
```
