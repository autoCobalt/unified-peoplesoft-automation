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
  createPositionRecords: () => Promise<void>;
  processOtherApprovals: () => Promise<void>;
  resetOtherWorkflow: () => void;

  // Transaction Selection (per sub-tab, default: all selected after query)
  selectedByTab: Record<SmartFormSubTab, Set<string>>;
  setTransactionSelected: (txnNbr: string, selected: boolean) => void;

  // Computed Values
  filteredRecords: SmartFormRecord[];
  distinctPositionCount: number;

  // Prepared Submission Data (persists across workflow steps and tab switches)
  preparedDeptCoData: PreparedSubmission[];
  preparedPositionData: PreparedSubmission[];
  preparedJobData: PreparedSubmission[];

  // Parsed CI Data (from pipe-delimited strings, populated on query execution)
  parsedCIData: ParsedCIData;
}

/* ==============================================
   Context Creation
   ============================================== */

export const SmartFormContext = createContext<SmartFormContextType | null>(null);
