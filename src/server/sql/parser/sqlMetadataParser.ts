/**
 * SQL Metadata Parser
 *
 * Parses SQL file content and extracts metadata from @sql-meta blocks.
 *
 * LENIENT MODE: This parser always returns valid metadata:
 * - Missing @sql-meta block: uses filename as name, 'No description'
 * - Malformed fields: skipped silently
 * - Never throws errors
 *
 * For validation/error reporting, use the separate validator module.
 */

import type {
  SqlMetadata,
  SqlReturnColumn,
  SqlParameter,
} from '../../../types/sqlMetadata.js';
import type { ParsedMetaBlock } from './types.js';

/* ==============================================
   Constants
   ============================================== */

/** Regex to extract @sql-meta ... @end-sql-meta block */
const META_BLOCK_REGEX = /@sql-meta\s*([\s\S]*?)@end-sql-meta/;

/** Regex to match key: value pairs (YAML-like) */
const KEY_VALUE_REGEX = /^\s*\*?\s*([a-zA-Z_-]+):\s*(.+?)\s*$/;

/** Regex for @returns column line: - COLUMN_NAME: TYPE [format] - description */
const RETURNS_LINE_REGEX = /^\s*\*?\s*-\s*([A-Z_][A-Z0-9_]*):\s*([A-Z0-9()]+)\s*(?:\[([^\]]+)\])?\s*(?:-\s*(.+))?$/i;

/** Regex for @params line: - param_name: TYPE (required|optional) - description */
const PARAMS_LINE_REGEX = /^\s*\*?\s*-\s*([a-z_][a-z0-9_]*):\s*([A-Z0-9()]+)\s*\((\w+)\)\s*(?:-\s*(.+))?$/i;

/** Regex for @tags line: - tag_name */
const TAGS_LINE_REGEX = /^\s*\*?\s*-\s*([a-zA-Z0-9_-]+)\s*$/;

/* ==============================================
   Main Parser Function
   ============================================== */

/**
 * Parse SQL file content and extract metadata from @sql-meta block
 *
 * @param content - The full SQL file content
 * @param filename - The filename (used as fallback for name)
 * @returns SqlMetadata with all fields populated (using defaults for missing)
 */
export function parseSqlMetadata(content: string, filename: string): SqlMetadata {
  // Default metadata using filename
  const nameFromFile = filename.replace(/\.sql$/i, '');
  const defaults: SqlMetadata = {
    name: nameFromFile,
    description: 'No description',
  };

  // Try to find @sql-meta block
  const match = META_BLOCK_REGEX.exec(content);
  if (!match?.[1]) {
    // No metadata block found - return defaults
    return defaults;
  }

  // Parse the block content
  const blockContent = match[1];
  const parsed = parseMetaBlock(blockContent);

  // Build metadata from parsed content
  return buildMetadata(parsed, defaults);
}

/* ==============================================
   Block Parsing
   ============================================== */

/**
 * Parse the content inside @sql-meta block into structured sections
 */
function parseMetaBlock(blockContent: string): ParsedMetaBlock {
  const result: ParsedMetaBlock = {
    fields: new Map(),
    returnsLines: [],
    paramsLines: [],
    tagsLines: [],
    notesContent: '',
  };

  const lines = blockContent.split('\n');
  let currentSection: 'fields' | 'returns' | 'params' | 'tags' | 'notes' = 'fields';
  const notesBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comment-only lines
    if (!trimmed || trimmed === '*') {
      continue;
    }

    // Check for section markers
    if (trimmed.includes('@returns')) {
      currentSection = 'returns';
      continue;
    }
    if (trimmed.includes('@params')) {
      currentSection = 'params';
      continue;
    }
    if (trimmed.includes('@tags')) {
      currentSection = 'tags';
      continue;
    }
    if (trimmed.includes('@notes')) {
      currentSection = 'notes';
      continue;
    }

    // Process line based on current section
    switch (currentSection) {
      case 'fields': {
        const kvMatch = KEY_VALUE_REGEX.exec(trimmed);
        if (kvMatch?.[1] && kvMatch[2]) {
          result.fields.set(kvMatch[1].toLowerCase(), kvMatch[2]);
        }
        break;
      }
      case 'returns':
        result.returnsLines.push(trimmed);
        break;
      case 'params':
        result.paramsLines.push(trimmed);
        break;
      case 'tags':
        result.tagsLines.push(trimmed);
        break;
      case 'notes':
        // Strip leading * from comment lines
        notesBuffer.push(trimmed.replace(/^\*\s*/, ''));
        break;
    }
  }

  result.notesContent = notesBuffer.join(' ').trim();

  return result;
}

