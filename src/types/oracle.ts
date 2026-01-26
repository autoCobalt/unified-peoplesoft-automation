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
 * This type is flexible to support dynamic Oracle columns.
 * Only the fields required for filtering and linking are explicitly typed.
 *
 * Required fields from Oracle:
 * - MGR_CUR: number (1 = Manager, 0 = Other)
 * - WEB_LINK: string (full URL for transaction hyperlink)
 * - TRANSACTION_NBR: string (transaction identifier)
 * - EMPLID: string (employee ID)
 * - EMPLOYEE_NAME: string (employee full name)
 *
 * All other columns are passed through dynamically.
 */
export interface SmartFormQueryRow {
  /** Manager current flag: 1 = Manager queue, 0 = Other queue */
  MGR_CUR: number;
  /** Full URL for the transaction hyperlink */
  WEB_LINK: string;
  /** Transaction number identifier */
  TRANSACTION_NBR: string;
  /** Employee ID */
  EMPLID: string;
  /** Employee full name */
  EMPLOYEE_NAME: string;
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
