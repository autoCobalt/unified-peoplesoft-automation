/**
 * SQL Metadata Parser Module
 *
 * Exports parser and validator functions for SQL metadata extraction.
 *
 * Usage:
 * ```typescript
 * import { parseSqlMetadata, validateSqlMetadata } from './parser';
 *
 * const metadata = parseSqlMetadata(sqlContent, 'query.sql');
 * const validation = validateSqlMetadata(sqlContent, 'query.sql', metadata);
 * ```
 */

// Parser functions
export {
  parseSqlMetadata,
  hasMetadataBlock,
  hasClosedMetadataBlock,
} from './sqlMetadataParser.js';

// Validator functions
export { validateSqlMetadata } from './sqlMetadataValidator.js';

// Internal types (for advanced usage)
export type { ParsedMetaBlock, ParserOptions } from './types.js';
