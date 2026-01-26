/**
 * SQL API Route Handlers
 *
 * HTTP handlers for SQL file management endpoints.
 * These are called by the Vite middleware router.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { SqlSource } from '../../types/sqlMetadata.js';
import {
  getServerSqlFiles,
  getSharedSqlFiles,
  getPersonalSqlFiles,
  getSqlSourceStatus,
  getSqlFile,
  getSqlFileContent,
  validateSqlDirectory,
} from './sqlDirectoryService.js';
import { parseSqlMetadata, validateSqlMetadata } from './parser/index.js';
import { parseBody, sendJson, sendInternalError } from '../utils/index.js';

/* ==============================================
   Helper Functions
   ============================================== */

/**
 * Parse query string from URL
 */
function parseQueryString(url: string): URLSearchParams {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return new URLSearchParams();
  }
  return new URLSearchParams(url.slice(queryStart + 1));
}

/**
 * Validate source parameter
 */
function isValidSource(source: string | null): source is SqlSource {
  return source === 'server' || source === 'shared' || source === 'personal';
}

/**
 * Build SQL paths object from environment and request parameters
 *
 * @param env - Environment variables
 * @param personalPath - Personal path from client request (optional)
 * @returns Paths object for directory service functions
 */
function buildSqlPaths(
  env: Record<string, string>,
  personalPath?: string
): { shared?: string; personal?: string } {
  return {
    shared: env['VITE_SQL_SHARED_PATH'] || undefined,
    personal: personalPath,
  };
}

/* ==============================================
   Path Security Validation
   ============================================== */

/**
 * Validate that a filename doesn't contain path traversal attacks
 *
 * Security: Prevents directory traversal attacks where malicious input
 * like "../../../etc/passwd" could read arbitrary files.
 *
 * Blocks:
 * - Directory traversal: ".."
 * - Home directory expansion: "~"
 * - Null bytes: "\0" (used to bypass extension checks)
 * - Absolute paths (Unix and Windows)
 * - Backslashes (Windows path separator)
 *
 * @param filename - The filename to validate
 * @returns true if safe, false if potentially malicious
 */
function isFilenameSafe(filename: string): boolean {
  // Block directory traversal
  if (filename.includes('..')) return false;

  // Block home directory expansion
  if (filename.includes('~')) return false;

  // Block null bytes (used to bypass extension checks)
  if (filename.includes('\0')) return false;

  // Block absolute paths (Unix)
  if (filename.startsWith('/')) return false;

  // Block absolute paths (Windows - drive letter)
  if (/^[a-zA-Z]:/.test(filename)) return false;

  // Block backslash (Windows path separator)
  if (filename.includes('\\')) return false;

  return true;
}

/**
 * Validate that a directory path doesn't access sensitive system locations
 *
 * Security: For personalPath, we allow full paths (user specifies their
 * SQL directory), but block access to sensitive system directories.
 *
 * @param dirPath - The directory path to validate
 * @returns true if safe, false if potentially accessing sensitive locations
 */
function isDirectoryPathSafe(dirPath: string): boolean {
  // Block directory traversal in any part of the path
  if (dirPath.includes('..')) return false;

  // Block null bytes
  if (dirPath.includes('\0')) return false;

  // Normalize for comparison (lowercase, forward slashes)
  const normalized = dirPath.toLowerCase().replace(/\\/g, '/');

  // Block sensitive Unix system directories
  const blockedUnixPaths = [
    '/etc', '/var', '/usr', '/root', '/bin', '/sbin',
    '/lib', '/lib64', '/boot', '/proc', '/sys', '/dev',
  ];

  // Block sensitive Windows system directories
  const blockedWindowsPaths = [
    'c:/windows', 'c:/program files', 'c:/program files (x86)',
    'c:/programdata', 'c:/users/public', 'c:/users/default',
  ];

  const allBlockedPaths = [...blockedUnixPaths, ...blockedWindowsPaths];

  for (const blocked of allBlockedPaths) {
    if (normalized === blocked || normalized.startsWith(blocked + '/')) {
      return false;
    }
  }

  return true;
}

