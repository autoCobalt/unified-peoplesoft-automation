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
  prepareSubmissions: () => Promise<void>;
  openBrowser: () => Promise<void>;
  processApprovals: () => Promise<void>;
  submitPositionData: () => Promise<void>;
  submitJobData: () => Promise<void>;
  resetManagerWorkflow: () => void;

  // Other Workflow Actions
  createPositionRecords: () => Promise<void>;
  processOtherApprovals: () => Promise<void>;
  resetOtherWorkflow: () => void;

  // Computed Values
  filteredRecords: SmartFormRecord[];
  distinctPositionCount: number;

  // Prepared Submission Data (persists across workflow steps and tab switches)
  preparedPositionData: PreparedSubmission[];
  preparedJobData: PreparedSubmission[];

  // Utility
  getStepProgress: (workflow: 'manager' | 'other') => { current: number; total: number } | null;
}

/* ==============================================
   Context Creation
   ============================================== */

export const SmartFormContext = createContext<SmartFormContextType | null>(null);
