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

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { SmartFormContext, type SmartFormContextType } from './smartFormContextDef';
import type {
  SmartFormState,
  SmartFormSubTab,
  SmartFormRecord,
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

/* ==============================================
   Mock Data (Development)
   ============================================== */

const MOCK_RECORDS: SmartFormRecord[] = [
  {
    id: '1',
    transaction: 'TXN001',
    emplid: '12345',
    employeeName: 'John Doe',
    currentEffdt: '2025-01-01',
    newEffdt: '2025-02-01',
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS001',
  },
  {
    id: '2',
    transaction: 'TXN002',
    emplid: '12346',
    employeeName: 'Jane Smith',
    currentEffdt: '2025-01-15',
    newEffdt: '2025-01-15', // Date match scenario
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS002',
  },
  {
    id: '3',
    transaction: 'TXN003',
    emplid: '12347',
    employeeName: 'Bob Johnson',
    currentEffdt: '2025-01-10',
    newEffdt: '2025-03-01',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS003',
  },
  {
    id: '4',
    transaction: 'TXN004',
    emplid: '12348',
    employeeName: 'Alice Williams',
    currentEffdt: '2025-02-01',
    newEffdt: '2025-02-15',
    approverType: 'Manager',
    status: 'pending',
    positionNumber: 'POS004',
  },
  {
    id: '5',
    transaction: 'TXN005',
    emplid: '12349',
    employeeName: 'Charlie Brown',
    currentEffdt: '2025-01-20',
    newEffdt: '2025-04-01',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS005',
  },
  {
    id: '6',
    transaction: 'TXN006',
    emplid: '12350',
    employeeName: 'Diana Prince',
    currentEffdt: '2025-03-01',
    newEffdt: '2025-03-15',
    approverType: 'Other',
    status: 'pending',
    positionNumber: 'POS003', // Duplicate position number for testing
  },
];

/**
 * Generate mock query results
 * In production, this would be replaced with actual Oracle API calls
 */
function generateMockQueryResults(): SmartFormQueryResult {
  const managerCount = MOCK_RECORDS.filter(r => r.approverType === 'Manager').length;
  const otherCount = MOCK_RECORDS.filter(r => r.approverType === 'Other').length;

  return {
    totalCount: MOCK_RECORDS.length,
    managerCount,
    otherCount,
    transactions: MOCK_RECORDS,
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

  // Prepared submission storage (separate from workflow state for cleaner updates)
  const [preparedPositionData, setPreparedPositionData] = useState<PreparedSubmission[]>([]);
  const [preparedJobData, setPreparedJobData] = useState<PreparedSubmission[]>([]);

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

  const openBrowser = useCallback(async () => {
    setManagerWorkflow({ step: 'browser-opening' });

    // Simulate browser launch delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // TODO: Integrate with Playwright browser launch
    setManagerWorkflow({ step: 'browser-open' });
  }, [setManagerWorkflow]);

  const processApprovals = useCallback(async () => {
    const managerRecords = state.queryResults?.transactions.filter(
      r => r.approverType === 'Manager'
    ) ?? [];

    const total = managerRecords.length;

    for (let i = 0; i < total; i++) {
      setManagerWorkflow({ step: 'approving', current: i + 1, total });
      // Simulate approval processing
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setManagerWorkflow({ step: 'approved' });
  }, [state.queryResults, setManagerWorkflow]);

  const submitPositionData = useCallback(async () => {
    const total = preparedPositionData.length;

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

      // Mark as success (or error in real implementation)
      setPreparedPositionData(prev =>
        prev.map((sub, idx) =>
          idx === i ? { ...sub, status: 'success' } : sub
        )
      );
    }

    // Position submission complete - step stays at 'submitting-position' with current === total
    // Component checks progress to determine if actively processing vs ready for next action
  }, [preparedPositionData, setManagerWorkflow]);

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
    setManagerWorkflow(INITIAL_MANAGER_WORKFLOW);
    setPreparedPositionData([]);
    setPreparedJobData([]);
  }, [setManagerWorkflow]);

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
    setOtherWorkflow({ step: 'browser-opening' });
    await new Promise(resolve => setTimeout(resolve, 1500));

    setOtherWorkflow({ step: 'browser-open' });
    await new Promise(resolve => setTimeout(resolve, 500));

    const otherRecords = state.queryResults?.transactions.filter(
      r => r.approverType === 'Other'
    ) ?? [];

    const total = otherRecords.length;

    for (let i = 0; i < total; i++) {
      setOtherWorkflow({ step: 'approving', current: i + 1, total });
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setOtherWorkflow({ step: 'approved' });
    await new Promise(resolve => setTimeout(resolve, 300));
    setOtherWorkflow({ step: 'complete' });
  }, [state.queryResults, setOtherWorkflow]);

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

  const managerRecords = useMemo(() => {
    // Return prepared submissions for manager workflow display
    return preparedPositionData;
  }, [preparedPositionData]);

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

  const getStepProgress = useCallback(
    (workflow: 'manager' | 'other'): { current: number; total: number } | null => {
      const step = workflow === 'manager' ? state.managerWorkflow : state.otherWorkflow;

      if ('current' in step && 'total' in step) {
        return { current: step.current, total: step.total };
      }
      return null;
    },
    [state.managerWorkflow, state.otherWorkflow]
  );

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
      submitPositionData,
      submitJobData,
      resetManagerWorkflow,
      createPositionRecords,
      processOtherApprovals,
      resetOtherWorkflow,
      filteredRecords,
      managerRecords,
      distinctPositionCount,
      getStepProgress,
    }),
    [
      state,
      runQuery,
      refreshQuery,
      setActiveSubTab,
      prepareSubmissions,
      openBrowser,
      processApprovals,
      submitPositionData,
      submitJobData,
      resetManagerWorkflow,
      createPositionRecords,
      processOtherApprovals,
      resetOtherWorkflow,
      filteredRecords,
      managerRecords,
      distinctPositionCount,
      getStepProgress,
    ]
  );

  return (
    <SmartFormContext value={contextValue}>
      {children}
    </SmartFormContext>
  );
}
