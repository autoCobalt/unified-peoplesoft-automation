/**
 * SQL Query Registry
 *
 * Maps query identifiers to their SQL files and metadata.
 * This is the single source of truth for available queries.
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
 * 2. Create the SQL file in this folder
 * 3. Add the entry to this registry
 */
export const QUERY_REGISTRY: QueryRegistry = {
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
