/**
 * SmartForm Context Provider
 *
 * Manages all SmartForm state including:
 * - Query execution and results
 * - Sub-tab navigation
 * - Manager workflow state machine
 * - Other workflow state machine (3-step: dept-co → position-create → approvals)
 * - CI submission preparation and tracking
 */

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { SmartFormContext, type SmartFormContextType } from './smartFormContextDef';
import { isDevelopment } from '../config';
import { workflowApi, oracleApi, soapApi } from '../services';
import type {
  SmartFormState,
  SmartFormSubTab,
  SmartFormQueryResult,
  SmartFormRecord,
  ManagerWorkflowStep,
  OtherWorkflowStep,
  PreparedSubmission,
} from '../types';
import type { QueryResultRow } from '../types/oracle';
import {
  INITIAL_SMARTFORM_STATE,
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

/* ==============================================
   Provider Props
   ============================================== */

interface SmartFormProviderProps {
  children: ReactNode;
}

/* ==============================================
   Provider Implementation
   ============================================== */

export function SmartFormProvider({ children }: SmartFormProviderProps) {
  // Core state
  const [state, setState] = useState<SmartFormState>(INITIAL_SMARTFORM_STATE);

  // Polling cleanup refs (one per workflow)
  const stopPollingRef = useRef<(() => void) | null>(null);
  const stopOtherPollingRef = useRef<(() => void) | null>(null);

  // Track mount status to prevent race conditions in async operations
  const isMountedRef = useRef(true);

  // Prevent rapid-fire pause/resume calls that could cause race conditions
  const isPauseActionInFlightRef = useRef(false);
  const isOtherPauseActionInFlightRef = useRef(false);

  // Prepared submission storage (separate from workflow state for cleaner updates)
  const [preparedDeptCoData, setPreparedDeptCoData] = useState<PreparedSubmission[]>([]);
  const [preparedPositionData, setPreparedPositionData] = useState<PreparedSubmission[]>([]);
  const [preparedJobData, setPreparedJobData] = useState<PreparedSubmission[]>([]);
  const [preparedOtherDeptCoData, setPreparedOtherDeptCoData] = useState<PreparedSubmission[]>([]);
  const [preparedPositionCreateData, setPreparedPositionCreateData] = useState<PreparedSubmission[]>([]);

  // Track if workflows are paused (from server polling)
  const [isWorkflowPaused, setIsWorkflowPaused] = useState(false);
  const [isOtherWorkflowPaused, setIsOtherWorkflowPaused] = useState(false);

  // Per-tab transaction selection (all selected by default after query)
  const [selectedByTab, setSelectedByTab] = useState<Record<SmartFormSubTab, Set<string>>>(() => ({
    manager: new Set(),
    other: new Set(),
  }));

  // Refs for stable callbacks that need current state without dependency churn
  const activeSubTabRef = useRef(state.activeSubTab);
  activeSubTabRef.current = state.activeSubTab;

  const selectedByTabRef = useRef(selectedByTab);
  selectedByTabRef.current = selectedByTab;

  const parsedCIDataRef = useRef(state.parsedCIData);
  parsedCIDataRef.current = state.parsedCIData;

  /* ==============================================
     Query Actions
     ============================================== */

  const runQuery = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    let results: SmartFormQueryResult;
    let parsedCIData = INITIAL_PARSED_CI_DATA;

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
        setState(prev => ({ ...prev, isLoading: false }));
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

    setState(prev => ({
      ...prev,
      isLoading: false,
      hasQueried: true,
      queryResults: results,
      parsedCIData,
      // Reset workflows on fresh query
      managerWorkflow: INITIAL_MANAGER_WORKFLOW,
      otherWorkflow: INITIAL_OTHER_WORKFLOW,
    }));

    // Auto-populate prepared submissions from all records
    const prepared = buildPreparedSubmissions(results.transactions);
    setPreparedDeptCoData(prepared.deptCo);
    setPreparedPositionData(prepared.position);
    setPreparedJobData(prepared.job);
    setPreparedOtherDeptCoData(prepared.otherDeptCo);
    setPreparedPositionCreateData(prepared.positionCreate);

    // Initialize transaction selections (all selected for both tabs)
    setSelectedByTab({
      manager: new Set(results.transactions.filter(r => r.MGR_CUR === 1).map(r => r.TRANSACTION_NBR)),
      other: new Set(results.transactions.filter(r => r.MGR_CUR === 0).map(r => r.TRANSACTION_NBR)),
    });
  }, []);

  const refreshQuery = useCallback(async () => {
    // Same as runQuery but preserves workflow state
    setState(prev => ({ ...prev, isLoading: true }));

    let results: SmartFormQueryResult;
    let parsedCIData = INITIAL_PARSED_CI_DATA;

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
        setState(prev => ({ ...prev, isLoading: false }));
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

    setState(prev => ({
      ...prev,
      isLoading: false,
      queryResults: results,
      parsedCIData,
    }));

    // Auto-populate prepared submissions from refreshed data
    const prepared = buildPreparedSubmissions(results.transactions);
    setPreparedDeptCoData(prepared.deptCo);
    setPreparedPositionData(prepared.position);
    setPreparedJobData(prepared.job);
    setPreparedOtherDeptCoData(prepared.otherDeptCo);
    setPreparedPositionCreateData(prepared.positionCreate);

    // Re-initialize transaction selections (all selected for both tabs)
    setSelectedByTab({
      manager: new Set(results.transactions.filter(r => r.MGR_CUR === 1).map(r => r.TRANSACTION_NBR)),
      other: new Set(results.transactions.filter(r => r.MGR_CUR === 0).map(r => r.TRANSACTION_NBR)),
    });
  }, []);

  /* ==============================================
     Sub-tab Navigation
     ============================================== */

  const setActiveSubTab = useCallback((tab: SmartFormSubTab) => {
    setState(prev => ({ ...prev, activeSubTab: tab }));
  }, []);

  /**
   * Toggle a single transaction's checked/unchecked state for the active sub-tab.
   * Uses activeSubTabRef for a stable callback identity (no dependency on activeSubTab).
   */
  const setTransactionSelected = useCallback((txnNbr: string, selected: boolean) => {
    setSelectedByTab(prev => {
      const tab = activeSubTabRef.current;
      const tabSet = prev[tab];
      const next = new Set(tabSet);
      if (selected) {
        next.add(txnNbr);
      } else {
        next.delete(txnNbr);
      }
      return { ...prev, [tab]: next };
    });
  }, []);

  /* ==============================================
     Manager Workflow Actions
     ============================================== */

  const setManagerWorkflow = useCallback((workflow: ManagerWorkflowStep) => {
    setState(prev => ({ ...prev, managerWorkflow: workflow }));
  }, []);

  /**
   * Start the approval workflow via server API.
   * Browser lifecycle is handled internally by the server.
   */
  const startApprovals = useCallback(async () => {
    // Filter by MGR_CUR = 1 for Manager queue, excluding unchecked transactions
    const managerSelected = selectedByTabRef.current.manager;
    const managerRecords = state.queryResults?.transactions.filter(
      r => r.MGR_CUR === 1 && managerSelected.has(r.TRANSACTION_NBR)
    ) ?? [];

    if (managerRecords.length === 0) {
      setManagerWorkflow({ step: 'error', message: 'No transactions to approve' });
      return;
    }

    const transactionIds = managerRecords.map(r => r.TRANSACTION_NBR);
    const firstTransactionId = transactionIds[0];

    // Start approval workflow - browser opens internally on server
    // Go directly to approving state (browser lifecycle is handled server-side)
    // Use 1-indexed display for user-facing progress
    // Include first transaction ID immediately so UI shows it while waiting for server
    setManagerWorkflow({
      step: 'approving',
      current: 1,
      total: managerRecords.length,
      currentItem: firstTransactionId,
    });

    // Get test site URL for development
    const testSiteUrl = isDevelopment
      ? `${window.location.origin}/test-site`
      : undefined;

    const response = await workflowApi.manager.startApprovals(transactionIds, testSiteUrl);

    // Check if component unmounted during the await - prevent race condition
    if (!isMountedRef.current) {
      return;
    }

    if (!response.success) {
      setManagerWorkflow({
        step: 'error',
        message: response.error.message,
      });
      return;
    }

    // Workflow started - begin polling for status
    // Stop any existing polling first
    if (stopPollingRef.current) {
      stopPollingRef.current();
    }

    // Start polling for workflow status
    stopPollingRef.current = workflowApi.manager.pollStatus((status, error) => {
      if (error) {
        setManagerWorkflow({ step: 'error', message: error });
        setIsWorkflowPaused(false);
        return;
      }

      if (!status) return;

      // Update progress based on server status
      if (status.status === 'running' && status.progress) {
        setManagerWorkflow({
          step: 'approving',
          current: status.progress.current,
          total: status.progress.total,
          currentItem: status.progress.currentItem,
        });
        setIsWorkflowPaused(false);
      } else if (status.status === 'paused' && status.progress) {
        // Workflow is paused - keep showing progress but mark as paused
        setManagerWorkflow({
          step: 'approving',
          current: status.progress.current,
          total: status.progress.total,
          currentItem: status.progress.currentItem,
        });
        setIsWorkflowPaused(true);
        // Keep polling - user might resume
      } else if (status.status === 'completed') {
        setManagerWorkflow({ step: 'approved' });
        setIsWorkflowPaused(false);
        // Stop polling when complete
        if (stopPollingRef.current) {
          stopPollingRef.current();
          stopPollingRef.current = null;
        }
      } else if (status.status === 'error') {
        setManagerWorkflow({ step: 'error', message: status.error ?? 'Unknown error' });
        setIsWorkflowPaused(false);
        if (stopPollingRef.current) {
          stopPollingRef.current();
          stopPollingRef.current = null;
        }
      } else if (status.status === 'cancelled') {
        // User cancelled - revert to idle
        setManagerWorkflow({ step: 'idle' });
        setIsWorkflowPaused(false);
        if (stopPollingRef.current) {
          stopPollingRef.current();
          stopPollingRef.current = null;
        }
      }
    });
  }, [state.queryResults, setManagerWorkflow]);

  // Legacy aliases for backward compatibility with existing UI
  const openBrowser = startApprovals;
  const processApprovals = useCallback(async () => {
    // No-op - approvals are now processed as part of startApprovals
    // This is kept for backward compatibility but the actual processing
    // happens server-side when startApprovals is called
  }, []);

  const submitDeptCoData = useCallback(async () => {
    const managerSelected = selectedByTabRef.current.manager;

    // Compute dept co CI duplicates from selected records
    const deptCoRecords = parsedCIDataRef.current.deptCoUpdate
      .filter(r => managerSelected.has(r.transactionNbr));
    const deptCoDuplicates = findCIDuplicates(deptCoRecords, DEPT_CO_UPDATE_CI_TEMPLATE.fields);

    // Build indices of selected dept co submissions (excluding duplicates)
    const selectedIndices: number[] = [];
    for (let i = 0; i < preparedDeptCoData.length; i++) {
      const txnNbr = preparedDeptCoData[i].id.replace('deptco-', '');
      if (managerSelected.has(txnNbr) && !deptCoDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;

    // Calculate totals for subsequent step (position)
    const posTotal = preparedPositionData.filter(sub =>
      managerSelected.has(sub.id.replace('pos-', ''))
    ).length;

    // Process selected dept co submissions
    for (let s = 0; s < total; s++) {
      const i = selectedIndices[s];
      setManagerWorkflow({ step: 'submitting-dept-co', current: s + 1, total });

      setPreparedDeptCoData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      let submitFailed = false;
      let errorMsg = '';

      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        const txnNbr = preparedDeptCoData[i].id.replace('deptco-', '');
        const ciRecord = parsedCIDataRef.current.deptCoUpdate.find(
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
        setManagerWorkflow({ step: 'submitting-position', current: 0, total: posTotal });
      }

      setPreparedDeptCoData(prev =>
        prev.map((sub, idx) =>
          idx === i
            ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
            : sub
        )
      );
    }

    // If no dept co items, still transition to position step
    if (total === 0) {
      setManagerWorkflow({ step: 'submitting-position', current: 0, total: posTotal });
    }
  }, [preparedDeptCoData, preparedPositionData, setManagerWorkflow]);

  const submitPositionData = useCallback(async () => {
    const managerSelected = selectedByTabRef.current.manager;

    // Compute position update CI duplicates from selected records
    const posUpdateRecords = parsedCIDataRef.current.positionUpdate
      .filter(r => managerSelected.has(r.transactionNbr));
    const posUpdateDuplicates = findCIDuplicates(posUpdateRecords, POSITION_UPDATE_CI_TEMPLATE.fields);

    // Build indices of selected position submissions (excluding duplicates)
    const selectedIndices: number[] = [];
    for (let i = 0; i < preparedPositionData.length; i++) {
      const txnNbr = preparedPositionData[i].id.replace('pos-', '');
      if (managerSelected.has(txnNbr) && !posUpdateDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;
    const jobTotal = preparedJobData.filter(sub =>
      managerSelected.has(sub.id.replace('job-', ''))
    ).length;

    // Process only selected position submissions
    for (let s = 0; s < total; s++) {
      const i = selectedIndices[s];
      setManagerWorkflow({ step: 'submitting-position', current: s + 1, total });

      // Update individual submission status
      setPreparedPositionData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      let submitFailed = false;
      let errorMsg = '';

      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        const txnNbr = preparedPositionData[i].id.replace('pos-', '');
        const ciRecord = parsedCIDataRef.current.positionUpdate.find(
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
        setManagerWorkflow({ step: 'submitting-job', current: 0, total: jobTotal });
      }

      setPreparedPositionData(prev =>
        prev.map((sub, idx) =>
          idx === i
            ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
            : sub
        )
      );
    }

    // If no position items selected, still transition to job step
    if (total === 0) {
      setManagerWorkflow({ step: 'submitting-job', current: 0, total: jobTotal });
    }
  }, [preparedPositionData, preparedJobData, setManagerWorkflow]);

  const submitJobData = useCallback(async () => {
    const managerSelected = selectedByTabRef.current.manager;

    // Build indices of selected job submissions
    const selectedIndices: number[] = [];
    for (let i = 0; i < preparedJobData.length; i++) {
      const txnNbr = preparedJobData[i].id.replace('job-', '');
      if (managerSelected.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;

    for (let s = 0; s < total; s++) {
      const i = selectedIndices[s];
      setManagerWorkflow({ step: 'submitting-job', current: s + 1, total });

      setPreparedJobData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      let submitFailed = false;
      let errorMsg = '';

      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        const txnNbr = preparedJobData[i].id.replace('job-', '');
        const ciRecord = parsedCIDataRef.current.jobUpdate.find(
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

      setPreparedJobData(prev =>
        prev.map((sub, idx) =>
          idx === i
            ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
            : sub
        )
      );
    }

    setManagerWorkflow({ step: 'complete' });
  }, [preparedJobData, setManagerWorkflow]);

  const resetManagerWorkflow = useCallback(() => {
    // Stop polling if active
    if (stopPollingRef.current) {
      stopPollingRef.current();
      stopPollingRef.current = null;
    }
    // Stop any running server workflow
    void workflowApi.manager.stop();
    // Reset local state
    setManagerWorkflow(INITIAL_MANAGER_WORKFLOW);
    setPreparedDeptCoData([]);
    setPreparedPositionData([]);
    setPreparedJobData([]);
    setIsWorkflowPaused(false);
  }, [setManagerWorkflow]);

  /**
   * Pause the approval workflow (pauses between transactions)
   * Guarded against rapid-fire calls to prevent race conditions
   */
  const pauseApprovals = useCallback(async () => {
    if (isPauseActionInFlightRef.current) return;
    isPauseActionInFlightRef.current = true;
    try {
      await workflowApi.manager.pause();
    } finally {
      isPauseActionInFlightRef.current = false;
    }
  }, []);

  /**
   * Resume a paused approval workflow
   * Guarded against rapid-fire calls to prevent race conditions
   */
  const resumeApprovals = useCallback(async () => {
    if (isPauseActionInFlightRef.current) return;
    isPauseActionInFlightRef.current = true;
    try {
      await workflowApi.manager.resume();
    } finally {
      isPauseActionInFlightRef.current = false;
    }
  }, []);

  /* ==============================================
     Other Workflow Actions
     ============================================== */

  const setOtherWorkflow = useCallback((workflow: OtherWorkflowStep) => {
    setState(prev => ({ ...prev, otherWorkflow: workflow }));
  }, []);

  /**
   * Submit DEPARTMENT_TBL records for the Other queue.
   * Auto-skips (transitions to submitting-position-create) if no records.
   */
  const submitOtherDeptCoData = useCallback(async () => {
    const otherSelected = selectedByTabRef.current.other;

    // Compute dept co CI duplicates from selected Other records
    const deptCoRecords = parsedCIDataRef.current.deptCoUpdate
      .filter(r => otherSelected.has(r.transactionNbr));
    const deptCoDuplicates = findCIDuplicates(deptCoRecords, DEPT_CO_UPDATE_CI_TEMPLATE.fields);

    // Build indices of selected Other dept co submissions (excluding duplicates)
    const selectedIndices: number[] = [];
    for (let i = 0; i < preparedOtherDeptCoData.length; i++) {
      const txnNbr = preparedOtherDeptCoData[i].id.replace('other-deptco-', '');
      if (otherSelected.has(txnNbr) && !deptCoDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;

    // Calculate totals for subsequent step (position create)
    const posCreateTotal = preparedPositionCreateData.filter(sub =>
      otherSelected.has(sub.id.replace('poscreate-', ''))
    ).length;

    // Process selected dept co submissions
    for (let s = 0; s < total; s++) {
      const i = selectedIndices[s];
      setOtherWorkflow({ step: 'submitting-dept-co', current: s + 1, total });

      setPreparedOtherDeptCoData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      let submitFailed = false;
      let errorMsg = '';

      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        const txnNbr = preparedOtherDeptCoData[i].id.replace('other-deptco-', '');
        const ciRecord = parsedCIDataRef.current.deptCoUpdate.find(
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
        setOtherWorkflow({ step: 'submitting-position-create', current: 0, total: posCreateTotal });
      }

      setPreparedOtherDeptCoData(prev =>
        prev.map((sub, idx) =>
          idx === i
            ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
            : sub
        )
      );
    }

    // If no dept co items, still transition to position create step
    if (total === 0) {
      setOtherWorkflow({ step: 'submitting-position-create', current: 0, total: posCreateTotal });
    }
  }, [preparedOtherDeptCoData, preparedPositionCreateData, setOtherWorkflow]);

  /**
   * Submit POSITION_CREATE_CI records for the Other queue.
   * Transitions to submissions-complete when done.
   */
  const submitPositionCreateData = useCallback(async () => {
    const otherSelected = selectedByTabRef.current.other;

    // Compute position create CI duplicates from selected records
    const posCreateRecords = parsedCIDataRef.current.positionCreate
      .filter(r => otherSelected.has(r.transactionNbr));
    const posCreateDuplicates = findCIDuplicates(posCreateRecords, POSITION_CREATE_CI_TEMPLATE.fields);

    // Build indices of selected position create submissions (excluding duplicates)
    const selectedIndices: number[] = [];
    for (let i = 0; i < preparedPositionCreateData.length; i++) {
      const txnNbr = preparedPositionCreateData[i].id.replace('poscreate-', '');
      if (otherSelected.has(txnNbr) && !posCreateDuplicates.has(txnNbr)) {
        selectedIndices.push(i);
      }
    }

    const total = selectedIndices.length;

    // Process selected position create submissions
    for (let s = 0; s < total; s++) {
      const i = selectedIndices[s];
      setOtherWorkflow({ step: 'submitting-position-create', current: s + 1, total });

      setPreparedPositionCreateData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      let submitFailed = false;
      let errorMsg = '';

      if (isDevelopment) {
        await new Promise(resolve => setTimeout(resolve, 400));
      } else {
        const txnNbr = preparedPositionCreateData[i].id.replace('poscreate-', '');
        const ciRecord = parsedCIDataRef.current.positionCreate.find(
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

      setPreparedPositionCreateData(prev =>
        prev.map((sub, idx) =>
          idx === i
            ? { ...sub, status: submitFailed ? 'error' : 'success', ...(submitFailed && { errorMessage: errorMsg }) }
            : sub
        )
      );
    }

    setOtherWorkflow({ step: 'submissions-complete' });
  }, [preparedPositionCreateData, setOtherWorkflow]);

  /**
   * Start the Other approval workflow via server API.
   * Browser lifecycle is handled internally by the server.
   */
  const openOtherBrowser = useCallback(async () => {
    // Filter by MGR_CUR = 0 for Other queue, excluding unchecked transactions
    const otherSelected = selectedByTabRef.current.other;
    const otherRecords = state.queryResults?.transactions.filter(
      r => r.MGR_CUR === 0 && otherSelected.has(r.TRANSACTION_NBR)
    ) ?? [];

    if (otherRecords.length === 0) {
      setOtherWorkflow({ step: 'error', message: 'No transactions to approve' });
      return;
    }

    const transactionIds = otherRecords.map(r => r.TRANSACTION_NBR);
    const firstTransactionId = transactionIds[0];

    // Go directly to approving state
    setOtherWorkflow({
      step: 'approving',
      current: 1,
      total: otherRecords.length,
      currentItem: firstTransactionId,
    });

    // Get test site URL for development
    const testSiteUrl = isDevelopment
      ? `${window.location.origin}/test-site`
      : undefined;

    const response = await workflowApi.other.startApprovals(transactionIds, testSiteUrl);

    if (!isMountedRef.current) {
      return;
    }

    if (!response.success) {
      setOtherWorkflow({
        step: 'error',
        message: response.error.message,
      });
      return;
    }

    // Stop any existing Other polling first
    if (stopOtherPollingRef.current) {
      stopOtherPollingRef.current();
    }

    // Start polling for Other workflow status
    stopOtherPollingRef.current = workflowApi.other.pollStatus((status, error) => {
      if (error) {
        setOtherWorkflow({ step: 'error', message: error });
        setIsOtherWorkflowPaused(false);
        return;
      }

      if (!status) return;

      if (status.status === 'running' && status.progress) {
        setOtherWorkflow({
          step: 'approving',
          current: status.progress.current,
          total: status.progress.total,
          currentItem: status.progress.currentItem,
        });
        setIsOtherWorkflowPaused(false);
      } else if (status.status === 'paused' && status.progress) {
        setOtherWorkflow({
          step: 'approving',
          current: status.progress.current,
          total: status.progress.total,
          currentItem: status.progress.currentItem,
        });
        setIsOtherWorkflowPaused(true);
      } else if (status.status === 'completed') {
        setOtherWorkflow({ step: 'approved' });
        setIsOtherWorkflowPaused(false);
        if (stopOtherPollingRef.current) {
          stopOtherPollingRef.current();
          stopOtherPollingRef.current = null;
        }
        // Auto-transition to complete after approved
        setTimeout(() => {
          setOtherWorkflow({ step: 'complete' });
        }, 300);
      } else if (status.status === 'error') {
        setOtherWorkflow({ step: 'error', message: status.error ?? 'Unknown error' });
        setIsOtherWorkflowPaused(false);
        if (stopOtherPollingRef.current) {
          stopOtherPollingRef.current();
          stopOtherPollingRef.current = null;
        }
      } else if (status.status === 'cancelled') {
        setOtherWorkflow({ step: 'idle' });
        setIsOtherWorkflowPaused(false);
        if (stopOtherPollingRef.current) {
          stopOtherPollingRef.current();
          stopOtherPollingRef.current = null;
        }
      }
    });
  }, [state.queryResults, setOtherWorkflow]);

  /**
   * Pause the Other approval workflow
   * Guarded against rapid-fire calls to prevent race conditions
   */
  const pauseOtherApprovals = useCallback(async () => {
    if (isOtherPauseActionInFlightRef.current) return;
    isOtherPauseActionInFlightRef.current = true;
    try {
      await workflowApi.other.pause();
    } finally {
      isOtherPauseActionInFlightRef.current = false;
    }
  }, []);

  /**
   * Resume a paused Other approval workflow
   * Guarded against rapid-fire calls to prevent race conditions
   */
  const resumeOtherApprovals = useCallback(async () => {
    if (isOtherPauseActionInFlightRef.current) return;
    isOtherPauseActionInFlightRef.current = true;
    try {
      await workflowApi.other.resume();
    } finally {
      isOtherPauseActionInFlightRef.current = false;
    }
  }, []);

  // Track mount state and cleanup polling on unmount
  // Note: Explicitly setting isMountedRef in useEffect (not just useRef initializer)
  // ensures correct behavior with React StrictMode's mount/unmount cycles
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (stopPollingRef.current) {
        stopPollingRef.current();
      }
      if (stopOtherPollingRef.current) {
        stopOtherPollingRef.current();
      }
    };
  }, []);

  const resetOtherWorkflow = useCallback(() => {
    if (stopOtherPollingRef.current) {
      stopOtherPollingRef.current();
      stopOtherPollingRef.current = null;
    }
    void workflowApi.other.stop();
    setOtherWorkflow(INITIAL_OTHER_WORKFLOW);
    setPreparedOtherDeptCoData([]);
    setPreparedPositionCreateData([]);
    setIsOtherWorkflowPaused(false);
  }, [setOtherWorkflow]);

  /* ==============================================
     Computed Values
     ============================================== */

  const filteredRecords = useMemo(() => {
    if (!state.queryResults) return [];
    // Filter by MGR_CUR: 1 = Manager, 0 = Other
    const isManager = state.activeSubTab === 'manager';
    return state.queryResults.transactions
      .filter(t => t.MGR_CUR === (isManager ? 1 : 0))
      .sort((a, b) => {
        // Sort by TRANSACTION_NBR numerically (ascending)
        const numA = Number(a.TRANSACTION_NBR) || 0;
        const numB = Number(b.TRANSACTION_NBR) || 0;
        return numA - numB;
      });
  }, [state.queryResults, state.activeSubTab]);

  /* ==============================================
     Context Value
     ============================================== */

  const contextValue: SmartFormContextType = useMemo(
    () => ({
      state,
      runQuery,
      refreshQuery,
      setActiveSubTab,
      openBrowser,
      processApprovals,
      pauseApprovals,
      resumeApprovals,
      submitDeptCoData,
      submitPositionData,
      submitJobData,
      resetManagerWorkflow,
      isWorkflowPaused,
      submitOtherDeptCoData,
      submitPositionCreateData,
      openOtherBrowser,
      pauseOtherApprovals,
      resumeOtherApprovals,
      resetOtherWorkflow,
      isOtherWorkflowPaused,
      selectedByTab,
      setTransactionSelected,
      filteredRecords,
      preparedDeptCoData,
      preparedPositionData,
      preparedJobData,
      preparedOtherDeptCoData,
      preparedPositionCreateData,
      parsedCIData: state.parsedCIData,
    }),
    [
      state,
      runQuery,
      refreshQuery,
      setActiveSubTab,
      openBrowser,
      processApprovals,
      pauseApprovals,
      resumeApprovals,
      submitDeptCoData,
      submitPositionData,
      submitJobData,
      resetManagerWorkflow,
      isWorkflowPaused,
      submitOtherDeptCoData,
      submitPositionCreateData,
      openOtherBrowser,
      pauseOtherApprovals,
      resumeOtherApprovals,
      resetOtherWorkflow,
      isOtherWorkflowPaused,
      selectedByTab,
      setTransactionSelected,
      filteredRecords,
      preparedDeptCoData,
      preparedPositionData,
      preparedJobData,
      preparedOtherDeptCoData,
      preparedPositionCreateData,
    ]
  );

  return (
    <SmartFormContext value={contextValue}>
      {children}
    </SmartFormContext>
  );
}
