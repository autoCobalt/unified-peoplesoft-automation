/**
 * SmartForm Context Provider
 *
 * Manages all SmartForm state including:
 * - Query execution and results
 * - Sub-tab navigation
 * - Manager workflow state machine
 * - Other workflow state machine
 * - CI submission preparation and tracking
 */

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { SmartFormContext, type SmartFormContextType } from './smartFormContextDef';
import { isDevelopment } from '../config';
import { workflowApi } from '../services';
import type {
  SmartFormState,
  SmartFormSubTab,
  SmartFormQueryResult,
  ManagerWorkflowStep,
  OtherWorkflowStep,
  PreparedSubmission,
} from '../types';
import {
  INITIAL_SMARTFORM_STATE,
  INITIAL_MANAGER_WORKFLOW,
  INITIAL_OTHER_WORKFLOW,
} from '../types';
import { generateMockRecords } from '../dev-data';

/**
 * Generate mock query results.
 * In production, this would be replaced with actual Oracle API calls.
 */
function generateMockQueryResults(): SmartFormQueryResult {
  const records = generateMockRecords();
  const managerCount = records.filter(r => r.approverType === 'Manager').length;
  const otherCount = records.filter(r => r.approverType === 'Other').length;

  return {
    totalCount: records.length,
    managerCount,
    otherCount,
    transactions: records,
    queriedAt: new Date(),
  };
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

  // Polling cleanup ref
  const stopPollingRef = useRef<(() => void) | null>(null);

  // Track mount status to prevent race conditions in async operations
  const isMountedRef = useRef(true);

  // Prevent rapid-fire pause/resume calls that could cause race conditions
  const isPauseActionInFlightRef = useRef(false);

  // Prepared submission storage (separate from workflow state for cleaner updates)
  const [preparedPositionData, setPreparedPositionData] = useState<PreparedSubmission[]>([]);
  const [preparedJobData, setPreparedJobData] = useState<PreparedSubmission[]>([]);

  // Track if workflow is paused (from server polling)
  const [isWorkflowPaused, setIsWorkflowPaused] = useState(false);

  /* ==============================================
     Query Actions
     ============================================== */

  const runQuery = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const results = generateMockQueryResults();

    setState(prev => ({
      ...prev,
      isLoading: false,
      hasQueried: true,
      queryResults: results,
      // Reset workflows on fresh query
      managerWorkflow: INITIAL_MANAGER_WORKFLOW,
      otherWorkflow: INITIAL_OTHER_WORKFLOW,
    }));

    // Clear prepared data on new query
    setPreparedPositionData([]);
    setPreparedJobData([]);
  }, []);

  const refreshQuery = useCallback(async () => {
    // Same as runQuery but preserves workflow state
    setState(prev => ({ ...prev, isLoading: true }));

    await new Promise(resolve => setTimeout(resolve, 600));

    const results = generateMockQueryResults();

    setState(prev => ({
      ...prev,
      isLoading: false,
      queryResults: results,
    }));
  }, []);

  /* ==============================================
     Sub-tab Navigation
     ============================================== */

  const setActiveSubTab = useCallback((tab: SmartFormSubTab) => {
    setState(prev => ({ ...prev, activeSubTab: tab }));
  }, []);

  /* ==============================================
     Manager Workflow Actions
     ============================================== */

  const setManagerWorkflow = useCallback((workflow: ManagerWorkflowStep) => {
    setState(prev => ({ ...prev, managerWorkflow: workflow }));
  }, []);

  const prepareSubmissions = useCallback(async () => {
    setManagerWorkflow({ step: 'preparing', ciType: 'position' });

    // Simulate preparation delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate prepared submissions from manager records
    const managerRecords = state.queryResults?.transactions.filter(
      r => r.approverType === 'Manager'
    ) ?? [];

    const positionSubs: PreparedSubmission[] = managerRecords.map(record => ({
      id: `pos-${record.id}`,
      emplid: record.emplid,
      employeeName: record.employeeName,
      ciType: 'CI_POSITION_DATA',
      status: 'pending',
      payload: JSON.stringify({ emplid: record.emplid, effdt: record.newEffdt }),
    }));

    const jobSubs: PreparedSubmission[] = managerRecords.map(record => ({
      id: `job-${record.id}`,
      emplid: record.emplid,
      employeeName: record.employeeName,
      ciType: 'CI_JOB_DATA',
      status: 'pending',
      payload: JSON.stringify({ emplid: record.emplid, effdt: record.newEffdt }),
    }));

    setPreparedPositionData(positionSubs);
    setPreparedJobData(jobSubs);

    setManagerWorkflow({
      step: 'prepared',
      positionData: positionSubs,
      jobData: jobSubs,
    });
  }, [state.queryResults, setManagerWorkflow]);

  /**
   * Start the approval workflow via server API.
   * Browser lifecycle is handled internally by the server.
   */
  const startApprovals = useCallback(async () => {
    const managerRecords = state.queryResults?.transactions.filter(
      r => r.approverType === 'Manager'
    ) ?? [];

    if (managerRecords.length === 0) {
      setManagerWorkflow({ step: 'error', message: 'No transactions to approve' });
      return;
    }

    const transactionIds = managerRecords.map(r => r.transaction);
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
        // User cancelled - revert to prepared state
        setManagerWorkflow({
          step: 'prepared',
          positionData: preparedPositionData,
          jobData: preparedJobData,
        });
        setIsWorkflowPaused(false);
        if (stopPollingRef.current) {
          stopPollingRef.current();
          stopPollingRef.current = null;
        }
      }
    });
  }, [state.queryResults, setManagerWorkflow, preparedPositionData, preparedJobData]);

  // Legacy aliases for backward compatibility with existing UI
  const openBrowser = startApprovals;
  const processApprovals = useCallback(async () => {
    // No-op - approvals are now processed as part of startApprovals
    // This is kept for backward compatibility but the actual processing
    // happens server-side when startApprovals is called
  }, []);

  const submitPositionData = useCallback(async () => {
    const total = preparedPositionData.length;
    const jobTotal = preparedJobData.length;

    for (let i = 0; i < total; i++) {
      setManagerWorkflow({ step: 'submitting-position', current: i + 1, total });

      // Update individual submission status
      setPreparedPositionData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      // Simulate CI submission
      await new Promise(resolve => setTimeout(resolve, 400));

      // For the last item, transition to next step BEFORE marking success
      // This ensures both state updates are batched together, preventing
      // a brief flash of the old button label
      if (i === total - 1) {
        setManagerWorkflow({ step: 'submitting-job', current: 0, total: jobTotal });
      }

      // Mark as success (or error in real implementation)
      setPreparedPositionData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'success' } : sub
        )
      );
    }
  }, [preparedPositionData, preparedJobData.length, setManagerWorkflow]);

  const submitJobData = useCallback(async () => {
    const total = preparedJobData.length;

    for (let i = 0; i < total; i++) {
      setManagerWorkflow({ step: 'submitting-job', current: i + 1, total });

      setPreparedJobData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'submitting' } : sub
        )
      );

      await new Promise(resolve => setTimeout(resolve, 400));

      setPreparedJobData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'success' } : sub
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

  const createPositionRecords = useCallback(async () => {
    const otherRecords = state.queryResults?.transactions.filter(
      r => r.approverType === 'Other'
    ) ?? [];

    // Get distinct position numbers
    const distinctPositions = [...new Set(otherRecords.map(r => r.positionNumber).filter(Boolean))];
    const total = distinctPositions.length;

    for (let i = 0; i < total; i++) {
      setOtherWorkflow({ step: 'creating-positions', current: i + 1, total });
      // Simulate position creation
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setOtherWorkflow({ step: 'positions-created', count: total });

    // Auto-refresh query after position creation
    await refreshQuery();
  }, [state.queryResults, setOtherWorkflow, refreshQuery]);

  const processOtherApprovals = useCallback(async () => {
    const otherRecords = state.queryResults?.transactions.filter(
      r => r.approverType === 'Other'
    ) ?? [];

    if (otherRecords.length === 0) {
      setOtherWorkflow({ step: 'complete' });
      return;
    }

    // TODO: Implement Other workflow using workflowApi when Other endpoints are added
    // For now, simulate the workflow locally (browser lifecycle will be handled server-side)
    const total = otherRecords.length;

    // Go directly to approving state

    for (let i = 0; i < total; i++) {
      setOtherWorkflow({ step: 'approving', current: i + 1, total });
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setOtherWorkflow({ step: 'approved' });
    await new Promise(resolve => setTimeout(resolve, 300));
    setOtherWorkflow({ step: 'complete' });
  }, [state.queryResults, setOtherWorkflow]);

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
    };
  }, []);

  const resetOtherWorkflow = useCallback(() => {
    setOtherWorkflow(INITIAL_OTHER_WORKFLOW);
  }, [setOtherWorkflow]);

  /* ==============================================
     Computed Values
     ============================================== */

  const filteredRecords = useMemo(() => {
    if (!state.queryResults) return [];
    return state.queryResults.transactions.filter(
      t => t.approverType === (state.activeSubTab === 'manager' ? 'Manager' : 'Other')
    );
  }, [state.queryResults, state.activeSubTab]);


  const distinctPositionCount = useMemo(() => {
    if (!state.queryResults) return 0;
    const otherRecords = state.queryResults.transactions.filter(
      r => r.approverType === 'Other'
    );
    const distinctPositions = new Set(
      otherRecords.map(r => r.positionNumber).filter(Boolean)
    );
    return distinctPositions.size;
  }, [state.queryResults]);

  /* ==============================================
     Context Value
     ============================================== */

  const contextValue: SmartFormContextType = useMemo(
    () => ({
      state,
      runQuery,
      refreshQuery,
      setActiveSubTab,
      prepareSubmissions,
      openBrowser,
      processApprovals,
      pauseApprovals,
      resumeApprovals,
      submitPositionData,
      submitJobData,
      resetManagerWorkflow,
      isWorkflowPaused,
      createPositionRecords,
      processOtherApprovals,
      resetOtherWorkflow,
      filteredRecords,
      distinctPositionCount,
      preparedPositionData,
      preparedJobData,
    }),
    [
      state,
      runQuery,
      refreshQuery,
      setActiveSubTab,
      prepareSubmissions,
      openBrowser,
      processApprovals,
      pauseApprovals,
      resumeApprovals,
      submitPositionData,
      submitJobData,
      resetManagerWorkflow,
      isWorkflowPaused,
      createPositionRecords,
      processOtherApprovals,
      resetOtherWorkflow,
      filteredRecords,
      distinctPositionCount,
      preparedPositionData,
      preparedJobData,
    ]
  );

  return (
    <SmartFormContext value={contextValue}>
      {children}
    </SmartFormContext>
  );
}
