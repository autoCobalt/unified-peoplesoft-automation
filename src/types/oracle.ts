/**
 * Oracle Query Types
 *
 * Type definitions for Oracle SQL query execution.
 * Used by both server-side query execution and frontend API client.
 */

/* ==============================================
   Query Identifiers
   ============================================== */

/**
 * Available Oracle query identifiers
 *
 * Each query corresponds to a SQL file in src/server/sql/
 * Add new query IDs here when creating new SQL files.
 */
export type OracleQueryId =
  | 'connection-test'
  | 'smartform-pending-transactions';

/* ==============================================
   Query Request/Response Types
   ============================================== */

/**
 * Parameters that can be passed to a query
 * Keys are parameter names, values are their values
 */
export type QueryParameters = Record<string, string | number | boolean | null>;

/**
 * Request to execute an Oracle query
 */
export interface OracleQueryRequest {
  /** Query identifier - maps to a SQL file */
  queryId: OracleQueryId;
  /** Optional parameters to bind to the query */
  parameters?: QueryParameters;
}

/**
 * A single row from a query result
 * Keys are column names, values are the cell data
 */
export type QueryResultRow = Record<string, unknown>;

/**
 * Successful query result
 */
export interface OracleQueryResult<TRow = QueryResultRow> {
  /** The rows returned by the query */
  rows: TRow[];
  /** Number of rows returned */
  rowCount: number;
  /** Columns in the result set */
  columns: string[];
  /** Query execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Oracle query error codes
 */
export type OracleErrorCode =
  | 'NOT_CONNECTED'
  | 'QUERY_NOT_FOUND'
  | 'QUERY_PARSE_ERROR'
  | 'QUERY_EXECUTION_ERROR'
  | 'INVALID_PARAMETERS'
  | 'TIMEOUT'
  | 'CONNECTION_LOST'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'; // Session expired or invalid (from server middleware)

/**
 * Oracle query error response
 */
export interface OracleQueryError {
  code: OracleErrorCode;
  message: string;
  details?: string;
  /** Oracle error number if available (e.g., ORA-00942) */
  oraErrorCode?: string;
}

/**
 * Generic API response wrapper for Oracle queries
 * Follows the same pattern as workflowApi
 */
export type OracleApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: OracleQueryError };

/* ==============================================
   SmartForm-Specific Query Types
   ============================================== */

/**
 * Raw row type from the SmartForm pending transactions query.
 *
 * Required fields (14 total):
 * - TRANSACTION_NBR: string - Unique transaction identifier
 * - MGR_CUR: number - Manager flag (1 = Manager, 0 = Other)
 * - EMPLID: string - Employee ID
 * - EMPL_RCD: number - Employee record number
 * - EMPLOYEE_NAME: string - Full employee name
 * - NEW_EFFDT: string - New effective date (Oracle date, DD-MMM-YY)
 * - CUR_EFFDT: string - Current effective date (Oracle date, DD-MMM-YY)
 * - CUR_POS: string - Current position number
 * - POSITION_CREATE_CI: string | null - Position Create CI flag
 * - POSITION_UPDATE_CI: string | null - Position Update CI flag
 * - JOB_UPDATE_CI: string | null - Job Update CI flag
 * - DEPT_CO_UPDATE_CI: string | null - Dept/Co Update CI flag
 * - FIELD_DIFFERENCES: string | null - Field differences description
 * - WEB_LINK: string - Full URL for transaction hyperlink
 */
export interface SmartFormQueryRow {
  /** Unique transaction identifier */
  TRANSACTION_NBR: string;
  /** Manager current flag: 1 = Manager queue, 0 = Other queue */
  MGR_CUR: number;
  /** Employee ID */
  EMPLID: string;
  /** Employee record number */
  EMPL_RCD: number;
  /** Employee full name */
  EMPLOYEE_NAME: string;
  /** New effective date (Oracle date format, DD-MMM-YY) */
  NEW_EFFDT: string;
  /** Current effective date (Oracle date format, DD-MMM-YY) */
  CUR_EFFDT: string;
  /** Current position number */
  CUR_POS: string;
  /** Position Create CI flag (nullable) */
  POSITION_CREATE_CI: string | null;
  /** Position Update CI flag (nullable) */
  POSITION_UPDATE_CI: string | null;
  /** Job Update CI flag (nullable) */
  JOB_UPDATE_CI: string | null;
  /** Dept/Co Update CI flag (nullable) */
  DEPT_CO_UPDATE_CI: string | null;
  /** Field differences description (nullable) */
  FIELD_DIFFERENCES: string | null;
  /** Full URL for the transaction hyperlink */
  WEB_LINK: string;
  /** Allow any additional Oracle columns */
  [key: string]: unknown;
}

/* ==============================================
   Query Configuration
   ============================================== */

/**
 * Query configuration metadata
 * Used by the server to locate and execute queries
 */
export interface QueryConfig {
  /** SQL filename (without path) */
  filename: string;
  /** Human-readable description */
  description: string;
  /** Expected parameters */
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    description?: string;
  }[];
}

/**
 * Registry of all available queries
 */
export type QueryRegistry = Record<OracleQueryId, QueryConfig>;
