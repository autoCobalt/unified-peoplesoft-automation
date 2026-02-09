/**
 * SmartForm Store (Zustand)
 *
 * Manages all SmartForm state including:
 * - Query execution and results
 * - Sub-tab navigation
 * - Manager workflow state machine
 * - Other workflow state machine (3-step: dept-co -> position-create -> approvals)
 * - CI submission preparation and tracking
 * - Per-transaction approval status updates (via server polling -> record status mapping)
 * - Table UI preferences (collapse overrides, transaction column exclusions)
 *
 * Replaces SmartFormContext.tsx + smartFormContextDef.ts + useSmartForm.ts.
 *
 * Production SOAP submissions support two modes controlled by `isSoapBatchMode`:
 * - Sequential (default when batch mode disabled): one record per HTTP request
 * - Batch (default when batch mode enabled): records grouped by action, then
 *   chunked into arrays of `soapBatchSize` per HTTP request
 * Development mode always uses sequential submission with simulated delays.
 */

import { create } from 'zustand';
import { isDevelopment, isSoapBatchMode, soapBatchSize } from '../config';
import { workflowApi, oracleApi, soapApi } from '../services';
import { wsService } from '../services/websocket';
import type { WorkflowProgressPayload } from '../services/websocket';
import type {
  SmartFormQueryResult,
  SmartFormRecord,
  SmartFormRecordStatus,
  SmartFormSubTab,
  ManagerWorkflowStep,
  OtherWorkflowStep,
  PreparedSubmission,
  TabId,
} from '../types';
import type { QueryResultRow } from '../types/oracle';
import {
  INITIAL_MANAGER_WORKFLOW,
  INITIAL_OTHER_WORKFLOW,
  INITIAL_PARSED_CI_DATA,
} from '../types';
import { generateMockRecords } from '../dev-data';
import { parseCIDataFromRecords, buildSOAPPayload } from '../server/ci-definitions/parser';
import { findCIDuplicates } from '../utils';
import {
  POSITION_UPDATE_CI_TEMPLATE,
  POSITION_CREATE_CI_TEMPLATE,
  JOB_UPDATE_CI_TEMPLATE,
  DEPT_CO_UPDATE_CI_TEMPLATE,
} from '../server/ci-definitions/templates/smartform';
import type { ParsedCIData } from '../server/ci-definitions/types';

/* ==============================================
   Helper Functions
   ============================================== */

/**
 * Transform Oracle query rows to SmartFormRecord array.
 * Adds the client-side 'status' field that Oracle doesn't provide.
 *
 * Type assertion is intentional: Oracle returns dynamic rows matching
 * the SQL schema defined in smartform-pending-transactions.sql
 */
function transformOracleRows(rows: QueryResultRow[]): SmartFormRecord[] {
  return rows.map(row => ({
    ...(row as Record<string, unknown>),
    status: 'pending' as const,
  })) as SmartFormRecord[];
}

/** Split an array into chunks of at most `size` elements. */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generate mock query results.
 * Used in development mode when VITE_APP_MODE !== 'production'.
 */
function generateMockQueryResults(): { results: SmartFormQueryResult; parsedCIData: ReturnType<typeof parseCIDataFromRecords> } {
  const records = generateMockRecords();
  // Filter by MGR_CUR: 1 = Manager, 0 = Other
  const managerCount = records.filter(r => r.MGR_CUR === 1).length;
  const otherCount = records.filter(r => r.MGR_CUR === 0).length;

  const results: SmartFormQueryResult = {
    totalCount: records.length,
    managerCount,
    otherCount,
    transactions: records,
    queriedAt: new Date(),
  };

  // Parse CI data from mock records (same as production path)
  const parsedCIData = parseCIDataFromRecords(records);

  return { results, parsedCIData };
}

/**
 * Auto-build PreparedSubmission arrays from query records.
 * Called after query execution to pre-populate submission tracking data.
 *
 * Manager records (MGR_CUR=1): position update, job update, dept co update
 * Other records (MGR_CUR=0): position create, dept co update
 */
function buildPreparedSubmissions(
  transactions: SmartFormRecord[]
): {
  position: PreparedSubmission[];
  job: PreparedSubmission[];
  deptCo: PreparedSubmission[];
  otherDeptCo: PreparedSubmission[];
  positionCreate: PreparedSubmission[];
} {
  const managerRecords = transactions.filter(r => r.MGR_CUR === 1);
  const otherRecords = transactions.filter(r => r.MGR_CUR === 0);

  const position: PreparedSubmission[] = managerRecords.map(record => ({
    id: `pos-${record.TRANSACTION_NBR}`,
    emplid: record.EMPLID,
    employeeName: record.EMPLOYEE_NAME,
    ciType: 'CI_POSITION_DATA',
    status: 'pending',
    payload: JSON.stringify({ emplid: record.EMPLID, effdt: record.CUR_EFFDT }),
  }));

  const job: PreparedSubmission[] = managerRecords.map(record => ({
    id: `job-${record.TRANSACTION_NBR}`,
    emplid: record.EMPLID,
    employeeName: record.EMPLOYEE_NAME,
    ciType: 'CI_JOB_DATA',
    status: 'pending',
    payload: JSON.stringify({ emplid: record.EMPLID, effdt: record.CUR_EFFDT }),
  }));

  const deptCo: PreparedSubmission[] = managerRecords
    .filter(record => record.DEPT_CO_UPDATE_CI != null)
    .map(record => ({
      id: `deptco-${record.TRANSACTION_NBR}`,
      emplid: record.EMPLID,
      employeeName: record.EMPLOYEE_NAME,
      ciType: 'DEPARTMENT_TBL' as const,
      status: 'pending' as const,
      payload: JSON.stringify({ deptid: record.DEPTID }),
    }));

  const otherDeptCo: PreparedSubmission[] = otherRecords
    .filter(record => record.DEPT_CO_UPDATE_CI != null)
    .map(record => ({
      id: `other-deptco-${record.TRANSACTION_NBR}`,
      emplid: record.EMPLID,
      employeeName: record.EMPLOYEE_NAME,
      ciType: 'DEPARTMENT_TBL' as const,
      status: 'pending' as const,
      payload: JSON.stringify({ deptid: record.DEPTID }),
    }));

  const positionCreate: PreparedSubmission[] = otherRecords
    .filter(record => record.POSITION_CREATE_CI != null)
    .map(record => ({
      id: `poscreate-${record.TRANSACTION_NBR}`,
      emplid: record.EMPLID,
      employeeName: record.EMPLOYEE_NAME,
      ciType: 'CI_POSITION_DATA' as const,
      status: 'pending' as const,
      payload: JSON.stringify({ emplid: record.EMPLID }),
    }));

  return { position, job, deptCo, otherDeptCo, positionCreate };
}

/**
 * Update SmartFormRecord statuses from server-reported transaction results.
 * Called from polling callbacks during approval workflows.
 */
function updateRecordStatuses(
  set: SetState,
  get: GetState,
  transactionResults: Record<string, 'approved' | 'error'> | undefined,
  currentItem: string | undefined,
): void {
  if (!transactionResults && !currentItem) return;

  const queryResults = get().queryResults;
  if (!queryResults) return;

  const prevTransactions = queryResults.transactions;
  const transactions = prevTransactions.map(txn => {
    const result = transactionResults?.[txn.TRANSACTION_NBR];
    let newStatus: SmartFormRecordStatus;

    if (result === 'approved') {
      newStatus = 'success';
    } else if (result === 'error') {
      newStatus = 'error';
    } else if (txn.TRANSACTION_NBR === currentItem) {
      newStatus = 'processing';
    } else {
      return txn;
    }

    if (txn.status !== newStatus) {
      return { ...txn, status: newStatus };
    }
    return txn;
  });

  // Bail out if no records actually changed (reference equality check)
  if (transactions.every((txn, i) => txn === prevTransactions[i])) return;

  set({ queryResults: { ...queryResults, transactions } });
}

