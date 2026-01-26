/**
 * SQL Directory Service
 *
 * Manages file listings for all three SQL tiers:
 * - Server: Built-in SQL files (always available)
 * - Shared: Department network directory (env + UI configurable)
 * - Personal: User-specified local directory (path provided by client)
 *
 * Each tier operates independently - failures in one don't affect others.
 */

import { readdir, readFile, access, constants } from 'fs/promises';
import { join, basename } from 'path';
import type {
  SqlFileInfo,
  SqlMetadata,
  SqlSource,
  SqlSourceConfig,
} from '../../types/sqlMetadata.js';
import { parseSqlMetadata } from './parser/index.js';
import { SQL_DIRECTORIES } from '../oracle/config.js';

/* ==============================================
   Constants
   ============================================== */

/** File extension for SQL files */
const SQL_EXTENSION = '.sql';

/* ==============================================
   Directory Validation
   ============================================== */

/**
 * Check if a directory path is valid and accessible
 *
 * @param dirPath - Path to check
 * @returns true if the path exists and is readable
 */
export async function validateSqlDirectory(dirPath: string): Promise<boolean> {
  if (!dirPath) {
    return false;
  }

  try {
    await access(dirPath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/* ==============================================
   File Listing Functions
   ============================================== */

/**
 * Get all SQL files from a directory with parsed metadata
 *
 * @param dirPath - Directory to scan
 * @param source - Which tier this directory represents
 * @returns Array of SqlFileInfo with parsed metadata
 */
async function getSqlFilesFromDirectory(
  dirPath: string,
  source: SqlSource
): Promise<SqlFileInfo[]> {
  const files: SqlFileInfo[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(SQL_EXTENSION)) {
        continue;
      }

      const filePath = join(dirPath, entry.name);
      const fileInfo = await parseSqlFileInfo(filePath, source);
      if (fileInfo) {
        files.push(fileInfo);
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable - return empty array
    return [];
  }

  // Sort by filename for consistent ordering
  return files.sort((a, b) => a.filename.localeCompare(b.filename));
}

/**
 * Parse a single SQL file and extract its metadata
 *
 * @param filePath - Full path to the SQL file
 * @param source - Which tier this file belongs to
 * @returns SqlFileInfo or null if file couldn't be read
 */
async function parseSqlFileInfo(
  filePath: string,
  source: SqlSource
): Promise<SqlFileInfo | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const filename = basename(filePath);
    const metadata = parseSqlMetadata(content, filename);

    return {
      filename,
      path: filePath,
      source,
      metadata,
    };
  } catch {
    return null;
  }
}

/* ==============================================
   Tier-Specific Functions
   ============================================== */

/**
 * Get all SQL files from the server directory (bundled with app)
 *
 * This tier is always available and contains curated queries.
 */
export async function getServerSqlFiles(): Promise<SqlFileInfo[]> {
  return getSqlFilesFromDirectory(SQL_DIRECTORIES.server, 'server');
}

/**
 * Get SQL files from the shared directory
 *
 * @param sharedPath - Path to the shared SQL directory
 * @returns SQL files from the shared directory (empty if not configured)
 */
export async function getSharedSqlFiles(sharedPath: string | undefined): Promise<SqlFileInfo[]> {
  if (!sharedPath) {
    return [];
  }

  return getSqlFilesFromDirectory(sharedPath, 'shared');
}

/**
 * Get SQL files from a personal directory
 *
 * @param personalPath - User-specified path to their personal SQL directory
 * @returns SQL files from the personal directory (empty if path invalid)
 */
export async function getPersonalSqlFiles(personalPath: string): Promise<SqlFileInfo[]> {
  if (!personalPath) {
    return [];
  }

  return getSqlFilesFromDirectory(personalPath, 'personal');
}

/**
 * Get SQL files from the examples directory
 *
 * Used for testing and documentation purposes.
 */
export async function getExampleSqlFiles(): Promise<SqlFileInfo[]> {
  return getSqlFilesFromDirectory(SQL_DIRECTORIES.examples, 'server');
}

/* ==============================================
   Source Configuration
   ============================================== */

/**
 * Get configuration status for all SQL directory sources
 *
 * @param sharedPath - Configured shared directory path (from env or UI)
 * @param personalPath - User's personal directory path (from client)
 * @returns Configuration status for each tier
 */
export async function getSqlSourceStatus(
  sharedPath: string | undefined,
  personalPath: string | undefined
): Promise<SqlSourceConfig[]> {
  const configs: SqlSourceConfig[] = [];

  // Server tier (always available)
  const serverAvailable = await validateSqlDirectory(SQL_DIRECTORIES.server);
  const serverFiles = serverAvailable ? await getServerSqlFiles() : [];
  configs.push({
    source: 'server',
    path: SQL_DIRECTORIES.server,
    isAvailable: serverAvailable,
    fileCount: serverFiles.length,
    error: serverAvailable ? undefined : 'Server SQL directory not found',
  });

  // Shared tier (configurable)
  if (sharedPath) {
    const sharedAvailable = await validateSqlDirectory(sharedPath);
    const sharedFiles = sharedAvailable ? await getSharedSqlFiles(sharedPath) : [];
    configs.push({
      source: 'shared',
      path: sharedPath,
      isAvailable: sharedAvailable,
      fileCount: sharedFiles.length,
      error: sharedAvailable ? undefined : 'Shared directory not accessible',
    });
  } else {
    configs.push({
      source: 'shared',
      path: '',
      isAvailable: false,
      error: 'No shared path configured',
    });
  }

  // Personal tier (user-specified)
  if (personalPath) {
    const personalAvailable = await validateSqlDirectory(personalPath);
    const personalFiles = personalAvailable ? await getPersonalSqlFiles(personalPath) : [];
    configs.push({
      source: 'personal',
      path: personalPath,
      isAvailable: personalAvailable,
      fileCount: personalFiles.length,
      error: personalAvailable ? undefined : 'Personal directory not accessible',
    });
  } else {
    configs.push({
      source: 'personal',
      path: '',
      isAvailable: false,
      error: 'No personal path configured',
    });
  }

  return configs;
}

/* ==============================================
   Single File Operations
   ============================================== */

/**
 * Get a single SQL file by source and filename
 *
 * @param source - Which tier to look in
 * @param filename - The SQL filename to find
 * @param paths - Configured paths for shared/personal tiers
 * @returns SqlFileInfo or null if not found
 */
export async function getSqlFile(
  source: SqlSource,
  filename: string,
  paths: { shared?: string; personal?: string }
): Promise<SqlFileInfo | null> {
  let dirPath: string;

  switch (source) {
    case 'server':
      dirPath = SQL_DIRECTORIES.server;
      break;
    case 'shared':
      if (!paths.shared) return null;
      dirPath = paths.shared;
      break;
    case 'personal':
      if (!paths.personal) return null;
      dirPath = paths.personal;
      break;
  }

  const filePath = join(dirPath, filename);
  return parseSqlFileInfo(filePath, source);
}

/**
 * Read raw SQL file content
 *
 * @param source - Which tier to look in
 * @param filename - The SQL filename to read
 * @param paths - Configured paths for shared/personal tiers
 * @returns File content or null if not found
 */
export async function getSqlFileContent(
  source: SqlSource,
  filename: string,
  paths: { shared?: string; personal?: string }
): Promise<string | null> {
  let dirPath: string;

  switch (source) {
    case 'server':
      dirPath = SQL_DIRECTORIES.server;
      break;
    case 'shared':
      if (!paths.shared) return null;
      dirPath = paths.shared;
      break;
    case 'personal':
      if (!paths.personal) return null;
      dirPath = paths.personal;
      break;
  }

  try {
    const filePath = join(dirPath, filename);
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/* ==============================================
   Metadata Extraction
   ============================================== */

/**
 * Parse metadata from SQL content without needing the file
 *
 * Useful for validating user-provided SQL content.
 *
 * @param content - SQL file content
 * @param filename - Filename to use for defaults
 * @returns Parsed metadata
 */
export function parseMetadataFromContent(content: string, filename: string): SqlMetadata {
  return parseSqlMetadata(content, filename);
}
