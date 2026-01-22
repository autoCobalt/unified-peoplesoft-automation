/**
 * Oracle Connection Configuration
 *
 * Configuration constants for Oracle database connections.
 * Connection strings and credentials should come from environment variables.
 */

/* ==============================================
   Timeouts
   ============================================== */

export const ORACLE_TIMEOUTS = {
  /** Connection timeout in milliseconds */
  CONNECT: 30000,
  /** Query execution timeout in milliseconds */
  QUERY: 60000,
  /** Connection pool acquire timeout */
  POOL_ACQUIRE: 10000,
};

/* ==============================================
   Connection Pool Settings
   ============================================== */

export const POOL_CONFIG = {
  /** Minimum connections in pool */
  MIN: 2,
  /** Maximum connections in pool */
  MAX: 10,
  /** Increment when pool needs to grow */
  INCREMENT: 1,
};

/* ==============================================
   Path Configuration
   ============================================== */

/**
 * Get the path to SQL files directory
 * Note: This resolves relative to the compiled output in development
 */
export function getSqlDirectory(): string {
  // In Vite middleware, we're running from project root
  return 'src/server/sql';
}
