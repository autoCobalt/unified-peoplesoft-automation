/**
 * SQL Metadata Type Definitions
 *
 * Types for the SQL file management system, including:
 * - Metadata extracted from SQL file comments
 * - Three-tier source configuration (server, shared, personal)
 * - Validation result structures
 */

/* ==============================================
   Source Tier Types
   ============================================== */

/**
 * Source tier for SQL files
 *
 * - server: Built-in SQL files bundled with the app (read-only)
 * - shared: Department network directory (read/write with permissions)
 * - personal: User-specified local directory (full access)
 */
export type SqlSource = 'server' | 'shared' | 'personal';

/* ==============================================
   Metadata Types
   ============================================== */

/**
 * SQL file metadata extracted from @sql-meta comments
 *
 * All files will have valid metadata - the parser uses defaults
 * for any missing required fields:
 * - name: defaults to filename without extension
 * - description: defaults to 'No description'
 */
export interface SqlMetadata {
  /** Unique identifier (required, defaults to filename) */
  name: string;
  /** Brief summary of what the query does (required, defaults to 'No description') */
  description: string;
  /** Creator of the SQL file */
  author?: string;
  /** Semantic version (1.0.0 format) */
  version?: string;
  /** Grouping category (utility, hr, finance, etc.) */
  category?: string;
  /** Creation date (YYYY-MM-DD format) */
  created?: string;
  /** Last modified date (YYYY-MM-DD format) */
  modified?: string;
  /** Columns returned by the query */
  returns?: SqlReturnColumn[];
  /** Bind parameters expected by the query */
  params?: SqlParameter[];
  /** Searchable tags for categorization */
  tags?: string[];
  /** Additional documentation notes */
  notes?: string;
}

/**
 * Return column definition from @returns section
 *
 * Describes a column that the SQL query returns.
 */
export interface SqlReturnColumn {
  /** Column name as it appears in the result set */
  name: string;
  /** Oracle data type (VARCHAR2, NUMBER, DATE, etc.) */
  type: string;
  /** Description of what the column contains */
  description?: string;
  /**
   * Format specification for the column value
   *
   * For DATE columns: 'DD-MMM-YY' (Oracle default), or named format 'oracle-date'
   * For NUMBER columns: 'integer', 'currency', '2dp', '4dp', 'percentage'
   *
   * @example
   * - HIRE_DATE: DATE [DD-MMM-YY] - Employee hire date
   * - AMOUNT: NUMBER [currency] - Transaction amount
   */
  format?: string;
}

/**
 * Bind parameter definition from @params section
 *
 * Describes a bind variable expected by the SQL query.
 */
export interface SqlParameter {
  /** Parameter name (without the leading colon) */
  name: string;
  /** Expected data type (NUMBER, STRING, DATE, etc.) */
  type: string;
  /** Whether this parameter must be provided */
  required: boolean;
  /** Description of what the parameter is used for */
  description?: string;
  /** Default value if not provided (for optional params) */
  defaultValue?: string;
}

/* ==============================================
   File Info Types
   ============================================== */

/**
 * A SQL file with its source and metadata
 *
 * Represents a fully-resolved SQL file ready for display or execution.
 */
export interface SqlFileInfo {
  /** Just the filename (e.g., 'query.sql') */
  filename: string;
  /** Full path to the file */
  path: string;
  /** Which tier this file came from */
  source: SqlSource;
  /** Parsed metadata (always present, may use defaults) */
  metadata: SqlMetadata;
}

/**
 * Configuration status for a SQL directory source
 *
 * Used to report the status of each tier in the UI.
 */
export interface SqlSourceConfig {
  /** Which tier this config is for */
  source: SqlSource;
  /** Configured path for this source */
  path: string;
  /** Whether the path exists and is accessible */
  isAvailable: boolean;
  /** Number of SQL files found (if available) */
  fileCount?: number;
  /** Error message if not available */
  error?: string;
}

/* ==============================================
   Validation Types
   ============================================== */

/**
 * Severity levels for validation issues
 *
 * - error: Prevents proper functioning, must be fixed
 * - warning: Should be fixed but won't break functionality
 * - info: Suggestions for improvement
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * A single validation issue found in SQL metadata
 *
 * Provides enough context for a UI to display helpful error messages.
 */
export interface ValidationIssue {
  /** Unique issue code for programmatic handling */
  code: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Which field has the issue (null for file-level issues) */
  field: string | null;
  /** Human-readable message describing the issue */
  message: string;
  /** Current value that caused the issue (if applicable) */
  currentValue?: string;
  /** Suggested correction (if available) */
  suggestion?: string;
  /** Line number in the SQL file where issue occurs (if determinable) */
  lineNumber?: number;
}

/**
 * Complete validation result for a SQL file
 *
 * Contains all issues found plus summary counts for UI display.
 */
export interface ValidationResult {
  /** The filename that was validated */
  filename: string;
  /** Whether the metadata is valid (no errors, warnings are OK) */
  isValid: boolean;
  /** Count of each severity level */
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  /** All issues found */
  issues: ValidationIssue[];
  /** Suggestions for improving the metadata */
  recommendations: string[];
}
