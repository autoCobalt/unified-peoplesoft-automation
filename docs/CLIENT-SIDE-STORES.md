# Client-Side Zustand Stores — Comprehensive Architecture Reference

> **Purpose:** Complete reference of every client-side Zustand store, every field, every action, every subscription, and every module-level side effect. Intended for debugging state synchronization issues between client and server.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [connectionStore](#connectionstore)
3. [smartFormStore](#smartformstore)
4. [ciLabelsStore](#cilabelsstore)
5. [Supporting Services](#supporting-services)
6. [Cross-Store Interactions](#cross-store-interactions)
7. [Module-Level Side Effects Summary](#module-level-side-effects-summary)

---

## Architecture Overview

All three stores are **module-level singletons** created via `create<State>()()`. They require no React providers and persist for the lifetime of the browser tab. Components subscribe selectively using `useShallow` from `zustand/react/shallow` to prevent unnecessary re-renders.

```
Browser Tab
├── sessionStorage ← session token (cleared on tab close)
├── wsService (singleton) ← WebSocket connection to Fastify
│
├── useConnectionStore ← Oracle + SOAP connection state
│   ├── module-level: session polling (setInterval)
│   ├── module-level: visibility handler (document.visibilitychange)
│   ├── module-level: wsService event subscriptions (auth:*, session:expired)
│   └── module-level: window.devSimulate helpers (dev only)
│
├── useSmartFormStore ← Query results, workflows, CI submissions
│   └── instance-level: wsService subscriptions (created/destroyed per workflow run)
│
└── useCILabelsStore ← CI field label cache
    └── module-level: inFlight Set (dedup guard)
```

---

## connectionStore

**File:** `src/stores/connectionStore.ts`
**Export:** `useConnectionStore`
**Purpose:** Manages Oracle and SOAP connection lifecycle, session tokens, WebSocket connections, and session expiration monitoring.

### State Interface (`ConnectionState`)

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `oracleState` | `OracleConnectionState` | `{ isConnected: false, isConnecting: false, error: null }` | Oracle DB connection status |
| `oracleCredentials` | `OracleCredentials \| null` | `null` | `{ username, password }` — stored after successful connect |
| `soapState` | `SoapConnectionState` | `{ isConnected: false, isConnecting: false, error: null }` | PeopleSoft SOAP connection status |
| `soapCredentials` | `SoapCredentials \| null` | `null` | `{ username, password }` — stored after successful connect |
| `isFullyConnected` | `boolean` | `false` | **Derived:** `oracle.isConnected && soap.isConnected` |
| `hasActiveConnection` | `boolean` | `false` | **Derived:** `oracle.isConnected \|\| soap.isConnected` |
| `oracleHintActive` | `boolean` | `false` | UI hint: visual feedback when hovering disabled Oracle-dependent elements |
| `soapHintActive` | `boolean` | `false` | UI hint: visual feedback when hovering disabled SOAP-dependent elements |

### Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `setOracleCredentials` | `(creds: OracleCredentials) => void` | Stores credentials, clears oracle error |
| `connectOracle` | `(creds?: OracleCredentials) => Promise<boolean>` | **Guarded:** Returns `false` if `isConnecting`. Clears stale session token. Dev: `POST /api/dev/create-session`. Prod: `oracleApi.connection.connect()`. On success: sets oracle state, stores creds, updates derived flags, calls `wsService.connect(token)`. Returns `true`/`false`. |
| `disconnectOracle` | `() => Promise<void>` | Prod: calls `oracleApi.connection.disconnect()`. Resets oracle state + credentials to initial. |
| `setSoapCredentials` | `(creds: SoapCredentials) => void` | Stores credentials, clears soap error |
| `connectSoap` | `(creds?: SoapCredentials) => Promise<boolean>` | Same pattern as `connectOracle` but for SOAP. Uses `soapApi.connection.connect()` in prod. |
| `disconnectSoap` | `() => Promise<void>` | Same pattern as `disconnectOracle` but for SOAP. |
| `disconnectAll` | `() => Promise<void>` | Calls both `disconnectOracle()` and `disconnectSoap()` in parallel. |
| `setOracleHintActive` | `(active: boolean) => void` | Sets `oracleHintActive` |
| `setSoapHintActive` | `(active: boolean) => void` | Sets `soapHintActive` |
| `handleSessionExpired` | `() => void` | **Internal.** If any connection is active: disconnects WS, clears session token, resets ALL state (both oracle + soap + credentials + derived flags) to initial. |

### Derived State Helper

```typescript
function derivedFlags(oracle: OracleConnectionState, soap: SoapConnectionState) {
  return {
    isFullyConnected: oracle.isConnected && soap.isConnected,
    hasActiveConnection: oracle.isConnected || soap.isConnected,
  };
}
```

**Critical pattern:** Every `set()` call that changes `oracleState` or `soapState` MUST spread `...derivedFlags(newOracle, currentSoap)` to keep derived state in sync. If one side changes, the other side's current value must be passed.

### Module-Level Side Effects

#### 1. Session Expiration Polling

**Variables:**
- `pollInterval: ReturnType<typeof setInterval> | null` — 2-min polling loop
- `initialCheckTimeout: ReturnType<typeof setTimeout> | null` — 1-sec delayed initial check
- `visibilityHandler: (() => void) | null` — tab visibility listener

**Lifecycle:**
```
Store subscription fires on state change →
  If transitioning TO connected (from not connected) AND hasSessionToken():
    startSessionPolling():
      1. setTimeout(1000) → checkSession() [initial, delayed to avoid connect race]
      2. setInterval(2 min) → checkSession()
      3. document.visibilitychange → checkSession() when tab becomes visible
  If transitioning FROM connected (to not connected):
    stopSessionPolling():
      Clear all timers, remove visibility handler
```

**`checkSession()` logic:**
1. Calls `checkSessionStatus()` → `GET /api/session/status`
2. If response is `null` (network error): does nothing (tolerates temporary failures)
3. If `status.valid === false`: calls `useConnectionStore.getState().handleSessionExpired()`

#### 2. WebSocket Event Subscriptions (registered at module load)

```typescript
// Oracle auth revoked by server
wsService.on<AuthChangedPayload>('auth:oracle-changed', (payload) => {
  if (!payload.verified && state.oracleState.isConnected) {
    // Reset oracle state + credentials, update derived flags
  }
});

// SOAP auth revoked by server
wsService.on<AuthChangedPayload>('auth:soap-changed', (payload) => {
  if (!payload.verified && state.soapState.isConnected) {
    // Reset soap state + credentials, update derived flags
  }
});

// Session expired notification
wsService.on('session:expired', () => {
  handleSessionExpired();
});
```

#### 3. Dev Simulation Helpers (dev mode only)

On module load in development, sets `window.devSimulate`:
- `oracleConnect(username)` — Creates dev session, sets state as connected
- `soapConnect(username)` — Same for SOAP
- `disconnectAll()` — Calls store's `disconnectAll()`

### Connection Flow Sequence

```
User clicks "Connect Oracle" →
  connectionStore.connectOracle(creds) →
    Guard: if isConnecting, return false
    set(isConnecting: true)
    clearSessionToken()

    [Dev mode]:
      POST /api/dev/create-session → sessionToken
      setSessionToken(token)                         ← sessionStorage
      set(isConnected: true, creds, derivedFlags)
      wsService.connect(token)                       ← opens WebSocket

    [Prod mode]:
      oracleApi.connection.connect() →
        POST /api/oracle/connect →
          Server: creates Oracle connection, calls sessionService.upgradeAuth('oracle')
          Server: returns { success: true, data: { sessionToken } }
        Client: setSessionToken(response.data.sessionToken)
      set(isConnected: true, creds, derivedFlags)
      wsService.connect(token)

    Session polling starts (2-min interval)
```

---

## smartFormStore

**File:** `src/stores/smartFormStore.ts`
**Export:** `useSmartFormStore`
**Purpose:** Manages SmartForm query results, two independent workflow state machines (Manager and Other), CI data parsing, SOAP submissions (sequential + batch), per-transaction selection, and table UI preferences.

### State Interface (`SmartFormStoreState`)

#### Query State

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `hasQueried` | `boolean` | `false` | Whether any query has been executed this session |
| `isLoading` | `boolean` | `false` | Query in progress |
| `queryResults` | `SmartFormQueryResult \| null` | `null` | Full query results including all transactions |
| `parsedCIData` | `ParsedCIData` | `{ positionCreate: [], positionUpdate: [], jobUpdate: [], deptCoUpdate: [] }` | Parsed CI records from pipe-delimited CI columns |

**`SmartFormQueryResult` shape:**
```typescript
{
  totalCount: number;          // Total transactions
  managerCount: number;        // MGR_CUR === 1
  otherCount: number;          // MGR_CUR === 0
  transactions: SmartFormRecord[];  // All records (both queues)
  queriedAt: Date;
}
```

**`SmartFormRecord` shape:**
```typescript
{
  MGR_CUR: 0 | 1;             // Queue flag
  WEB_LINK: string;           // Transaction URL (hidden from display)
  TRANSACTION_NBR: string;    // Unique ID, displayed as hyperlink
  EMPLID: string;
  EMPLOYEE_NAME: string;
  status: SmartFormRecordStatus;    // 'pending' | 'processing' | 'success' | 'error'
  errorMessage?: string;
  [key: string]: unknown;          // Dynamic Oracle columns
}
```

**`ParsedCIData` shape:**
```typescript
{
  positionCreate: PositionCreateRecord[];   // From POSITION_CREATE_CI column
  positionUpdate: PositionUpdateRecord[];   // From POSITION_UPDATE_CI column
  jobUpdate: JobUpdateRecord[];             // From JOB_UPDATE_CI column
  deptCoUpdate: DeptCoUpdateRecord[];       // From DEPT_CO_UPDATE_CI column
}
```

Each parsed CI record has a `transactionNbr` field linking back to the parent `SmartFormRecord`.

#### Sub-Tab Navigation

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `activeSubTab` | `SmartFormSubTab` | `'manager'` | `'manager'` or `'other'` — which sub-tab is active |

#### Selection State

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `selectedByTab` | `Record<SmartFormSubTab, Set<string>>` | `{ manager: new Set(), other: new Set() }` | Transaction numbers selected per sub-tab |

Selections are initialized to "all selected" on query. Checkboxes are disabled when workflow leaves `idle`.

#### Manager Workflow State

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `managerWorkflow` | `ManagerWorkflowStep` | `{ step: 'idle' }` | Discriminated union — see below |
| `isWorkflowPaused` | `boolean` | `false` | Whether manager workflow is paused |
| `managerPauseReason` | `string \| undefined` | `undefined` | Why paused: `'tab-switch'`, `'browser-closed'`, or `undefined` (manual) |

**Manager Workflow State Machine:**
```
idle → approving { current, total, currentItem? }
     → approved
     → submitting-dept-co { current, total }
     → submitting-position { current, total }
     → submitting-job { current, total }
     → complete
     → error { message }   (reachable from any step)
```

#### Manager Submission Data

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `preparedDeptCoData` | `PreparedSubmission[]` | `[]` | DEPARTMENT_TBL submissions for manager records |
| `preparedPositionData` | `PreparedSubmission[]` | `[]` | CI_POSITION_DATA (update) submissions |
| `preparedJobData` | `PreparedSubmission[]` | `[]` | CI_JOB_DATA submissions |

**`PreparedSubmission` shape:**
```typescript
{
  id: string;           // e.g., 'deptco-123456', 'pos-123456', 'job-123456'
  emplid: string;
  employeeName: string;
  ciType: 'CI_POSITION_DATA' | 'CI_JOB_DATA' | 'DEPARTMENT_TBL';
  status: 'pending' | 'submitting' | 'success' | 'error';
  errorMessage?: string;
  payload?: string;     // JSON string
}
```

#### Other Workflow State

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `otherWorkflow` | `OtherWorkflowStep` | `{ step: 'idle' }` | Discriminated union — see below |
| `isOtherWorkflowPaused` | `boolean` | `false` | Whether other workflow is paused |
| `otherPauseReason` | `string \| undefined` | `undefined` | Why paused |

**Other Workflow State Machine:**
```
idle → submitting-dept-co { current, total }
     → submitting-position-create { current, total }
     → submissions-complete
     → approving { current, total, currentItem? }
     → approved
     → complete
     → error { message }   (reachable from any step)
```

#### Other Submission Data

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `preparedOtherDeptCoData` | `PreparedSubmission[]` | `[]` | DEPARTMENT_TBL submissions for Other records |
| `preparedPositionCreateData` | `PreparedSubmission[]` | `[]` | CI_POSITION_DATA (create) submissions |

#### Table UI Preferences

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `tableCollapseOverrides` | `Map<string, boolean>` | `new Map()` | Manual collapse/expand overrides for CI preview table sections |
| `txnExcludedTables` | `Set<string>` | `new Set()` | CI preview tables where TRANSACTION_NBR is excluded from Excel export |

These are in the store (not local state) because `DataTableSection` remounts when switching main nav tabs.

#### Internal State

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `_isPauseInFlight` | `boolean` | `false` | Guards against rapid-fire pause/resume calls for Manager |
| `_isOtherPauseInFlight` | `boolean` | `false` | Guards against rapid-fire pause/resume calls for Other |
| `_stopPolling` | `(() => void) \| null` | `null` | Cleanup function for Manager workflow status subscription |
| `_stopOtherPolling` | `(() => void) \| null` | `null` | Cleanup function for Other workflow status subscription |
| `_otherCompleteTimeout` | `ReturnType<typeof setTimeout> \| null` | `null` | 300ms timeout for Other approved→complete transition |

### Actions

#### Query Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `runQuery` | `() => Promise<void>` | Guarded: no-op if `isLoading`. Dev: 800ms delay + mock data. Prod: `oracleApi.query.smartFormTransactions()`. On success: transforms rows → SmartFormRecord, parses CI data, builds PreparedSubmissions, **resets both workflows**, initializes all selections to "all selected". |
| `refreshQuery` | `() => Promise<void>` | Same as `runQuery` but **does NOT reset workflows** (preserves workflow state). Re-initializes selections. |
| `setActiveSubTab` | `(tab: SmartFormSubTab) => void` | Sets `activeSubTab` to `'manager'` or `'other'` |
| `setTransactionSelected` | `(txnNbr: string, selected: boolean) => void` | Add/remove a transaction from the active sub-tab's selection set |
| `setAllTransactionsSelected` | `(selected: boolean) => void` | Select/deselect all transactions for the active sub-tab |

#### Manager Workflow Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `openBrowser` | `() => Promise<void>` | Starts Manager approval workflow. Filters records by `MGR_CUR=1` AND selected. Sends to `workflowApi.manager.startApprovals()`. Sets up WebSocket subscription (with polling fallback) for status updates. See detailed flow below. |
| `processApprovals` | `() => Promise<void>` | **No-op.** Kept for backward compatibility. Approvals run as part of `openBrowser`. |
| `pauseApprovals` | `(reason?: string) => Promise<void>` | Guarded by `_isPauseInFlight`. Calls `workflowApi.manager.pause(reason)`. |
| `resumeApprovals` | `() => Promise<void>` | Guarded by `_isPauseInFlight`. Calls `workflowApi.manager.resume()`. |
| `resetManagerWorkflow` | `() => void` | Stops polling, calls `workflowApi.manager.stop()`, resets workflow + prepared data + pause state, resets all Manager record statuses to `'pending'`. |

#### Manager Submission Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `submitDeptCoData` | `() => Promise<void>` | Submits DEPARTMENT_TBL CI records. Filters by selected AND non-duplicate. Supports batch (grouped by action, chunked by `soapBatchSize`) and sequential paths. Transitions to `submitting-position` when done. Auto-skips if zero records. |
| `submitPositionData` | `() => Promise<void>` | Same pattern for POSITION_UPDATE_CI. Additionally filters by records that actually have CI data (not all Manager records have position updates). Transitions to `submitting-job`. |
| `submitJobData` | `() => Promise<void>` | Same pattern for JOB_UPDATE_CI. Transitions to `complete` when done. |

#### Other Workflow Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `openOtherBrowser` | `() => Promise<void>` | Same pattern as `openBrowser` but for Other queue (MGR_CUR=0). Uses `workflowApi.other.startApprovals()`. On completion, auto-transitions `approved` → `complete` after 300ms timeout. |
| `pauseOtherApprovals` | `(reason?: string) => Promise<void>` | Same as `pauseApprovals` for Other. |
| `resumeOtherApprovals` | `() => Promise<void>` | Same as `resumeApprovals` for Other. |
| `resetOtherWorkflow` | `() => void` | Same as `resetManagerWorkflow` for Other. Also clears `_otherCompleteTimeout`. |

#### Other Submission Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `submitOtherDeptCoData` | `() => Promise<void>` | Same pattern as `submitDeptCoData` for Other queue. Transitions to `submitting-position-create`. |
| `submitPositionCreateData` | `() => Promise<void>` | Same pattern for POSITION_CREATE_CI. Transitions to `submissions-complete` when done. |

#### Tab Switch Handler

| Action | Signature | Behavior |
|--------|-----------|----------|
| `onTabSwitch` | `(newTabId: TabId) => void` | Called when switching AWAY from SmartForm tab. Auto-pauses Manager workflow if `step === 'approving'` and not already paused. Auto-pauses Other workflow same way. |

### Exported Selector Functions

| Selector | Input → Output | Description |
|----------|---------------|-------------|
| `selectFilteredRecords` | `state → SmartFormRecord[]` | Filters `queryResults.transactions` by active sub-tab's `MGR_CUR` flag, sorted by `TRANSACTION_NBR` ascending. |
| `selectEffectiveRecordCounts` | `state → EffectiveRecordCounts` | Computes per-CI-type counts of records that are both selected AND non-duplicate. Used for workflow progress totals and task checklist. |

**`EffectiveRecordCounts` shape:**
```typescript
{
  deptCo: number;          // Manager DEPT_CO_UPDATE_CI
  positionUpdate: number;  // Manager POSITION_UPDATE_CI
  jobUpdate: number;       // Manager JOB_UPDATE_CI
  otherDeptCo: number;     // Other DEPT_CO_UPDATE_CI
  positionCreate: number;  // Other POSITION_CREATE_CI
}
```

### Workflow Status Update Flow (Manager — Other is identical pattern)

```
openBrowser() called →
  1. Filter selected Manager records
  2. Set workflow to { step: 'approving', current: 1, total: N, currentItem: firstTxnId }
  3. POST /api/workflows/manager/start-approvals via workflowApi
  4. If error → set { step: 'error', message }
  5. If success → subscribe to status updates:

     [WebSocket path (preferred)]:
       wsService.on('workflow:progress', handler)
       Also subscribe to 'fallback' — if WS dies mid-workflow, switch to polling

     [Polling fallback path]:
       workflowApi.manager.pollStatus(callback) → setInterval polling

  6. handleManagerStatus(status) called for each update:
     status.status === 'running'    → update approving step + record statuses
     status.status === 'paused'     → keep approving step, set isWorkflowPaused
     status.status === 'completed'  → set { step: 'approved' }, stop polling
     status.status === 'error'      → set { step: 'error' }, stop polling
     status.status === 'cancelled'  → set { step: 'idle' }, stop polling
```

### Record Status Mapping (`updateRecordStatuses`)

Maps server-reported `transactionResults` to client `SmartFormRecord.status`:

| Server value | Client status |
|-------------|--------------|
| `transactionResults[txnNbr] === 'approved'` | `'success'` |
| `transactionResults[txnNbr] === 'error'` | `'error'` |
| `txnNbr === currentItem` (being processed) | `'processing'` |
| Not in results and not current | unchanged |

This function uses **reference equality optimization**: if no records actually changed, it bails out without calling `set()`.

### SOAP Submission Paths

Each `submit*` action supports two modes:

**Sequential (dev mode OR batch mode disabled):**
```
for each selected non-duplicate record:
  1. set workflow step current = s + 1
  2. set PreparedSubmission status = 'submitting'
  3. [dev] await 400ms delay
  3. [prod] soapApi.ci.submit(ciName, action, payload)
  4. set PreparedSubmission status = 'success' | 'error'
  5. On last item: transition to next workflow step
```

**Batch (prod mode + batch enabled):**
```
Group records by action type →
  For each action group:
    Chunk into arrays of soapBatchSize →
      For each chunk:
        1. set workflow step current = processed + chunk.length
        2. set chunk PreparedSubmissions status = 'submitting'
        3. soapApi.ci.submit(ciName, action, payloads[])
        4. set chunk PreparedSubmissions status = 'success' | 'error'
```

### Config Dependencies

| Config value | Source | Used for |
|-------------|--------|---------|
| `isDevelopment` | `import.meta.env.VITE_APP_MODE === 'development'` | Mock data vs real API, simulated delays |
| `isSoapBatchMode` | `import.meta.env.VITE_SOAP_BATCH_MODE === 'true'` | Sequential vs batch submission |
| `soapBatchSize` | `Number(import.meta.env.VITE_SOAP_BATCH_SIZE) \|\| 5` | Records per batch HTTP request |

---

## ciLabelsStore

**File:** `src/stores/ciLabelsStore.ts`
**Export:** `useCILabelsStore`
**Purpose:** On-demand cache for CI field labels (maps field names like `POSITION_NBR` to human-readable labels like `Position Number`).

### State Interface (`CILabelsState`)

| Field | Type | Initial | Description |
|-------|------|---------|-------------|
| `labels` | `Partial<Record<string, Record<string, string>>>` | `{}` | Cached labels by CI name. Key: CI name (e.g., `'CI_POSITION_DATA'`), Value: `{ FIELD_NAME: 'Label' }` |
| `isLoading` | `boolean` | `false` | Whether any label fetch is in progress |

### Actions

| Action | Signature | Behavior |
|--------|-----------|----------|
| `ensureLabels` | `(ciName: string) => Promise<void>` | Fetch and cache labels for a CI. **Triple guard:** (1) already in cache → skip, (2) already in-flight → skip, (3) fetch from `GET /api/ci-shapes/labels?name=X`. On success: merge into labels. On failure: silent (fallback behavior). |
| `getLabel` | `(ciName: string, fieldName: string) => string` | Synchronous lookup. Returns cached label or `fieldName` as fallback. |

### Module-Level State

```typescript
const inFlight = new Set<string>();
```

**Not in the store** — intentionally module-level to avoid re-renders when tracking in-flight requests. Prevents duplicate concurrent fetches for the same CI name.

### API Call

```
GET /api/ci-shapes/labels?name={ciName}
Headers: { X-Session-Token: <token> }
Response: { success: true, data: { FIELD_NAME: "Label", ... } }
```

---

## Supporting Services

### Session Store (`src/services/session/sessionStore.ts`)

**Not a Zustand store** — plain functions using `sessionStorage`.

| Function | Behavior |
|----------|----------|
| `setSessionToken(token)` | Stores in `sessionStorage` under key `'unified-peoplesoft-session-token'` |
| `getSessionToken()` | Retrieves from `sessionStorage` |
| `clearSessionToken()` | Removes from `sessionStorage` |
| `hasSessionToken()` | Returns `boolean` |
| `getSessionHeaders()` | Returns `{ 'X-Session-Token': token }` or `{}` |
| `checkSessionStatus()` | `GET /api/session/status` → `{ valid, expiresInMs, reason? }` or `null` on error. **Passive check — does NOT extend session.** |

### WebSocket Service (`src/services/websocket/wsService.ts`)

**Singleton class** — `wsService`.

| Property/Method | Description |
|----------------|-------------|
| `connectionState` | `'disconnected' \| 'connecting' \| 'connected' \| 'reconnecting'` |
| `isFallback` | `boolean` — true after max reconnect attempts |
| `connect(token)` | Opens WebSocket to `ws://host/ws?token=X`. No-ops if already connected with same token. Sets up visibility handler. |
| `disconnect()` | Intentional close. No reconnection. Clears token. |
| `on<T>(type, handler)` | Subscribe to message type. Returns unsubscribe function. Special types: `'state-change'`, `'fallback'`. |

**Reconnection behavior:**
- Max 3 attempts with exponential backoff: 1s → 2s → 4s (+ 30% jitter), cap 60s
- On tab becoming visible: resets attempts and reconnects immediately
- After max attempts: sets `isFallback = true`, dispatches `'fallback'` event to all handlers
- Close codes 4001 (invalid token) and 4002 (session expired): no reconnection

**Message types received from server:**
| Type | Payload | Consumed by |
|------|---------|-------------|
| `workflow:progress` | `WorkflowProgressPayload` | smartFormStore (per-workflow-run subscription) |
| `auth:oracle-changed` | `AuthChangedPayload` | connectionStore (module-level subscription) |
| `auth:soap-changed` | `AuthChangedPayload` | connectionStore (module-level subscription) |
| `session:expired` | `{}` | connectionStore (module-level subscription) |

---

## Cross-Store Interactions

### connectionStore → smartFormStore

**No direct reference.** Connection state changes don't directly trigger smartFormStore updates. Instead:

1. **Session expiration** → `connectionStore.handleSessionExpired()` resets connection state → the UI re-renders showing the disconnected state → smartFormStore's data remains in memory but actions will fail with 401.

2. **Auth revocation via WebSocket** → connectionStore resets Oracle/SOAP state → UI disables workflow buttons.

### smartFormStore → connectionStore

**No direct reference.** smartFormStore reads connection status indirectly through:
- `isDevelopment` config flag (determines dev vs prod paths)
- `getSessionHeaders()` from session store (implicit via `oracleApi`/`soapApi`/`workflowApi`)

### smartFormStore → ciLabelsStore

**No direct reference.** Both are consumed independently by `DataTableSection` which calls `ensureLabels()` and `getLabel()` for CI preview table headers.

### All Stores → wsService

wsService is the shared real-time bridge:
- connectionStore subscribes at module level (permanent)
- smartFormStore subscribes per workflow run (temporary, with cleanup)
- ciLabelsStore has no WebSocket interaction

---

## Module-Level Side Effects Summary

**Things that run automatically when the store module is imported:**

| Store | Effect | Trigger | Cleanup |
|-------|--------|---------|---------|
| connectionStore | `useConnectionStore.subscribe()` — starts/stops session polling | State change: connected ↔ disconnected | `stopSessionPolling()` |
| connectionStore | `wsService.on('auth:oracle-changed')` | Module import | Never (permanent) |
| connectionStore | `wsService.on('auth:soap-changed')` | Module import | Never (permanent) |
| connectionStore | `wsService.on('session:expired')` | Module import | Never (permanent) |
| connectionStore | `window.devSimulate = { ... }` (dev only) | Module import | Never |
| ciLabelsStore | `const inFlight = new Set()` | Module import | Never |
| smartFormStore | None at module level | N/A | N/A |

**Things that run dynamically:**

| Store | Effect | Trigger | Cleanup |
|-------|--------|---------|---------|
| smartFormStore | `wsService.on('workflow:progress')` | `openBrowser()` or `openOtherBrowser()` | Stored in `_stopPolling` / `_stopOtherPolling`, called on reset/completion |
| smartFormStore | `workflowApi.*.pollStatus()` (setInterval) | WS fallback during workflow | Same cleanup functions |
| smartFormStore | `setTimeout(300ms)` for Other approved→complete | Other workflow completes | `_otherCompleteTimeout`, cleared on reset |
