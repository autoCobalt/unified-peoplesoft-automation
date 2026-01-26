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
 * Get the path to server SQL files directory (bundled with app)
 * Note: This resolves relative to the compiled output in development
 */
export function getSqlDirectory(): string {
  // In Vite middleware, we're running from project root
  return 'src/server/sql/server';
}

/**
 * Get the path to the examples SQL directory
 */
export function getSqlExamplesDirectory(): string {
  return 'src/server/sql/examples';
}

/**
 * SQL directory paths for all three tiers
 *
 * - server: Built-in SQL files (read-only)
 * - shared: Configurable via environment variable
 * - personal: Stored in localStorage on the client
 */
export const SQL_DIRECTORIES = {
  /** Bundled server SQL files */
  server: 'src/server/sql/server',
  /** Examples for documentation/testing */
  examples: 'src/server/sql/examples',
} as const;