/* ==============================================
   Effective Record Counts
   ============================================== */

/**
 * Pre-computed counts of records that will actually be submitted:
 * selected AND non-duplicate. Used by task completion overrides
 * and submit function look-ahead totals.
 */
export interface EffectiveRecordCounts {
  /** Manager: DEPT_CO_UPDATE_CI records */
  deptCo: number;
  /** Manager: POSITION_UPDATE_CI records */
  positionUpdate: number;
  /** Manager: JOB_UPDATE_CI records */
  jobUpdate: number;
  /** Other: DEPT_CO_UPDATE_CI records */
  otherDeptCo: number;
  /** Other: POSITION_CREATE_CI records */
  positionCreate: number;
}

/* ==============================================
   Store State Interface
   ============================================== */

interface SmartFormStoreState {
  // === Query State ===
  hasQueried: boolean;
  isLoading: boolean;
  queryResults: SmartFormQueryResult | null;
  parsedCIData: ParsedCIData;

  // === Sub-tab Navigation ===
  activeSubTab: SmartFormSubTab;
  setActiveSubTab: (tab: SmartFormSubTab) => void;

  // === Query Actions ===
  runQuery: () => Promise<void>;
  refreshQuery: () => Promise<void>;

  // === Selection State ===
  selectedByTab: Record<SmartFormSubTab, Set<string>>;
  setTransactionSelected: (txnNbr: string, selected: boolean) => void;
  setAllTransactionsSelected: (selected: boolean) => void;

  // === Manager Workflow ===
  managerWorkflow: ManagerWorkflowStep;
  isWorkflowPaused: boolean;
  managerPauseReason: string | undefined;
  openBrowser: () => Promise<void>;
  processApprovals: () => Promise<void>;
  pauseApprovals: (reason?: string) => Promise<void>;
  resumeApprovals: () => Promise<void>;
  resetManagerWorkflow: () => void;

  // === Manager Submission ===
  preparedDeptCoData: PreparedSubmission[];
  preparedPositionData: PreparedSubmission[];
  preparedJobData: PreparedSubmission[];
  submitDeptCoData: () => Promise<void>;
  submitPositionData: () => Promise<void>;
  submitJobData: () => Promise<void>;

  // === Other Workflow ===
  otherWorkflow: OtherWorkflowStep;
  isOtherWorkflowPaused: boolean;
  otherPauseReason: string | undefined;
  openOtherBrowser: () => Promise<void>;
  pauseOtherApprovals: (reason?: string) => Promise<void>;
  resumeOtherApprovals: () => Promise<void>;
  resetOtherWorkflow: () => void;

  // === Other Submission ===
  preparedOtherDeptCoData: PreparedSubmission[];
  preparedPositionCreateData: PreparedSubmission[];
  submitOtherDeptCoData: () => Promise<void>;
  submitPositionCreateData: () => Promise<void>;

  // === Table UI Preferences ===
  tableCollapseOverrides: Map<string, boolean>;
  setTableCollapseOverrides: (updater: Map<string, boolean> | ((prev: Map<string, boolean>) => Map<string, boolean>)) => void;
  txnExcludedTables: Set<string>;
  setTxnExcludedTables: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;

  // === Tab Switch Handler ===
  onTabSwitch: (newTabId: TabId) => void;

  // === Internal (prefixed with _) ===
  _isPauseInFlight: boolean;
  _isOtherPauseInFlight: boolean;
  _stopPolling: (() => void) | null;
  _stopOtherPolling: (() => void) | null;
  _otherCompleteTimeout: ReturnType<typeof setTimeout> | null;
}

/* ==============================================
   Internal Type Aliases (for helper signatures)
   ============================================== */

type SetState = (partial: Partial<SmartFormStoreState> | ((state: SmartFormStoreState) => Partial<SmartFormStoreState>)) => void;
type GetState = () => SmartFormStoreState;

/* ==============================================
   Selector Functions (computed values)
   ============================================== */

/**
 * Derive filtered records for the active sub-tab.
 * Consumers use: `useSmartFormStore(selectFilteredRecords)`
 */
export function selectFilteredRecords(state: SmartFormStoreState): SmartFormRecord[] {
  if (!state.queryResults) return [];
  const isManager = state.activeSubTab === 'manager';
  return state.queryResults.transactions
    .filter(t => t.MGR_CUR === (isManager ? 1 : 0))
    .sort((a, b) => {
      // Sort by TRANSACTION_NBR numerically (ascending)
      const numA = Number(a.TRANSACTION_NBR) || 0;
      const numB = Number(b.TRANSACTION_NBR) || 0;
      return numA - numB;
    });
}

/**
 * Derive effective record counts (selected AND non-duplicate) for each CI type.
 * Consumers use: `useSmartFormStore(selectEffectiveRecordCounts)`
 */
export function selectEffectiveRecordCounts(state: SmartFormStoreState): EffectiveRecordCounts {
  const managerSel = state.selectedByTab.manager;
  const otherSel = state.selectedByTab.other;
  const parsed = state.parsedCIData;

  // Manager: dept co
  const selDeptCo = parsed.deptCoUpdate.filter(r => managerSel.has(r.transactionNbr));
  const deptCoDups = findCIDuplicates(selDeptCo, DEPT_CO_UPDATE_CI_TEMPLATE.fields);
  const deptCo = selDeptCo.filter(r => !deptCoDups.has(r.transactionNbr)).length;

  // Manager: position update
  const selPosUpdate = parsed.positionUpdate.filter(r => managerSel.has(r.transactionNbr));
  const posUpdateDups = findCIDuplicates(selPosUpdate, POSITION_UPDATE_CI_TEMPLATE.fields);
  const positionUpdate = selPosUpdate.filter(r => !posUpdateDups.has(r.transactionNbr)).length;

  // Manager: job update
  const selJobUpdate = parsed.jobUpdate.filter(r => managerSel.has(r.transactionNbr));
  const jobUpdateDups = findCIDuplicates(selJobUpdate, JOB_UPDATE_CI_TEMPLATE.fields);
  const jobUpdate = selJobUpdate.filter(r => !jobUpdateDups.has(r.transactionNbr)).length;

  // Other: dept co
  const selOtherDeptCo = parsed.deptCoUpdate.filter(r => otherSel.has(r.transactionNbr));
  const otherDeptCoDups = findCIDuplicates(selOtherDeptCo, DEPT_CO_UPDATE_CI_TEMPLATE.fields);
  const otherDeptCo = selOtherDeptCo.filter(r => !otherDeptCoDups.has(r.transactionNbr)).length;

  // Other: position create
  const selPosCreate = parsed.positionCreate.filter(r => otherSel.has(r.transactionNbr));
  const posCreateDups = findCIDuplicates(selPosCreate, POSITION_CREATE_CI_TEMPLATE.fields);
  const positionCreate = selPosCreate.filter(r => !posCreateDups.has(r.transactionNbr)).length;

  return { deptCo, positionUpdate, jobUpdate, otherDeptCo, positionCreate };
}

/* ==============================================
   Store Definition
   ============================================== */

