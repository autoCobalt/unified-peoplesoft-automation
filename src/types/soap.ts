/**
 * SOAP/PeopleSoft Types
 *
 * Type definitions for PeopleSoft Component Interface SOAP operations.
 * Used by the server-side SOAP service and frontend API client.
 */

/* ==============================================
   Action Types
   ============================================== */

/**
 * PeopleSoft Component Interface action types
 *
 * - CREATE: Create a new record (requires all keys)
 * - UPDATE: Update and save to database immediately
 * - UPDATEDATA: Update in memory only (batch multiple before final save)
 */
export type ActionType = 'CREATE' | 'UPDATE' | 'UPDATEDATA';

/* ==============================================
   Response Types
   ============================================== */

/**
 * Transaction result types from PeopleSoft
 */
export type TransactionType = 'OK' | 'Warning' | 'Error' | 'Unknown';

/**
 * Individual transaction result from a SOAP operation
 */
export interface Transaction {
  type: TransactionType;
  message: string;
}

/**
 * Parsed SOAP response from PeopleSoft
 */
export interface SOAPResponse {
  /** Whether the operation succeeded (notification === '1') */
  success: boolean;
  /** Raw notification value ('0' or '1') */
  notification: string;
  /** All transaction messages */
  transactions: Transaction[];
  /** Filtered error transactions */
  errors: Transaction[];
  /** Filtered warning transactions */
  warnings: Transaction[];
  /** Raw XML response for debugging */
  rawXml?: string;
}

/**
 * Result from batch submission operations
 */
export interface BatchSubmitResponse {
  /** Number of batches processed */
  batchCount: number;
  /** Results from each batch */
  results: SOAPResponse[];
  /** Aggregate summary */
  summary: {
    totalSuccess: number;
    totalErrors: number;
    totalWarnings: number;
  };
}

/* ==============================================
   Configuration Types
   ============================================== */

/**
 * PeopleSoft server configuration
 * These values come from environment variables
 */
export interface PeopleSoftConfig {
  /** Protocol (http or https) */
  protocol: 'http' | 'https';
  /** PeopleSoft web server hostname */
  server: string;
  /** Web server port */
  port: number;
  /** PeopleSoft site name (e.g., HRPRD, HRTST) */
  siteName: string;
  /** Portal name (e.g., EMPLOYEE, CUSTOMER) */
  portal: string;
  /** Node name (usually PT_LOCAL) */
  node: string;
  /** Language code for requests */
  languageCode: string;
  /** Records per batch for bulk operations */
  blockingFactor: number;
  /** Max errors before stopping batch */
  errorThreshold: number;
  /** Include debug info in SOAP requests */
  debug: boolean;
  /** Preserve blank fields in requests */
  preserveBlanks: boolean;
  /** Allow optional keys in requests */
  optionalKeys: boolean;
}

/* ==============================================
   API Types
   ============================================== */

/**
 * SOAP service connection state (server-side)
 */
export interface SOAPServiceState {
  /** Whether we have valid credentials stored */
  hasCredentials: boolean;
  /** Last successful connection time */
  lastConnectionTime: Date | null;
  /** Last error message */
  error: string | null;
}

/**
 * Error codes for SOAP operations
 */
export type SOAPErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTHENTICATION_FAILED'
  | 'SOAP_FAULT'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR'
  | 'INSECURE_PROTOCOL' // Blocks HTTP connections in production
  | 'UNAUTHORIZED'; // Session expired or invalid (from server middleware)

/**
 * SOAP operation error
 */
export interface SOAPError {
  code: SOAPErrorCode;
  message: string;
  details?: string;
  faultString?: string;
}

/**
 * Generic API response wrapper for SOAP operations
 * Follows the same pattern as OracleApiResponse
 */
export type SOAPApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: SOAPError };
