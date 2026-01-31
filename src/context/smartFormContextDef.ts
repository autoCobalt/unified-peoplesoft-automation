/**
 * SmartForm Context Definition
 *
 * Separated from SmartFormContext.tsx for fast refresh compatibility.
 * Contains only types and createContext - no state or hooks.
 */

import { createContext } from 'react';
import type {
  SmartFormState,
  SmartFormSubTab,
  SmartFormRecord,
  PreparedSubmission,
} from '../types';
import type { ParsedCIData } from '../server/ci-definitions/types';

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
   Context Type Definition
   ============================================== */

export interface SmartFormContextType {
  // State
  state: SmartFormState;

  // Query Actions
  runQuery: () => Promise<void>;
  refreshQuery: () => Promise<void>;

  // Sub-tab Navigation
  setActiveSubTab: (tab: SmartFormSubTab) => void;

  // Manager Workflow Actions
  openBrowser: () => Promise<void>;
  processApprovals: () => Promise<void>;
  pauseApprovals: () => Promise<void>;
  resumeApprovals: () => Promise<void>;
  submitDeptCoData: () => Promise<void>;
  submitPositionData: () => Promise<void>;
  submitJobData: () => Promise<void>;
  resetManagerWorkflow: () => void;

  // Manager Workflow State (from polling)
  isWorkflowPaused: boolean;

  // Other Workflow Actions
  submitOtherDeptCoData: () => Promise<void>;
  submitPositionCreateData: () => Promise<void>;
  openOtherBrowser: () => Promise<void>;
  pauseOtherApprovals: () => Promise<void>;
  resumeOtherApprovals: () => Promise<void>;
  resetOtherWorkflow: () => void;

  // Other Workflow State (from polling)
  isOtherWorkflowPaused: boolean;

  // Transaction Selection (per sub-tab, default: all selected after query)
  selectedByTab: Record<SmartFormSubTab, Set<string>>;
  setTransactionSelected: (txnNbr: string, selected: boolean) => void;

  // Computed Values
  filteredRecords: SmartFormRecord[];

  // Prepared Submission Data (persists across workflow steps and tab switches)
  preparedDeptCoData: PreparedSubmission[];
  preparedPositionData: PreparedSubmission[];
  preparedJobData: PreparedSubmission[];
  preparedOtherDeptCoData: PreparedSubmission[];
  preparedPositionCreateData: PreparedSubmission[];

  // Parsed CI Data (from pipe-delimited strings, populated on query execution)
  parsedCIData: ParsedCIData;

  // Effective record counts (selected ∩ non-duplicate) for overrides and look-ahead totals
  effectiveRecordCounts: EffectiveRecordCounts;
}

/* ==============================================
   Context Creation
   ============================================== */

export const SmartFormContext = createContext<SmartFormContextType | null>(null);