export const useSmartFormStore = create<SmartFormStoreState>()((set, get) => ({
  // === Query State ===
  hasQueried: false,
  isLoading: false,
  queryResults: null,
  parsedCIData: INITIAL_PARSED_CI_DATA,

  // === Sub-tab Navigation ===
  activeSubTab: 'manager' as SmartFormSubTab,

  setActiveSubTab: (tab: SmartFormSubTab) => {
    set({ activeSubTab: tab });
  },

  // === Selection State ===
  selectedByTab: {
    manager: new Set<string>(),
    other: new Set<string>(),
  },

  setTransactionSelected: (txnNbr: string, selected: boolean) => {
    const tab = get().activeSubTab;
    const tabSet = get().selectedByTab[tab];
    const next = new Set(tabSet);
    if (selected) {
      next.add(txnNbr);
    } else {
      next.delete(txnNbr);
    }
    set({ selectedByTab: { ...get().selectedByTab, [tab]: next } });
  },

  setAllTransactionsSelected: (selected: boolean) => {
    const tab = get().activeSubTab;
    if (selected) {
      const filtered = selectFilteredRecords(get());
      set({
        selectedByTab: {
          ...get().selectedByTab,
          [tab]: new Set(filtered.map(r => r.TRANSACTION_NBR)),
        },
      });
    } else {
      set({
        selectedByTab: {
          ...get().selectedByTab,
          [tab]: new Set<string>(),
        },
      });
    }
  },

  // === Query Actions ===

  runQuery: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });

    let results: SmartFormQueryResult;
    let parsedCIData: ParsedCIData = INITIAL_PARSED_CI_DATA;

    if (isDevelopment) {
      // Development mode: use mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      const mock = generateMockQueryResults();
      results = mock.results;
      parsedCIData = mock.parsedCIData;
    } else {
      // Production mode: call Oracle API
      const response = await oracleApi.query.smartFormTransactions();

      if (!response.success) {
        // Handle error - keep previous state but stop loading
        console.error('SmartForm query failed:', response.error.message);
        set({ isLoading: false });
        return;
      }

      // Transform Oracle rows to SmartFormRecord (adds client-side status field)
      const transactions = transformOracleRows(response.data.rows);

      results = {
        totalCount: transactions.length,
        managerCount: transactions.filter(r => r.MGR_CUR === 1).length,
        otherCount: transactions.filter(r => r.MGR_CUR === 0).length,
        transactions,
        queriedAt: new Date(),
      };

      // Parse CI data from Oracle records
      parsedCIData = parseCIDataFromRecords(transactions);
    }

    // Auto-populate prepared submissions from all records
    const prepared = buildPreparedSubmissions(results.transactions);

    set({
      isLoading: false,
      hasQueried: true,
      queryResults: results,
      parsedCIData,
      // Reset workflows on fresh query
      managerWorkflow: INITIAL_MANAGER_WORKFLOW,
      otherWorkflow: INITIAL_OTHER_WORKFLOW,
      // Set prepared submissions
      preparedDeptCoData: prepared.deptCo,
      preparedPositionData: prepared.position,
      preparedJobData: prepared.job,
      preparedOtherDeptCoData: prepared.otherDeptCo,
      preparedPositionCreateData: prepared.positionCreate,
      // Initialize transaction selections (all selected for both tabs)
      selectedByTab: {
        manager: new Set(results.transactions.filter(r => r.MGR_CUR === 1).map(r => r.TRANSACTION_NBR)),
        other: new Set(results.transactions.filter(r => r.MGR_CUR === 0).map(r => r.TRANSACTION_NBR)),
      },
    });
  },

  refreshQuery: async () => {
    // Same as runQuery but preserves workflow state
    if (get().isLoading) return;
    set({ isLoading: true });

    let results: SmartFormQueryResult;
    let parsedCIData: ParsedCIData = INITIAL_PARSED_CI_DATA;

    if (isDevelopment) {
      // Development mode: use mock data
      await new Promise(resolve => setTimeout(resolve, 600));
      const mock = generateMockQueryResults();
      results = mock.results;
      parsedCIData = mock.parsedCIData;
    } else {
      // Production mode: call Oracle API
      const response = await oracleApi.query.smartFormTransactions();

      if (!response.success) {
        console.error('SmartForm refresh failed:', response.error.message);
        set({ isLoading: false });
        return;
      }

      // Transform Oracle rows to SmartFormRecord (adds client-side status field)
      const transactions = transformOracleRows(response.data.rows);

      results = {
        totalCount: transactions.length,
        managerCount: transactions.filter(r => r.MGR_CUR === 1).length,
        otherCount: transactions.filter(r => r.MGR_CUR === 0).length,
        transactions,
        queriedAt: new Date(),
      };

      // Parse CI data from Oracle records
      parsedCIData = parseCIDataFromRecords(transactions);
    }

    // Auto-populate prepared submissions from refreshed data
    const prepared = buildPreparedSubmissions(results.transactions);

    set({
      isLoading: false,
      queryResults: results,
      parsedCIData,
      // Set prepared submissions
      preparedDeptCoData: prepared.deptCo,
      preparedPositionData: prepared.position,
      preparedJobData: prepared.job,
      preparedOtherDeptCoData: prepared.otherDeptCo,
      preparedPositionCreateData: prepared.positionCreate,
      // Re-initialize transaction selections (all selected for both tabs)
      selectedByTab: {
        manager: new Set(results.transactions.filter(r => r.MGR_CUR === 1).map(r => r.TRANSACTION_NBR)),
        other: new Set(results.transactions.filter(r => r.MGR_CUR === 0).map(r => r.TRANSACTION_NBR)),
      },
    });
  },

  // === Manager Workflow ===
  managerWorkflow: INITIAL_MANAGER_WORKFLOW,
  isWorkflowPaused: false,
  managerPauseReason: undefined,

  /**
   * Start the approval workflow via server API.
   * Browser lifecycle is handled internally by the server.
   * Aliased as `openBrowser` for backward compatibility.
   */
  openBrowser: async () => {
    // Filter by MGR_CUR = 1 for Manager queue, excluding unchecked transactions
    const managerSelected = get().selectedByTab.manager;
    const managerRecords = get().queryResults?.transactions.filter(
      r => r.MGR_CUR === 1 && managerSelected.has(r.TRANSACTION_NBR)
    ) ?? [];

    if (managerRecords.length === 0) {
      set({ managerWorkflow: { step: 'error', message: 'No transactions to approve' } });
      return;
    }

    const transactionIds = managerRecords.map(r => r.TRANSACTION_NBR);
    const firstTransactionId = transactionIds[0];

    // Build per-transaction URL map: dev uses test-site mock, prod uses WEB_LINK from query
    const transactionUrls: Record<string, string> = {};
    for (const r of managerRecords) {
      transactionUrls[r.TRANSACTION_NBR] = isDevelopment
        ? `${window.location.origin}/test-site?TRANSACTION_NBR=${encodeURIComponent(r.TRANSACTION_NBR)}`
        : r.WEB_LINK;
    }

    // Start approval workflow - browser opens internally on server
    // Go directly to approving state (browser lifecycle is handled server-side)
    // Use 1-indexed display for user-facing progress
    // Include first transaction ID immediately so UI shows it while waiting for server
    set({
      managerWorkflow: {
        step: 'approving',
        current: 1,
        total: managerRecords.length,
        currentItem: firstTransactionId,
      },
    });

    const response = await workflowApi.manager.startApprovals(transactionIds, transactionUrls);

    if (!response.success) {
      set({
        managerWorkflow: {
          step: 'error',
          message: response.error.message,
        },
      });
      return;
    }

    // Workflow started — subscribe to status updates
    // Stop any existing subscription/polling first
    const currentStop = get()._stopPolling;
    if (currentStop) {
      currentStop();
    }

    // Shared handler for workflow status updates (used by both WebSocket and polling)
    const handleManagerStatus = (status: { status: string; step?: string; progress: { current: number; total: number; currentItem?: string } | null; error: string | null; results: { transactionResults?: Record<string, 'approved' | 'error'>; pauseReason?: string } }) => {
      if (status.status === 'running' && status.progress) {
        set({
          managerWorkflow: {
            step: 'approving',
            current: status.progress.current,
            total: status.progress.total,
            currentItem: status.progress.currentItem,
          },
          isWorkflowPaused: false,
          managerPauseReason: undefined,
        });
        updateRecordStatuses(set, get, status.results.transactionResults, status.progress.currentItem);
      } else if (status.status === 'paused' && status.progress) {
        set({
          managerWorkflow: {
            step: 'approving',
            current: status.progress.current,
            total: status.progress.total,
            currentItem: status.progress.currentItem,
          },
          isWorkflowPaused: true,
          managerPauseReason: status.results.pauseReason,
        });
        updateRecordStatuses(set, get, status.results.transactionResults, status.progress.currentItem);
      } else if (status.status === 'completed') {
        set({
          managerWorkflow: { step: 'approved' },
          isWorkflowPaused: false,
          managerPauseReason: undefined,
        });
        updateRecordStatuses(set, get, status.results.transactionResults, undefined);
        const stop = get()._stopPolling;
        if (stop) {
          stop();
          set({ _stopPolling: null });
        }
      } else if (status.status === 'error') {
        set({
          managerWorkflow: { step: 'error', message: status.error ?? 'Unknown error' },
          isWorkflowPaused: false,
        });
        const stop = get()._stopPolling;
        if (stop) {
          stop();
          set({ _stopPolling: null });
        }
      } else if (status.status === 'cancelled') {
        set({ managerWorkflow: { step: 'idle' }, isWorkflowPaused: false });
        const stop = get()._stopPolling;
        if (stop) {
          stop();
          set({ _stopPolling: null });
        }
      }
    };

    // Use WebSocket if connected, otherwise fall back to HTTP polling
    let stopFn: () => void;

    if (wsService.connectionState === 'connected' && !wsService.isFallback) {
      // WebSocket path — subscribe to workflow:progress events
      const unsubWs = wsService.on<WorkflowProgressPayload>('workflow:progress', (payload) => {
        if (payload.workflowType !== 'manager') return;
        handleManagerStatus(payload);
      });

      // Also subscribe to fallback event — if WS drops, switch to polling
      const unsubFallback = wsService.on('fallback', () => {
        // WS died — switch to polling for the rest of this workflow run
        unsubWs();
        unsubFallback();
        const pollStop = workflowApi.manager.pollStatus((status, error) => {
          if (error) {
            set({ managerWorkflow: { step: 'error', message: error }, isWorkflowPaused: false });
            return;
          }
          if (status) handleManagerStatus(status);
        });
        set({ _stopPolling: pollStop });
      });

      stopFn = () => { unsubWs(); unsubFallback(); };
    } else {
      // Polling fallback path
      stopFn = workflowApi.manager.pollStatus((status, error) => {
        if (error) {
          set({ managerWorkflow: { step: 'error', message: error }, isWorkflowPaused: false });
          return;
        }
        if (status) handleManagerStatus(status);
      });
    }

    set({ _stopPolling: stopFn });
  },

  /** No-op for backward compatibility — approvals are processed as part of openBrowser */
  processApprovals: async () => {
    // No-op - approvals are now processed as part of startApprovals (openBrowser)
    // Kept for backward compatibility but the actual processing
    // happens server-side when startApprovals is called
  },

  /**
   * Pause the approval workflow (pauses between transactions)
   * Guarded against rapid-fire calls to prevent race conditions
   */
  pauseApprovals: async (reason?: string) => {
    if (get()._isPauseInFlight) return;
    set({ _isPauseInFlight: true });
    try {
      await workflowApi.manager.pause(reason);
    } finally {
      set({ _isPauseInFlight: false });
    }
  },

  /**
   * Resume a paused approval workflow
   * Guarded against rapid-fire calls to prevent race conditions
   */
  resumeApprovals: async () => {
    if (get()._isPauseInFlight) return;
    set({ _isPauseInFlight: true });
    try {
      await workflowApi.manager.resume();
    } finally {
      set({ _isPauseInFlight: false });
    }
  },

  resetManagerWorkflow: () => {
    // Stop polling if active
    const stopPolling = get()._stopPolling;
    if (stopPolling) {
      stopPolling();
      set({ _stopPolling: null });
    }
    // Stop any running server workflow
    void workflowApi.manager.stop();
    // Reset local state
    set({
      managerWorkflow: INITIAL_MANAGER_WORKFLOW,
      preparedDeptCoData: [],
      preparedPositionData: [],
      preparedJobData: [],
      isWorkflowPaused: false,
      managerPauseReason: undefined,
    });
    // Reset manager record statuses to 'pending'
    const queryResults = get().queryResults;
    if (queryResults) {
      const transactions = queryResults.transactions.map(txn =>
        txn.MGR_CUR === 1 && txn.status !== 'pending'
          ? { ...txn, status: 'pending' as const }
          : txn
      );
      set({ queryResults: { ...queryResults, transactions } });
    }
  },

  // === Manager Submission ===
  preparedDeptCoData: [],
  preparedPositionData: [],
  preparedJobData: [],

  submitDeptCoData: async () => {
    const managerSelected = get().selectedByTab.manager;

    // Compute dept co CI duplicates from selected records
    const deptCoRecords = get().parsedCIData.deptCoUpdate
      .filter(r => managerSelected.has(r.transactionNbr));
    const deptCoDuplicates = findCIDuplicates(deptCoRecords, DEPT_CO_UPDATE_CI_TEMPLATE.fields);

    // Build indices of selected dept co submissions (excluding duplicates)
    const currentPrepared = get().preparedDeptCoData;
    const selectedIndices: number[] = [];
    for (let i = 0; i < currentPrepared.length; i++) {
      const txnNbr = currentPrepared[i].id.replace('deptco-', '');
      if (managerSelected.has(txnNbr) && !deptCoDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;
    const posTotal = selectEffectiveRecordCounts(get()).positionUpdate;

    if (isSoapBatchMode && !isDevelopment && total > 0) {
      // --- Batch production path ---
      const resolvedRecords = selectedIndices.map(i => {
        const txnNbr = get().preparedDeptCoData[i].id.replace('deptco-', '');
        const ciRecord = get().parsedCIData.deptCoUpdate.find(
          r => r.transactionNbr === txnNbr
        );
        return { index: i, ciRecord };
      });

      // Group by action (required: submitBatch takes a single action)
      const byAction = new Map<string, typeof resolvedRecords>();
      for (const entry of resolvedRecords) {
        if (!entry.ciRecord) continue;
        const key = entry.ciRecord.action;
        const group = byAction.get(key) ?? [];
        group.push(entry);
        byAction.set(key, group);
      }

      let processed = 0;
      for (const [, group] of byAction) {
        const chunks = chunkArray(group, soapBatchSize);
        for (const chunk of chunks) {
          const chunkIndices = new Set(chunk.map(c => c.index));

          set({ managerWorkflow: { step: 'submitting-dept-co', current: Math.min(processed + chunk.length, total), total } });

          set(state => ({
            preparedDeptCoData: state.preparedDeptCoData.map((sub, idx) =>
              chunkIndices.has(idx) ? { ...sub, status: 'submitting' } : sub
            ),
          }));

          let submitFailed = false;
          let errorMsg = '';
          const ciRecords = chunk
            .map(c => c.ciRecord)
            .filter((r): r is NonNullable<typeof r> => r != null);

          if (ciRecords.length > 0) {
            try {
              const payloads = ciRecords.map(r =>
                buildSOAPPayload(r, DEPT_CO_UPDATE_CI_TEMPLATE.fields)
              );
              const result = await soapApi.ci.submit(
                ciRecords[0].ciName, ciRecords[0].action, payloads
              );

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP batch submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }

          processed += chunk.length;

          if (processed >= total) {
            set({ managerWorkflow: { step: 'submitting-position', current: 0, total: posTotal } });
          }

          set(state => ({
            preparedDeptCoData: state.preparedDeptCoData.map((sub, idx) =>
              chunkIndices.has(idx)
                ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
                : sub
            ),
          }));
        }
      }
    } else {
      // --- Sequential path (development + non-batch production) ---
      for (let s = 0; s < total; s++) {
        const i = selectedIndices[s];
        set({ managerWorkflow: { step: 'submitting-dept-co', current: s + 1, total } });

        set(state => ({
          preparedDeptCoData: state.preparedDeptCoData.map((sub, idx) =>
            idx === i ? { ...sub, status: 'submitting' } : sub
          ),
        }));

        let submitFailed = false;
        let errorMsg = '';

        if (isDevelopment) {
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          const txnNbr = get().preparedDeptCoData[i].id.replace('deptco-', '');
          const ciRecord = get().parsedCIData.deptCoUpdate.find(
            r => r.transactionNbr === txnNbr
          );

          if (ciRecord) {
            try {
              const payload = buildSOAPPayload(ciRecord, DEPT_CO_UPDATE_CI_TEMPLATE.fields);
              const result = await soapApi.ci.submit(ciRecord.ciName, ciRecord.action, payload);

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }
        }

        // For the last item, transition to next step BEFORE marking status
        if (s === total - 1) {
          set({ managerWorkflow: { step: 'submitting-position', current: 0, total: posTotal } });
        }

        set(state => ({
          preparedDeptCoData: state.preparedDeptCoData.map((sub, idx) =>
            idx === i
              ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
              : sub
          ),
        }));
      }
    }

    // If no dept co items, still transition to position step
    if (total === 0) {
      set({ managerWorkflow: { step: 'submitting-position', current: 0, total: posTotal } });
    }
  },

  submitPositionData: async () => {
    const managerSelected = get().selectedByTab.manager;

    // Compute position update CI duplicates from selected records
    const posUpdateRecords = get().parsedCIData.positionUpdate
      .filter(r => managerSelected.has(r.transactionNbr));
    const posUpdateDuplicates = findCIDuplicates(posUpdateRecords, POSITION_UPDATE_CI_TEMPLATE.fields);

    // Lookup of transaction numbers that actually have position update CI data.
    // preparedPositionData includes ALL manager records, but not all have CI data.
    const posUpdateTxnNbrs = new Set(posUpdateRecords.map(r => r.transactionNbr));

    // Build indices of selected position submissions (with CI data, excluding duplicates)
    const currentPrepared = get().preparedPositionData;
    const selectedIndices: number[] = [];
    for (let i = 0; i < currentPrepared.length; i++) {
      const txnNbr = currentPrepared[i].id.replace('pos-', '');
      if (managerSelected.has(txnNbr) && posUpdateTxnNbrs.has(txnNbr) && !posUpdateDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;
    const jobTotal = selectEffectiveRecordCounts(get()).jobUpdate;

    if (isSoapBatchMode && !isDevelopment && total > 0) {
      // --- Batch production path ---
      const resolvedRecords = selectedIndices.map(i => {
        const txnNbr = get().preparedPositionData[i].id.replace('pos-', '');
        const ciRecord = get().parsedCIData.positionUpdate.find(
          r => r.transactionNbr === txnNbr
        );
        return { index: i, ciRecord };
      });

      // Group by action (POSITION_UPDATE_CI has actionIsFixed: false - can be UPDATE or UPDATEDATA)
      const byAction = new Map<string, typeof resolvedRecords>();
      for (const entry of resolvedRecords) {
        if (!entry.ciRecord) continue;
        const key = entry.ciRecord.action;
        const group = byAction.get(key) ?? [];
        group.push(entry);
        byAction.set(key, group);
      }

      let processed = 0;
      for (const [, group] of byAction) {
        const chunks = chunkArray(group, soapBatchSize);
        for (const chunk of chunks) {
          const chunkIndices = new Set(chunk.map(c => c.index));

          set({ managerWorkflow: { step: 'submitting-position', current: Math.min(processed + chunk.length, total), total } });

          set(state => ({
            preparedPositionData: state.preparedPositionData.map((sub, idx) =>
              chunkIndices.has(idx) ? { ...sub, status: 'submitting' } : sub
            ),
          }));

          let submitFailed = false;
          let errorMsg = '';
          const ciRecords = chunk
            .map(c => c.ciRecord)
            .filter((r): r is NonNullable<typeof r> => r != null);

          if (ciRecords.length > 0) {
            try {
              const payloads = ciRecords.map(r =>
                buildSOAPPayload(r, POSITION_UPDATE_CI_TEMPLATE.fields)
              );
              const result = await soapApi.ci.submit(
                ciRecords[0].ciName, ciRecords[0].action, payloads
              );

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP batch submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }

          processed += chunk.length;

          if (processed >= total) {
            set({ managerWorkflow: { step: 'submitting-job', current: 0, total: jobTotal } });
          }

          set(state => ({
            preparedPositionData: state.preparedPositionData.map((sub, idx) =>
              chunkIndices.has(idx)
                ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
                : sub
            ),
          }));
        }
      }
    } else {
      // --- Sequential path (development + non-batch production) ---
      for (let s = 0; s < total; s++) {
        const i = selectedIndices[s];
        set({ managerWorkflow: { step: 'submitting-position', current: s + 1, total } });

        set(state => ({
          preparedPositionData: state.preparedPositionData.map((sub, idx) =>
            idx === i ? { ...sub, status: 'submitting' } : sub
          ),
        }));

        let submitFailed = false;
        let errorMsg = '';

        if (isDevelopment) {
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          const txnNbr = get().preparedPositionData[i].id.replace('pos-', '');
          const ciRecord = get().parsedCIData.positionUpdate.find(
            r => r.transactionNbr === txnNbr
          );

          if (ciRecord) {
            try {
              const payload = buildSOAPPayload(ciRecord, POSITION_UPDATE_CI_TEMPLATE.fields);
              const result = await soapApi.ci.submit(ciRecord.ciName, ciRecord.action, payload);

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }
        }

        // For the last item, transition to next step BEFORE marking status
        if (s === total - 1) {
          set({ managerWorkflow: { step: 'submitting-job', current: 0, total: jobTotal } });
        }

        set(state => ({
          preparedPositionData: state.preparedPositionData.map((sub, idx) =>
            idx === i
              ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
              : sub
          ),
        }));
      }
    }

    // If no position items selected, still transition to job step
    if (total === 0) {
      set({ managerWorkflow: { step: 'submitting-job', current: 0, total: jobTotal } });
    }
  },

  submitJobData: async () => {
    const managerSelected = get().selectedByTab.manager;

    // Compute job update CI duplicates from selected records
    const jobUpdateRecords = get().parsedCIData.jobUpdate
      .filter(r => managerSelected.has(r.transactionNbr));
    const jobUpdateDuplicates = findCIDuplicates(jobUpdateRecords, JOB_UPDATE_CI_TEMPLATE.fields);

    // Lookup of transaction numbers that actually have job update CI data.
    // preparedJobData includes ALL manager records, but not all have CI data.
    const jobUpdateTxnNbrs = new Set(jobUpdateRecords.map(r => r.transactionNbr));

    // Build indices of selected job submissions (with CI data, excluding duplicates)
    const currentPrepared = get().preparedJobData;
    const selectedIndices: number[] = [];
    for (let i = 0; i < currentPrepared.length; i++) {
      const txnNbr = currentPrepared[i].id.replace('job-', '');
      if (managerSelected.has(txnNbr) && jobUpdateTxnNbrs.has(txnNbr) && !jobUpdateDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;

    if (isSoapBatchMode && !isDevelopment && total > 0) {
      // --- Batch production path ---
      const resolvedRecords = selectedIndices.map(i => {
        const txnNbr = get().preparedJobData[i].id.replace('job-', '');
        const ciRecord = get().parsedCIData.jobUpdate.find(
          r => r.transactionNbr === txnNbr
        );
        return { index: i, ciRecord };
      });

      const byAction = new Map<string, typeof resolvedRecords>();
      for (const entry of resolvedRecords) {
        if (!entry.ciRecord) continue;
        const key = entry.ciRecord.action;
        const group = byAction.get(key) ?? [];
        group.push(entry);
        byAction.set(key, group);
      }

      let processed = 0;
      for (const [, group] of byAction) {
        const chunks = chunkArray(group, soapBatchSize);
        for (const chunk of chunks) {
          const chunkIndices = new Set(chunk.map(c => c.index));

          set({ managerWorkflow: { step: 'submitting-job', current: Math.min(processed + chunk.length, total), total } });

          set(state => ({
            preparedJobData: state.preparedJobData.map((sub, idx) =>
              chunkIndices.has(idx) ? { ...sub, status: 'submitting' } : sub
            ),
          }));

          let submitFailed = false;
          let errorMsg = '';
          const ciRecords = chunk
            .map(c => c.ciRecord)
            .filter((r): r is NonNullable<typeof r> => r != null);

          if (ciRecords.length > 0) {
            try {
              const payloads = ciRecords.map(r =>
                buildSOAPPayload(r, JOB_UPDATE_CI_TEMPLATE.fields)
              );
              const result = await soapApi.ci.submit(
                ciRecords[0].ciName, ciRecords[0].action, payloads
              );

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP batch submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }

          processed += chunk.length;

          set(state => ({
            preparedJobData: state.preparedJobData.map((sub, idx) =>
              chunkIndices.has(idx)
                ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
                : sub
            ),
          }));
        }
      }
    } else {
      // --- Sequential path (development + non-batch production) ---
      for (let s = 0; s < total; s++) {
        const i = selectedIndices[s];
        set({ managerWorkflow: { step: 'submitting-job', current: s + 1, total } });

        set(state => ({
          preparedJobData: state.preparedJobData.map((sub, idx) =>
            idx === i ? { ...sub, status: 'submitting' } : sub
          ),
        }));

        let submitFailed = false;
        let errorMsg = '';

        if (isDevelopment) {
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          const txnNbr = get().preparedJobData[i].id.replace('job-', '');
          const ciRecord = get().parsedCIData.jobUpdate.find(
            r => r.transactionNbr === txnNbr
          );

          if (ciRecord) {
            try {
              const payload = buildSOAPPayload(ciRecord, JOB_UPDATE_CI_TEMPLATE.fields);
              const result = await soapApi.ci.submit(ciRecord.ciName, ciRecord.action, payload);

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }
        }

        set(state => ({
          preparedJobData: state.preparedJobData.map((sub, idx) =>
            idx === i
              ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
              : sub
          ),
        }));
      }
    }

    set({ managerWorkflow: { step: 'complete' } });
  },

  // === Other Workflow ===
  otherWorkflow: INITIAL_OTHER_WORKFLOW,
  isOtherWorkflowPaused: false,
  otherPauseReason: undefined,

  /**
   * Start the Other approval workflow via server API.
   * Browser lifecycle is handled internally by the server.
   */
  openOtherBrowser: async () => {
    // Filter by MGR_CUR = 0 for Other queue, excluding unchecked transactions
    const otherSelected = get().selectedByTab.other;
    const otherRecords = get().queryResults?.transactions.filter(
      r => r.MGR_CUR === 0 && otherSelected.has(r.TRANSACTION_NBR)
    ) ?? [];

    if (otherRecords.length === 0) {
      set({ otherWorkflow: { step: 'error', message: 'No transactions to approve' } });
      return;
    }

    const transactionIds = otherRecords.map(r => r.TRANSACTION_NBR);
    const firstTransactionId = transactionIds[0];

    // Build per-transaction URL map: dev uses test-site mock, prod uses WEB_LINK from query
    const transactionUrls: Record<string, string> = {};
    for (const r of otherRecords) {
      transactionUrls[r.TRANSACTION_NBR] = isDevelopment
        ? `${window.location.origin}/test-site?TRANSACTION_NBR=${encodeURIComponent(r.TRANSACTION_NBR)}`
        : r.WEB_LINK;
    }

    // Go directly to approving state
    set({
      otherWorkflow: {
        step: 'approving',
        current: 1,
        total: otherRecords.length,
        currentItem: firstTransactionId,
      },
    });

    const response = await workflowApi.other.startApprovals(transactionIds, transactionUrls);

    if (!response.success) {
      set({
        otherWorkflow: {
          step: 'error',
          message: response.error.message,
        },
      });
      return;
    }

    // Stop any existing subscription/polling first
    const currentStop = get()._stopOtherPolling;
    if (currentStop) {
      currentStop();
    }

    // Shared handler for Other workflow status updates (WebSocket or polling)
    const handleOtherStatus = (status: { status: string; step?: string; progress: { current: number; total: number; currentItem?: string } | null; error: string | null; results: { transactionResults?: Record<string, 'approved' | 'error'>; pauseReason?: string } }) => {
      if (status.status === 'running' && status.progress) {
        set({
          otherWorkflow: {
            step: 'approving',
            current: status.progress.current,
            total: status.progress.total,
            currentItem: status.progress.currentItem,
          },
          isOtherWorkflowPaused: false,
          otherPauseReason: undefined,
        });
        updateRecordStatuses(set, get, status.results.transactionResults, status.progress.currentItem);
      } else if (status.status === 'paused' && status.progress) {
        set({
          otherWorkflow: {
            step: 'approving',
            current: status.progress.current,
            total: status.progress.total,
            currentItem: status.progress.currentItem,
          },
          isOtherWorkflowPaused: true,
          otherPauseReason: status.results.pauseReason,
        });
        updateRecordStatuses(set, get, status.results.transactionResults, status.progress.currentItem);
      } else if (status.status === 'completed') {
        set({
          otherWorkflow: { step: 'approved' },
          isOtherWorkflowPaused: false,
          otherPauseReason: undefined,
        });
        updateRecordStatuses(set, get, status.results.transactionResults, undefined);
        const stop = get()._stopOtherPolling;
        if (stop) {
          stop();
          set({ _stopOtherPolling: null });
        }
        // Auto-transition to complete after approved
        const completeTimeout = setTimeout(() => {
          set({ otherWorkflow: { step: 'complete' }, _otherCompleteTimeout: null });
        }, 300);
        set({ _otherCompleteTimeout: completeTimeout });
      } else if (status.status === 'error') {
        set({
          otherWorkflow: { step: 'error', message: status.error ?? 'Unknown error' },
          isOtherWorkflowPaused: false,
        });
        const stop = get()._stopOtherPolling;
        if (stop) {
          stop();
          set({ _stopOtherPolling: null });
        }
      } else if (status.status === 'cancelled') {
        set({ otherWorkflow: { step: 'idle' }, isOtherWorkflowPaused: false });
        const stop = get()._stopOtherPolling;
        if (stop) {
          stop();
          set({ _stopOtherPolling: null });
        }
      }
    };

    // Use WebSocket if connected, otherwise fall back to HTTP polling
    let stopFn: () => void;

    if (wsService.connectionState === 'connected' && !wsService.isFallback) {
      const unsubWs = wsService.on<WorkflowProgressPayload>('workflow:progress', (payload) => {
        if (payload.workflowType !== 'other') return;
        handleOtherStatus(payload);
      });

      const unsubFallback = wsService.on('fallback', () => {
        unsubWs();
        unsubFallback();
        const pollStop = workflowApi.other.pollStatus((status, error) => {
          if (error) {
            set({ otherWorkflow: { step: 'error', message: error }, isOtherWorkflowPaused: false });
            return;
          }
          if (status) handleOtherStatus(status);
        });
        set({ _stopOtherPolling: pollStop });
      });

      stopFn = () => { unsubWs(); unsubFallback(); };
    } else {
      stopFn = workflowApi.other.pollStatus((status, error) => {
        if (error) {
          set({ otherWorkflow: { step: 'error', message: error }, isOtherWorkflowPaused: false });
          return;
        }
        if (status) handleOtherStatus(status);
      });
    }

    set({ _stopOtherPolling: stopFn });
  },

  /**
   * Pause the Other approval workflow
   * Guarded against rapid-fire calls to prevent race conditions
   */
  pauseOtherApprovals: async (reason?: string) => {
    if (get()._isOtherPauseInFlight) return;
    set({ _isOtherPauseInFlight: true });
    try {
      await workflowApi.other.pause(reason);
    } finally {
      set({ _isOtherPauseInFlight: false });
    }
  },

  /**
   * Resume a paused Other approval workflow
   * Guarded against rapid-fire calls to prevent race conditions
   */
  resumeOtherApprovals: async () => {
    if (get()._isOtherPauseInFlight) return;
    set({ _isOtherPauseInFlight: true });
    try {
      await workflowApi.other.resume();
    } finally {
      set({ _isOtherPauseInFlight: false });
    }
  },

  resetOtherWorkflow: () => {
    const stopOtherPolling = get()._stopOtherPolling;
    if (stopOtherPolling) {
      stopOtherPolling();
      set({ _stopOtherPolling: null });
    }
    const completeTimeout = get()._otherCompleteTimeout;
    if (completeTimeout) {
      clearTimeout(completeTimeout);
      set({ _otherCompleteTimeout: null });
    }
    void workflowApi.other.stop();
    set({
      otherWorkflow: INITIAL_OTHER_WORKFLOW,
      preparedOtherDeptCoData: [],
      preparedPositionCreateData: [],
      isOtherWorkflowPaused: false,
      otherPauseReason: undefined,
    });
    // Reset other record statuses to 'pending'
    const queryResults = get().queryResults;
    if (queryResults) {
      const transactions = queryResults.transactions.map(txn =>
        txn.MGR_CUR === 0 && txn.status !== 'pending'
          ? { ...txn, status: 'pending' as const }
          : txn
      );
      set({ queryResults: { ...queryResults, transactions } });
    }
  },

  // === Other Submission ===
  preparedOtherDeptCoData: [],
  preparedPositionCreateData: [],

  /**
   * Submit DEPARTMENT_TBL records for the Other queue.
   * Auto-skips (transitions to submitting-position-create) if no records.
   */
  submitOtherDeptCoData: async () => {
    const otherSelected = get().selectedByTab.other;

    // Compute dept co CI duplicates from selected Other records
    const deptCoRecords = get().parsedCIData.deptCoUpdate
      .filter(r => otherSelected.has(r.transactionNbr));
    const deptCoDuplicates = findCIDuplicates(deptCoRecords, DEPT_CO_UPDATE_CI_TEMPLATE.fields);

    // Build indices of selected Other dept co submissions (excluding duplicates)
    const currentPrepared = get().preparedOtherDeptCoData;
    const selectedIndices: number[] = [];
    for (let i = 0; i < currentPrepared.length; i++) {
      const txnNbr = currentPrepared[i].id.replace('other-deptco-', '');
      if (otherSelected.has(txnNbr) && !deptCoDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;
    const posCreateTotal = selectEffectiveRecordCounts(get()).positionCreate;

    if (isSoapBatchMode && !isDevelopment && total > 0) {
      // --- Batch production path ---
      const resolvedRecords = selectedIndices.map(i => {
        const txnNbr = get().preparedOtherDeptCoData[i].id.replace('other-deptco-', '');
        const ciRecord = get().parsedCIData.deptCoUpdate.find(
          r => r.transactionNbr === txnNbr
        );
        return { index: i, ciRecord };
      });

      const byAction = new Map<string, typeof resolvedRecords>();
      for (const entry of resolvedRecords) {
        if (!entry.ciRecord) continue;
        const key = entry.ciRecord.action;
        const group = byAction.get(key) ?? [];
        group.push(entry);
        byAction.set(key, group);
      }

      let processed = 0;
      for (const [, group] of byAction) {
        const chunks = chunkArray(group, soapBatchSize);
        for (const chunk of chunks) {
          const chunkIndices = new Set(chunk.map(c => c.index));

          set({ otherWorkflow: { step: 'submitting-dept-co', current: Math.min(processed + chunk.length, total), total } });

          set(state => ({
            preparedOtherDeptCoData: state.preparedOtherDeptCoData.map((sub, idx) =>
              chunkIndices.has(idx) ? { ...sub, status: 'submitting' } : sub
            ),
          }));

          let submitFailed = false;
          let errorMsg = '';
          const ciRecords = chunk
            .map(c => c.ciRecord)
            .filter((r): r is NonNullable<typeof r> => r != null);

          if (ciRecords.length > 0) {
            try {
              const payloads = ciRecords.map(r =>
                buildSOAPPayload(r, DEPT_CO_UPDATE_CI_TEMPLATE.fields)
              );
              const result = await soapApi.ci.submit(
                ciRecords[0].ciName, ciRecords[0].action, payloads
              );

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP batch submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }

          processed += chunk.length;

          if (processed >= total) {
            set({ otherWorkflow: { step: 'submitting-position-create', current: 0, total: posCreateTotal } });
          }

          set(state => ({
            preparedOtherDeptCoData: state.preparedOtherDeptCoData.map((sub, idx) =>
              chunkIndices.has(idx)
                ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
                : sub
            ),
          }));
        }
      }
    } else {
      // --- Sequential path (development + non-batch production) ---
      for (let s = 0; s < total; s++) {
        const i = selectedIndices[s];
        set({ otherWorkflow: { step: 'submitting-dept-co', current: s + 1, total } });

        set(state => ({
          preparedOtherDeptCoData: state.preparedOtherDeptCoData.map((sub, idx) =>
            idx === i ? { ...sub, status: 'submitting' } : sub
          ),
        }));

        let submitFailed = false;
        let errorMsg = '';

        if (isDevelopment) {
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          const txnNbr = get().preparedOtherDeptCoData[i].id.replace('other-deptco-', '');
          const ciRecord = get().parsedCIData.deptCoUpdate.find(
            r => r.transactionNbr === txnNbr
          );

          if (ciRecord) {
            try {
              const payload = buildSOAPPayload(ciRecord, DEPT_CO_UPDATE_CI_TEMPLATE.fields);
              const result = await soapApi.ci.submit(ciRecord.ciName, ciRecord.action, payload);

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }
        }

        // For the last item, transition to next step BEFORE marking status
        if (s === total - 1) {
          set({ otherWorkflow: { step: 'submitting-position-create', current: 0, total: posCreateTotal } });
        }

        set(state => ({
          preparedOtherDeptCoData: state.preparedOtherDeptCoData.map((sub, idx) =>
            idx === i
              ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
              : sub
          ),
        }));
      }
    }

    // If no dept co items, still transition to position create step
    if (total === 0) {
      set({ otherWorkflow: { step: 'submitting-position-create', current: 0, total: posCreateTotal } });
    }
  },

  /**
   * Submit POSITION_CREATE_CI records for the Other queue.
   * Transitions to submissions-complete when done.
   */
  submitPositionCreateData: async () => {
    const otherSelected = get().selectedByTab.other;

    // Compute position create CI duplicates from selected records
    const posCreateRecords = get().parsedCIData.positionCreate
      .filter(r => otherSelected.has(r.transactionNbr));
    const posCreateDuplicates = findCIDuplicates(posCreateRecords, POSITION_CREATE_CI_TEMPLATE.fields);

    // Build indices of selected position create submissions (excluding duplicates)
    const currentPrepared = get().preparedPositionCreateData;
    const selectedIndices: number[] = [];
    for (let i = 0; i < currentPrepared.length; i++) {
      const txnNbr = currentPrepared[i].id.replace('poscreate-', '');
      if (otherSelected.has(txnNbr) && !posCreateDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;

    if (isSoapBatchMode && !isDevelopment && total > 0) {
      // --- Batch production path ---
      const resolvedRecords = selectedIndices.map(i => {
        const txnNbr = get().preparedPositionCreateData[i].id.replace('poscreate-', '');
        const ciRecord = get().parsedCIData.positionCreate.find(
          r => r.transactionNbr === txnNbr
        );
        return { index: i, ciRecord };
      });

      const byAction = new Map<string, typeof resolvedRecords>();
      for (const entry of resolvedRecords) {
        if (!entry.ciRecord) continue;
        const key = entry.ciRecord.action;
        const group = byAction.get(key) ?? [];
        group.push(entry);
        byAction.set(key, group);
      }

      let processed = 0;
      for (const [, group] of byAction) {
        const chunks = chunkArray(group, soapBatchSize);
        for (const chunk of chunks) {
          const chunkIndices = new Set(chunk.map(c => c.index));

          set({ otherWorkflow: { step: 'submitting-position-create', current: Math.min(processed + chunk.length, total), total } });

          set(state => ({
            preparedPositionCreateData: state.preparedPositionCreateData.map((sub, idx) =>
              chunkIndices.has(idx) ? { ...sub, status: 'submitting' } : sub
            ),
          }));

          let submitFailed = false;
          let errorMsg = '';
          const ciRecords = chunk
            .map(c => c.ciRecord)
            .filter((r): r is NonNullable<typeof r> => r != null);

          if (ciRecords.length > 0) {
            try {
              const payloads = ciRecords.map(r =>
                buildSOAPPayload(r, POSITION_CREATE_CI_TEMPLATE.fields)
              );
              const result = await soapApi.ci.submit(
                ciRecords[0].ciName, ciRecords[0].action, payloads
              );

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP batch submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }

          processed += chunk.length;

          set(state => ({
            preparedPositionCreateData: state.preparedPositionCreateData.map((sub, idx) =>
              chunkIndices.has(idx)
                ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
                : sub
            ),
          }));
        }
      }
    } else {
      // --- Sequential path (development + non-batch production) ---
      for (let s = 0; s < total; s++) {
        const i = selectedIndices[s];
        set({ otherWorkflow: { step: 'submitting-position-create', current: s + 1, total } });

        set(state => ({
          preparedPositionCreateData: state.preparedPositionCreateData.map((sub, idx) =>
            idx === i ? { ...sub, status: 'submitting' } : sub
          ),
        }));

        let submitFailed = false;
        let errorMsg = '';

        if (isDevelopment) {
          await new Promise(resolve => setTimeout(resolve, 400));
        } else {
          const txnNbr = get().preparedPositionCreateData[i].id.replace('poscreate-', '');
          const ciRecord = get().parsedCIData.positionCreate.find(
            r => r.transactionNbr === txnNbr
          );

          if (ciRecord) {
            try {
              const payload = buildSOAPPayload(ciRecord, POSITION_CREATE_CI_TEMPLATE.fields);
              const result = await soapApi.ci.submit(ciRecord.ciName, ciRecord.action, payload);

              if (!result.success) {
                submitFailed = true;
                errorMsg = result.error.message;
              } else if (!result.data.success) {
                submitFailed = true;
                errorMsg = result.data.errors.length > 0
                  ? result.data.errors.map(e => e.message).join('; ')
                  : 'SOAP submission failed';
              }
            } catch (err) {
              submitFailed = true;
              errorMsg = err instanceof Error ? err.message : 'Unknown error';
            }
          }
        }

        set(state => ({
          preparedPositionCreateData: state.preparedPositionCreateData.map((sub, idx) =>
            idx === i
              ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
              : sub
          ),
        }));
      }
    }

    set({ otherWorkflow: { step: 'submissions-complete' } });
  },

  // === Table UI Preferences ===
  tableCollapseOverrides: new Map<string, boolean>(),

  setTableCollapseOverrides: (updater) => {
    set(state => ({
      tableCollapseOverrides: typeof updater === 'function' ? updater(state.tableCollapseOverrides) : updater,
    }));
  },

  txnExcludedTables: new Set<string>(),

  setTxnExcludedTables: (updater) => {
    set(state => ({
      txnExcludedTables: typeof updater === 'function' ? updater(state.txnExcludedTables) : updater,
    }));
  },

  // === Tab Switch Handler ===

  /**
   * Tab switch handler -- auto-pauses running approval workflows when leaving SmartForm.
   * Uses get() for state reads so no stale closures.
   */
  onTabSwitch: (newTabId: TabId) => {
    if (newTabId === 'smartform') return; // Switching TO SmartForm, not away

    const state = get();

    // Auto-pause manager workflow if actively approving
    if (state.managerWorkflow.step === 'approving' && !state.isWorkflowPaused) {
      void state.pauseApprovals('tab-switch');
    }

    // Auto-pause other workflow if actively approving
    if (state.otherWorkflow.step === 'approving' && !state.isOtherWorkflowPaused) {
      void state.pauseOtherApprovals('tab-switch');
    }
  },

  // === Internal State ===
  _isPauseInFlight: false,
  _isOtherPauseInFlight: false,
  _stopPolling: null,
  _stopOtherPolling: null,
  _otherCompleteTimeout: null,
}));
