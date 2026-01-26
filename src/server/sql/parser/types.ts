/**
 * Parser-Specific Internal Types
 *
 * These types are used internally by the parser module and are not
 * exported to the rest of the application. Public types are in
 * src/types/sqlMetadata.ts.
 */

/**
 * Raw parsed section from @sql-meta block
 *
 * Represents the intermediate state before validation.
 */
export interface ParsedMetaBlock {
  /** Raw key-value pairs from YAML-like syntax */
  fields: Map<string, string>;
  /** Raw @returns section lines */
  returnsLines: string[];
  /** Raw @params section lines */
  paramsLines: string[];
  /** Raw @tags section lines */
  tagsLines: string[];
  /** Raw @notes section content */
  notesContent: string;
}

/**
 * Parser configuration options
 */
export interface ParserOptions {
  /** Whether to include line numbers in validation issues */
  includeLineNumbers?: boolean;
  /** Custom default values for missing fields */
  defaults?: Partial<{
    description: string;
    category: string;
  }>;
}