/* ==============================================
   Metadata Building
   ============================================== */

/**
 * Build SqlMetadata from parsed block content
 */
function buildMetadata(parsed: ParsedMetaBlock, defaults: SqlMetadata): SqlMetadata {
  const metadata: SqlMetadata = {
    name: parsed.fields.get('name') ?? defaults.name,
    description: parsed.fields.get('description') ?? defaults.description,
  };

  // Optional string fields
  const optionalFields = ['author', 'version', 'category', 'created', 'modified'] as const;
  for (const field of optionalFields) {
    const value = parsed.fields.get(field);
    if (value) {
      metadata[field] = value;
    }
  }

  // Parse @returns section
  const returns = parseReturnsSection(parsed.returnsLines);
  if (returns.length > 0) {
    metadata.returns = returns;
  }

  // Parse @params section
  const params = parseParamsSection(parsed.paramsLines);
  if (params.length > 0) {
    metadata.params = params;
  }

  // Parse @tags section
  const tags = parseTagsSection(parsed.tagsLines);
  if (tags.length > 0) {
    metadata.tags = tags;
  }

  // Add notes if present
  if (parsed.notesContent) {
    metadata.notes = parsed.notesContent;
  }

  return metadata;
}

/**
 * Parse @returns section lines into SqlReturnColumn array
 *
 * Captures: COLUMN_NAME: TYPE [format] - description
 * - Group 1: column name
 * - Group 2: data type
 * - Group 3: format specifier (optional, in brackets)
 * - Group 4: description (optional)
 */
function parseReturnsSection(lines: string[]): SqlReturnColumn[] {
  const columns: SqlReturnColumn[] = [];

  for (const line of lines) {
    const match = RETURNS_LINE_REGEX.exec(line);
    if (match?.[1] && match[2]) {
      const column: SqlReturnColumn = {
        name: match[1].toUpperCase(),
        type: match[2].toUpperCase(),
      };
      // Group 3: format specifier (optional)
      if (match[3]) {
        column.format = match[3].trim();
      }
      // Group 4: description (optional)
      if (match[4]) {
        column.description = match[4].trim();
      }
      columns.push(column);
    }
  }

  return columns;
}

/**
 * Parse @params section lines into SqlParameter array
 */
function parseParamsSection(lines: string[]): SqlParameter[] {
  const params: SqlParameter[] = [];

  for (const line of lines) {
    const match = PARAMS_LINE_REGEX.exec(line);
    if (match?.[1] && match[2] && match[3]) {
      const param: SqlParameter = {
        name: match[1].toLowerCase(),
        type: match[2].toUpperCase(),
        required: match[3].toLowerCase() === 'required',
      };
      if (match[4]) {
        param.description = match[4].trim();
      }
      params.push(param);
    }
  }

  return params;
}

/**
 * Parse @tags section lines into string array
 */
function parseTagsSection(lines: string[]): string[] {
  const tags: string[] = [];

  for (const line of lines) {
    const match = TAGS_LINE_REGEX.exec(line);
    if (match?.[1]) {
      tags.push(match[1].toLowerCase());
    }
  }

  return tags;
}

/* ==============================================
   Utility Exports
   ============================================== */

/**
 * Check if content contains a @sql-meta block
 */
export function hasMetadataBlock(content: string): boolean {
  return content.includes('@sql-meta');
}

/**
 * Check if content has a properly closed metadata block
 */
export function hasClosedMetadataBlock(content: string): boolean {
  return content.includes('@sql-meta') && content.includes('@end-sql-meta');
}
