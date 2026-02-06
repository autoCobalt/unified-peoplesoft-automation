/**
 * SQL Module
 *
 * Central module for SQL file management:
 * - Query registry for Oracle queries
 * - Metadata parser and validator
 * - Directory service for three-tier SQL system
 * - HTTP handlers for SQL API endpoints
 */

import type { OracleQueryId, QueryConfig, QueryRegistry } from '../../types/oracle.js';

/* ==============================================
   Query Registry
   ============================================== */

/**
 * Registry of all available Oracle queries
 *
 * When adding a new query:
 * 1. Add the query ID to OracleQueryId in src/types/oracle.ts
 * 2. Create the SQL file in src/server/sql/server/ (local, untracked)
 *    or src/server/sql/bundled/ (tracked, safe for GitHub)
 * 3. Add the entry to this registry
 */
export const QUERY_REGISTRY: QueryRegistry = {
  'connection-test': {
    filename: 'connection-test.sql',
    description: 'Simple DUAL query to verify Oracle connectivity',
    parameters: [], // No parameters - uses constants only
  },
  'smartform-pending-transactions': {
    filename: 'smartform-pending-transactions.sql',
    description: 'Retrieves pending CI transactions awaiting approval',
    parameters: [], // No parameters for this query
  },
};

/**
 * Get query configuration by ID
 * Returns undefined if query doesn't exist
 */
export function getQueryConfig(queryId: OracleQueryId): QueryConfig | undefined {
  return QUERY_REGISTRY[queryId];
}

/**
 * Check if a query ID exists in the registry
 */
export function isValidQueryId(queryId: string): queryId is OracleQueryId {
  return Object.hasOwn(QUERY_REGISTRY, queryId);
}

/**
 * Get all available query IDs
 */
export function getAvailableQueryIds(): OracleQueryId[] {
  return Object.keys(QUERY_REGISTRY) as OracleQueryId[];
}

/* ==============================================
   Re-exports
   ============================================== */

// Parser and validator
export {
  parseSqlMetadata,
  validateSqlMetadata,
  hasMetadataBlock,
  hasClosedMetadataBlock,
} from './parser/index.js';

// Directory service
export {
  getServerSqlFiles,
  getSharedSqlFiles,
  getPersonalSqlFiles,
  getExampleSqlFiles,
  getSqlSourceStatus,
  getSqlFile,
  getSqlFileContent,
  validateSqlDirectory,
  parseMetadataFromContent,
} from './sqlDirectoryService.js';