/* ==============================================
   Route Handlers
   ============================================== */

/**
 * GET /api/sql/sources
 * Returns configuration status for all SQL directory sources
 */
export function createGetSourcesHandler(env: Record<string, string>) {
  return async function handleGetSources(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const query = parseQueryString(req.url ?? '');
      const personalPath = query.get('personalPath') ?? undefined;
      const sharedPath = env['VITE_SQL_SHARED_PATH'] || undefined;

      const configs = await getSqlSourceStatus(sharedPath, personalPath);

      sendJson(res, 200, {
        success: true,
        data: { sources: configs },
      });
    } catch (error) {
      sendInternalError(res, error);
    }
  };
}

/**
 * GET /api/sql/files?source=server
 * Returns list of SQL files from specified source
 */
export function createGetFilesHandler(env: Record<string, string>) {
  return async function handleGetFiles(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const query = parseQueryString(req.url ?? '');
      const source = query.get('source');
      const personalPath = query.get('personalPath') ?? undefined;

      if (!source) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Missing required parameter: source',
          },
        });
        return;
      }

      if (!isValidSource(source)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid source: ${source}. Must be 'server', 'shared', or 'personal'.`,
          },
        });
        return;
      }

      let files;
      switch (source) {
        case 'server':
          files = await getServerSqlFiles();
          break;
        case 'shared':
          files = await getSharedSqlFiles(env['VITE_SQL_SHARED_PATH']);
          break;
        case 'personal':
          if (!personalPath) {
            sendJson(res, 400, {
              success: false,
              error: {
                code: 'MISSING_PARAMETER',
                message: 'Personal source requires personalPath parameter',
              },
            });
            return;
          }
          // Security: Validate path doesn't access sensitive directories
          if (!isDirectoryPathSafe(personalPath)) {
            sendJson(res, 400, {
              success: false,
              error: {
                code: 'INVALID_PATH',
                message: 'Path contains invalid characters or accesses restricted directories',
              },
            });
            return;
          }
          files = await getPersonalSqlFiles(personalPath);
          break;
      }

      sendJson(res, 200, {
        success: true,
        data: { files },
      });
    } catch (error) {
      sendInternalError(res, error);
    }
  };
}

/**
 * GET /api/sql/file?source=server&filename=query.sql
 * Returns a single SQL file's content and metadata
 */
export function createGetFileHandler(env: Record<string, string>) {
  return async function handleGetFile(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const query = parseQueryString(req.url ?? '');
      const source = query.get('source');
      const filename = query.get('filename');
      const personalPath = query.get('personalPath') ?? undefined;

      if (!source || !filename) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Missing required parameters: source, filename',
          },
        });
        return;
      }

      if (!isValidSource(source)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid source: ${source}`,
          },
        });
        return;
      }

      // Security: Validate filename doesn't contain path traversal
      if (!isFilenameSafe(filename)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: 'Filename contains invalid characters',
          },
        });
        return;
      }

      // Security: Validate personalPath if provided
      if (personalPath && !isDirectoryPathSafe(personalPath)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Path contains invalid characters or accesses restricted directories',
          },
        });
        return;
      }

      const paths = buildSqlPaths(env, personalPath);

      const fileInfo = await getSqlFile(source, filename, paths);
      const content = await getSqlFileContent(source, filename, paths);

      if (!fileInfo || content === null) {
        sendJson(res, 404, {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `File not found: ${filename} in ${source}`,
          },
        });
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: {
          ...fileInfo,
          content,
        },
      });
    } catch (error) {
      sendInternalError(res, error);
    }
  };
}

/**
 * GET /api/sql/validate?source=server&filename=query.sql
 * Validates a SQL file's metadata and returns issues
 */
