/**
 * SmartForm Types
 *
 * Type definitions for the SmartForm feature, including:
 * - Transaction records and query results
 * - Sub-tab navigation
 * - Workflow state machines for Manager and Other approval processes
 * - CI submission records with status tracking
 */

/* ==============================================
   Record Types
   ============================================== */

/** Status of an individual SmartForm record */
export type SmartFormRecordStatus = 'pending' | 'processing' | 'success' | 'error';

/** Individual SmartForm transaction record */
export interface SmartFormRecord {
  /** Unique identifier for the record */
  id: string;
  /** Transaction identifier (e.g., TXN001) */
  transaction: string;
  /** Employee ID */
  emplid: string;
  /** Employee full name */
  employeeName: string;
  /** Current effective date in YYYY-MM-DD format */
  currentEffdt: string;
  /** New effective date in YYYY-MM-DD format */
  newEffdt: string;
  /** Approver type: determines which sub-tab the record belongs to */
  approverType: 'Manager' | 'Other';
  /** Current processing status */
  status: SmartFormRecordStatus;
  /** Position number (used for Other workflow) */
  positionNumber?: string;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/* ==============================================
   Query Result Types
   ============================================== */

/** Results from SmartForm query execution */
export interface SmartFormQueryResult {
  /** Total count of pending transactions */
  totalCount: number;
  /** Count of Manager approval transactions */
  managerCount: number;
  /** Count of Other approval transactions */
  otherCount: number;
  /** All transaction records */
  transactions: SmartFormRecord[];
  /** Timestamp when query was executed */
  queriedAt: Date;
}

/* ==============================================
   Sub-Tab Types
   ============================================== */

/** SmartForm sub-tab identifiers */
export type SmartFormSubTab = 'manager' | 'other';

/** Sub-tab configuration */
export interface SmartFormSubTabConfig {
  id: SmartFormSubTab;
  label: string;
  countKey: keyof Pick<SmartFormQueryResult, 'managerCount' | 'otherCount'>;
}

/** Sub-tab definitions - single source of truth */
export const SMARTFORM_SUBTABS = [
  { id: 'manager', label: 'Manager', countKey: 'managerCount' },
  { id: 'other', label: 'Other', countKey: 'otherCount' },
] as const satisfies readonly SmartFormSubTabConfig[];

/* ==============================================
   CI Submission Types
   ============================================== */

/** Status of a prepared CI submission */
export type PreparedSubmissionStatus = 'pending' | 'submitting' | 'success' | 'error';

/** Prepared Component Interface submission record */
export interface PreparedSubmission {
  /** Unique identifier */
  id: string;
  /** Employee ID */
  emplid: string;
  /** Employee name for display */
  employeeName: string;
  /** CI type being submitted */
  ciType: 'CI_POSITION_DATA' | 'CI_JOB_DATA';
  /** Current submission status */
  status: PreparedSubmissionStatus;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Payload to be submitted (JSON string) */
  payload?: string;
}

/* ==============================================
   Manager Workflow State Machine
   ============================================== */

/**
 * Manager workflow step - discriminated union
 *
 * The Manager workflow follows these steps:
 * 1. idle → preparing (Prepare CI submissions)
 * 2. prepared (Shows prepared submission tables)
 * 3. browser-opening → browser-open (Launch browser)
 * 4. approving (Process approvals via automation)
 * 5. approved
 * 6. submitting-position (Submit CI_POSITION_DATA)
 * 7. submitting-job (Submit CI_JOB_DATA)
 * 8. complete
 *
 * Can transition to 'error' from any step.
 */
export type ManagerWorkflowStep =
  | { step: 'idle' }
  | { step: 'preparing'; ciType: 'position' | 'job' }
  | { step: 'prepared'; positionData: PreparedSubmission[]; jobData: PreparedSubmission[] }
  | { step: 'browser-opening' }
  | { step: 'browser-open' }
  | { step: 'approving'; current: number; total: number }
  | { step: 'approved' }
  | { step: 'submitting-position'; current: number; total: number }
  | { step: 'submitting-job'; current: number; total: number }
  | { step: 'complete' }
  | { step: 'error'; message: string };

/** Extract just the step name for simpler checks */
export type ManagerWorkflowStepName = ManagerWorkflowStep['step'];

/* ==============================================
   Other Workflow State Machine
   ============================================== */

/**
 * Other workflow step - discriminated union
 *
 * The Other workflow has two phases:
 * Phase 1: Position creation
 * 1. idle → creating-positions (Create position records)
 * 2. positions-created
 *
 * Phase 2: Approval processing (if positions remain after refresh)
 * 3. browser-opening → browser-open
 * 4. approving
 * 5. complete
 */
export type OtherWorkflowStep =
  | { step: 'idle' }
  | { step: 'creating-positions'; current: number; total: number }
  | { step: 'positions-created'; count: number }
  | { step: 'browser-opening' }
  | { step: 'browser-open' }
  | { step: 'approving'; current: number; total: number }
  | { step: 'approved' }
  | { step: 'complete' }
  | { step: 'error'; message: string };

/** Extract just the step name for simpler checks */
export type OtherWorkflowStepName = OtherWorkflowStep['step'];

/* ==============================================
   Context State Type
   ============================================== */

/**
 * Full SmartForm state shape
 *
 * Stored in SmartFormContext, this represents all state
 * needed for the SmartForm panel and its sections.
 */
export interface SmartFormState {
  /** Whether a query has been executed at least once */
  hasQueried: boolean;
  /** Whether a query is currently running */
  isLoading: boolean;
  /** Results from the most recent query */
  queryResults: SmartFormQueryResult | null;
  /** Currently active sub-tab */
  activeSubTab: SmartFormSubTab;
  /** Manager workflow current step */
  managerWorkflow: ManagerWorkflowStep;
  /** Other workflow current step */
  otherWorkflow: OtherWorkflowStep;
}

/* ==============================================
   Initial/Default States
   ============================================== */

/** Initial state for Manager workflow */
export const INITIAL_MANAGER_WORKFLOW: ManagerWorkflowStep = { step: 'idle' };

/** Initial state for Other workflow */
export const INITIAL_OTHER_WORKFLOW: OtherWorkflowStep = { step: 'idle' };

/** Initial SmartForm state */
export const INITIAL_SMARTFORM_STATE: SmartFormState = {
  hasQueried: false,
  isLoading: false,
  queryResults: null,
  activeSubTab: 'manager',
  managerWorkflow: INITIAL_MANAGER_WORKFLOW,
  otherWorkflow: INITIAL_OTHER_WORKFLOW,
};
