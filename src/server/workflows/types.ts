/**
 * Server-Side Workflow Types
 *
 * Types for workflow state management on the server.
 * State types are internal; WorkflowStatusResponse (including results.transactionResults)
 * is exposed via the HTTP status polling endpoint.
 */

/* ==============================================
   Workflow Status Types
   ============================================== */

/** Status of a workflow execution */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';

/** Raw progress information from server (unprocessed) */
export interface RawWorkflowProgress {
  current: number;
  total: number;
  /** Current item being processed (for display) */
  currentItem?: string;
}

/* ==============================================
   Manager Workflow Types
   ============================================== */

/** Server-side Manager workflow state */
export interface ManagerWorkflowState {
  status: WorkflowStatus;
  /** Current step being executed */
  currentStep: 'idle' | 'preparing' | 'approving' | 'submitting' | 'completed';
  /** Progress within current step (if applicable) */
  progress: RawWorkflowProgress | null;
  /** Error message if status is 'error' */
  error: string | null;
  /** Whether the workflow is currently paused (pauses between transactions) */
  isPaused: boolean;
  /** Results from completed steps */
  results: {
    preparedCount?: number;
    approvedCount?: number;
    skippedCount?: number;
    submittedCount?: number;
    transactionResults?: Record<string, 'approved' | 'skipped' | 'error'>;
    /** Why the workflow was paused (browser-closed, tab-switch, or undefined for manual) */
    pauseReason?: string;
  };
}

/** Initial state for Manager workflow */
export const INITIAL_MANAGER_STATE: ManagerWorkflowState = {
  status: 'idle',
  currentStep: 'idle',
  progress: null,
  error: null,
  isPaused: false,
  results: {},
};

/* ==============================================
   Other Workflow Types
   ============================================== */

/** Server-side Other workflow state */
export interface OtherWorkflowState {
  status: WorkflowStatus;
  currentStep: 'idle' | 'approving' | 'completed';
  progress: RawWorkflowProgress | null;
  error: string | null;
  /** Whether the workflow is currently paused (pauses between transactions) */
  isPaused: boolean;
  results: {
    approvedCount?: number;
    skippedCount?: number;
    transactionResults?: Record<string, 'approved' | 'skipped' | 'error'>;
    /** Why the workflow was paused (browser-closed, tab-switch, or undefined for manual) */
    pauseReason?: string;
  };
}

/** Initial state for Other workflow */
export const INITIAL_OTHER_STATE: OtherWorkflowState = {
  status: 'idle',
  currentStep: 'idle',
  progress: null,
  error: null,
  isPaused: false,
  results: {},
};

/* ==============================================
   API Response Types
   ============================================== */

/** Response from workflow status endpoint */
export interface WorkflowStatusResponse {
  status: WorkflowStatus;
  step: string;
  progress: RawWorkflowProgress | null;
  error: string | null;
  results?: {
    transactionResults?: Record<string, 'approved' | 'skipped' | 'error'>;
    [key: string]: unknown;
  };
}

/** Response from workflow action endpoints */
export interface WorkflowActionResponse {
  success: boolean;
  message?: string;
}
