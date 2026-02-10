/**
 * SmartForm Types
 *
 * Type definitions for the SmartForm feature, including:
 * - Transaction records and query results (supports dynamic Oracle columns)
 * - Sub-tab navigation
 * - Workflow state machines for Manager and Other approval processes
 * - CI submission records with status tracking
 * - Parsed CI data from pipe-delimited strings
 */

import type { ParsedCIData } from '../server/ci-definitions/types.js';

/* ==============================================
   Record Types
   ============================================== */

/** Status of an individual SmartForm record */
export type SmartFormRecordStatus = 'pending' | 'processing' | 'success' | 'skipped' | 'error';

/**
 * SmartForm transaction record with dynamic Oracle columns.
 *
 * Required fields:
 * - MGR_CUR: Numeric flag (1 = Manager, 0 = Other) for filtering
 * - WEB_LINK: Full URL for transaction hyperlink (hidden from display)
 * - TRANSACTION_NBR: Transaction identifier (displayed as hyperlink)
 * - EMPLID: Employee ID
 * - EMPLOYEE_NAME: Employee full name
 *
 * All other Oracle columns are passed through dynamically.
 * Field names use Oracle convention (UPPER_SNAKE_CASE).
 */
export interface SmartFormRecord {
  /** Manager current flag: 1 = Manager queue, 0 = Other queue */
  MGR_CUR: 0 | 1;
  /** Full URL for the transaction hyperlink (hidden from table display) */
  WEB_LINK: string;
  /** Transaction number - displayed as clickable hyperlink */
  TRANSACTION_NBR: string;
  /** Employee ID (typically displayed with monospace font) */
  EMPLID: string;
  /** Employee full name (guaranteed field from Oracle) */
  EMPLOYEE_NAME: string;
  /** Current processing status (added client-side for workflow tracking) */
  status: SmartFormRecordStatus;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Additional dynamic fields from Oracle query */
  [key: string]: unknown;
}

/**
 * Fields that are hidden from table display but used for logic/linking.
 */
export const HIDDEN_SMARTFORM_FIELDS = [
  'MGR_CUR', 'WEB_LINK', 'status', 'errorMessage',
  'POSITION_CREATE_CI', 'POSITION_UPDATE_CI', 'JOB_UPDATE_CI', 'DEPT_CO_UPDATE_CI',
] as const;

/**
 * Fields that should use monospace font.
 */
export const MONOSPACE_SMARTFORM_FIELDS = ['EMPLID', 'TRANSACTION_NBR', 'CUR_POS'] as const;

/**
 * Fields that contain dates (will be formatted as MM/DD/YYYY).
 */
export const DATE_SMARTFORM_FIELDS = ['NEW_EFFDT', 'CUR_EFFDT'] as const;

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
  ciType: 'CI_POSITION_DATA' | 'CI_JOB_DATA' | 'DEPARTMENT_TBL';
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
 * 1. idle → approving (Process approvals via browser automation)
 * 2. approved
 * 3. submitting-dept-co (Submit DEPARTMENT_TBL — auto-skipped if none)
 * 4. submitting-position (Submit CI_POSITION_DATA)
 * 5. submitting-job (Submit CI_JOB_DATA)
 * 6. complete
 *
 * CI data is auto-parsed on query execution — no manual prepare step needed.
 * Can transition to 'error' from any step.
 */
export type ManagerWorkflowStep =
  | { step: 'idle' }
  | { step: 'approving'; current: number; total: number; currentItem?: string }
  | { step: 'approved' }
  | { step: 'submitting-dept-co'; current: number; total: number }
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
 * The Other workflow follows these steps:
 * 1. idle → submitting-dept-co (Submit DEPARTMENT_TBL — auto-skipped if none)
 * 2. submitting-position-create (Submit POSITION_CREATE_CI)
 * 3. submissions-complete (waiting for approval trigger)
 * 4. approving (Process approvals via browser automation)
 * 5. approved
 * 6. complete
 *
 * CI data is auto-parsed on query execution — no manual prepare step needed.
 * Can transition to 'error' from any step.
 */
export type OtherWorkflowStep =
  | { step: 'idle' }
  | { step: 'submitting-dept-co'; current: number; total: number }
  | { step: 'submitting-position-create'; current: number; total: number }
  | { step: 'submissions-complete' }
  | { step: 'approving'; current: number; total: number; currentItem?: string }
  | { step: 'approved' }
  | { step: 'complete' }
  | { step: 'error'; message: string };

/** Extract just the step name for simpler checks */
export type OtherWorkflowStepName = OtherWorkflowStep['step'];

/* ==============================================
   Initial/Default States
   ============================================== */

/** Initial state for Manager workflow */
export const INITIAL_MANAGER_WORKFLOW: ManagerWorkflowStep = { step: 'idle' };

/** Initial state for Other workflow */
export const INITIAL_OTHER_WORKFLOW: OtherWorkflowStep = { step: 'idle' };

/** Initial empty parsed CI data */
export const INITIAL_PARSED_CI_DATA: ParsedCIData = {
  positionCreate: [],
  positionUpdate: [],
  jobUpdate: [],
  deptCoUpdate: [],
};

