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
 * Get all SQL files from both server directories (local + bundled)
 *
 * Merges files from server/ (local/untracked) and bundled/ (tracked).
 * If a filename exists in both, the local version takes priority.
 */
export async function getServerSqlFiles(): Promise<SqlFileInfo[]> {
  const [serverFiles, bundledFiles] = await Promise.all([
    getSqlFilesFromDirectory(SQL_DIRECTORIES.server, 'server'),
    getSqlFilesFromDirectory(SQL_DIRECTORIES.bundled, 'server'),
  ]);

  // Local files shadow bundled files with the same filename
  const serverFilenames = new Set(serverFiles.map(f => f.filename));
  const uniqueBundled = bundledFiles.filter(f => !serverFilenames.has(f.filename));

  return [...serverFiles, ...uniqueBundled].sort((a, b) =>
    a.filename.localeCompare(b.filename)
  );
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

  // Server tier (local + bundled directories)
  const [serverAvailable, bundledAvailable] = await Promise.all([
    validateSqlDirectory(SQL_DIRECTORIES.server),
    validateSqlDirectory(SQL_DIRECTORIES.bundled),
  ]);
  const anyServerAvailable = serverAvailable || bundledAvailable;
  const serverFiles = anyServerAvailable ? await getServerSqlFiles() : [];
  configs.push({
    source: 'server',
    path: SQL_DIRECTORIES.server,
    isAvailable: anyServerAvailable,
    fileCount: serverFiles.length,
    error: anyServerAvailable ? undefined : 'Server SQL directories not found',
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
 * For 'server' source, checks server/ (local) first, then bundled/.
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
  if (source === 'server') {
    // Try local (untracked) first, then bundled (tracked)
    const localResult = await parseSqlFileInfo(
      join(SQL_DIRECTORIES.server, filename), source
    );
    if (localResult) return localResult;
    return parseSqlFileInfo(join(SQL_DIRECTORIES.bundled, filename), source);
  }

  let dirPath: string;
  switch (source) {
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
 * For 'server' source, checks server/ (local) first, then bundled/.
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
  if (source === 'server') {
    // Try local (untracked) first, then bundled (tracked)
    for (const dir of [SQL_DIRECTORIES.server, SQL_DIRECTORIES.bundled]) {
      try {
        return await readFile(join(dir, filename), 'utf-8');
      } catch {
        continue;
      }
    }
    return null;
  }

  let dirPath: string;
  switch (source) {
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
