/**
 * Connection Types
 *
 * Type definitions for Oracle and SOAP connection state management.
 * These are shared across all features that need database/API access.
 */

/* ==============================================
   Oracle Connection Types
   ============================================== */

/**
 * Oracle database credentials
 * Used for authenticating against the Oracle backend
 */
export interface OracleCredentials {
  username: string;
  password: string;
}

/**
 * Oracle connection state
 * Tracks the current status of the Oracle database connection
 */
export interface OracleConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

/* ==============================================
   SOAP Connection Types
   ============================================== */

/**
 * SOAP/PeopleSoft credentials
 * Used for authenticating against PeopleSoft web services
 */
export interface SoapCredentials {
  username: string;
  password: string;
}

/**
 * SOAP connection state
 * Tracks the current status of the PeopleSoft SOAP connection
 */
export interface SoapConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