export function createValidateFileHandler(env: Record<string, string>) {
  return async function handleValidateFile(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      const query = parseQueryString(req.url ?? '');
      const source = query.get('source');
      const filename = query.get('filename');
      const personalPath = query.get('personalPath') ?? undefined;

      if (!source || !filename) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Missing required parameters: source, filename',
          },
        });
        return;
      }

      if (!isValidSource(source)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid source: ${source}`,
          },
        });
        return;
      }

      // Security: Validate filename doesn't contain path traversal
      if (!isFilenameSafe(filename)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: 'Filename contains invalid characters',
          },
        });
        return;
      }

      // Security: Validate personalPath if provided
      if (personalPath && !isDirectoryPathSafe(personalPath)) {
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Path contains invalid characters or accesses restricted directories',
          },
        });
        return;
      }

      const paths = buildSqlPaths(env, personalPath);

      const content = await getSqlFileContent(source, filename, paths);

      if (content === null) {
        sendJson(res, 404, {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `File not found: ${filename} in ${source}`,
          },
        });
        return;
      }

      const metadata = parseSqlMetadata(content, filename);
      const validation = validateSqlMetadata(content, filename, metadata);

      sendJson(res, 200, {
        success: true,
        data: validation,
      });
    } catch (error) {
      sendInternalError(res, error);
    }
  };
}

/**
 * POST /api/sql/validate-content
 * Validates provided SQL content (for previewing before save)
 */
export async function handleValidateContent(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{
      content?: string;
      filename?: string;
    }>(req);

    if (!body.content) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Missing required field: content',
        },
      });
      return;
    }

    const filename = body.filename ?? 'untitled.sql';
    const metadata = parseSqlMetadata(body.content, filename);
    const validation = validateSqlMetadata(body.content, filename, metadata);

    sendJson(res, 200, {
      success: true,
      data: {
        metadata,
        validation,
      },
    });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * POST /api/sql/shared/configure
 * Validates and configures the shared directory path
 * Note: This doesn't actually persist the path (that's env-based or UI-based)
 * It just validates that the path is accessible.
 */
export async function handleConfigureShared(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{ path?: string }>(req);

    if (!body.path) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Missing required field: path',
        },
      });
      return;
    }

    // Security: Validate path doesn't access sensitive directories
    if (!isDirectoryPathSafe(body.path)) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Path contains invalid characters or accesses restricted directories',
        },
      });
      return;
    }

    const isValid = await validateSqlDirectory(body.path);

    if (!isValid) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Directory is not accessible or does not exist',
        },
      });
      return;
    }

    const files = await getSharedSqlFiles(body.path);

    sendJson(res, 200, {
      success: true,
      data: {
        path: body.path,
        isValid: true,
        fileCount: files.length,
      },
    });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * POST /api/sql/personal/validate
 * Validates a personal directory path (called from client)
 */
export async function handleValidatePersonal(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{ path?: string }>(req);

    if (!body.path) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'MISSING_PARAMETER',
          message: 'Missing required field: path',
        },
      });
      return;
    }

    // Security: Validate path doesn't access sensitive directories
    if (!isDirectoryPathSafe(body.path)) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Path contains invalid characters or accesses restricted directories',
        },
      });
      return;
    }

    const isValid = await validateSqlDirectory(body.path);

    if (!isValid) {
      sendJson(res, 200, {
        success: true,
        data: {
          path: body.path,
          isValid: false,
          fileCount: 0,
          error: 'Directory is not accessible or does not exist',
        },
      });
      return;
    }

    const files = await getPersonalSqlFiles(body.path);

    sendJson(res, 200, {
      success: true,
      data: {
        path: body.path,
        isValid: true,
        fileCount: files.length,
      },
    });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/* ==============================================
   Route Factory
   ============================================== */

/**
 * Create all SQL route handlers with environment configuration
 */
export function createSqlHandlers(env: Record<string, string>) {
  return {
    getSources: createGetSourcesHandler(env),
    getFiles: createGetFilesHandler(env),
    getFile: createGetFileHandler(env),
    validateFile: createValidateFileHandler(env),
    validateContent: handleValidateContent,
    configureShared: handleConfigureShared,
    validatePersonal: handleValidatePersonal,
  };
}
