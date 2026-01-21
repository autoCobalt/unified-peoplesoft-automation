/**
 * Connection Configuration
 *
 * Static configuration for Oracle and PeopleSoft SOAP connections.
 * Values are derived from environment variables at build time.
 *
 * These are read-only configuration values, not runtime state.
 * For connection state (isConnected, credentials, etc.), see ConnectionContext.
 */

/* ==============================================
   Oracle Database Configuration
   ============================================== */

/**
 * Oracle database connection parameters.
 *
 * Environment variables:
 * - VITE_ORACLE_HOSTNAME: Database server hostname
 * - VITE_ORACLE_PORT: Listener port (default: 1521)
 * - VITE_ORACLE_SERVICE_NAME: Oracle service name
 */
export const oracleConfig = {
  hostname: (import.meta.env.VITE_ORACLE_HOSTNAME as string | undefined) ?? 'Not configured',
  port: (import.meta.env.VITE_ORACLE_PORT as string | undefined) ?? '1521',
  serviceName: (import.meta.env.VITE_ORACLE_SERVICE_NAME as string | undefined) ?? 'N/A',
} as const;

/* ==============================================
   PeopleSoft SOAP Configuration
   ============================================== */

/**
 * PeopleSoft Component Interface (CI) connection parameters.
 *
 * Environment variables:
 * - VITE_PS_PROTOCOL: HTTP protocol (default: https)
 * - VITE_PS_SERVER: PeopleSoft web server hostname
 * - VITE_PS_PORT: Web server port (default: 443)
 * - VITE_PS_SITE_NAME: PeopleSoft site name
 * - VITE_PS_PORTAL: Portal name
 * - VITE_PS_NODE: Node name for CI requests
 */
export const soapConfig = {
  protocol: (import.meta.env.VITE_PS_PROTOCOL as string | undefined) ?? 'https',
  server: (import.meta.env.VITE_PS_SERVER as string | undefined) ?? 'Not configured',
  port: (import.meta.env.VITE_PS_PORT as string | undefined) ?? '443',
  siteName: (import.meta.env.VITE_PS_SITE_NAME as string | undefined) ?? 'N/A',
  portal: (import.meta.env.VITE_PS_PORTAL as string | undefined) ?? 'N/A',
  node: (import.meta.env.VITE_PS_NODE as string | undefined) ?? 'N/A',
} as const;

/* ==============================================
   Type Exports
   ============================================== */

export type OracleConfig = typeof oracleConfig;
export type SoapConfig = typeof soapConfig;
