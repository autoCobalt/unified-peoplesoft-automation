/**
 * SQL Route Plugin
 *
 * Endpoints for the three-tier SQL file management system.
 * All endpoints require session authentication.
 *
 * Environment config is accessed from app.serverConfig (decorated in app.ts).
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { SqlSource } from '../../types/sqlMetadata.js';
import {
  getServerSqlFiles,
  getSharedSqlFiles,
  getPersonalSqlFiles,
  getSqlSourceStatus,
  getSqlFile,
  getSqlFileContent,
  validateSqlDirectory,
} from '../sql/sqlDirectoryService.js';
import { parseSqlMetadata, validateSqlMetadata } from '../sql/parser/index.js';

/* ==============================================
   Path Security Validation
   ============================================== */

function isValidSource(source: string | null): source is SqlSource {
  return source === 'server' || source === 'shared' || source === 'personal';
}

function isFilenameSafe(filename: string): boolean {
  if (filename.includes('..')) return false;
  if (filename.includes('~')) return false;
  if (filename.includes('\0')) return false;
  if (filename.startsWith('/')) return false;
  if (/^[a-zA-Z]:/.test(filename)) return false;
  if (filename.includes('\\')) return false;
  return true;
}

function isDirectoryPathSafe(dirPath: string): boolean {
  if (dirPath.includes('..')) return false;
  if (dirPath.includes('\0')) return false;

  const normalized = dirPath.toLowerCase().replace(/\\/g, '/');

  const blockedPaths = [
    '/etc', '/var', '/usr', '/root', '/bin', '/sbin',
    '/lib', '/lib64', '/boot', '/proc', '/sys', '/dev',
    'c:/windows', 'c:/program files', 'c:/program files (x86)',
    'c:/programdata', 'c:/users/public', 'c:/users/default',
  ];

  for (const blocked of blockedPaths) {
    if (normalized === blocked || normalized.startsWith(blocked + '/')) {
      return false;
    }
  }

  return true;
}

/* ==============================================
   Route Plugin
   ============================================== */

export function sqlRoutes(app: FastifyInstance): void {
  // All SQL routes require session auth
  app.addHook('preHandler', app.requireSession);

  const env = app.serverConfig.env;

  /**
   * GET /api/sql/sources
   */
  app.get<{
    Querystring: { personalPath?: string };
  }>('/sources', async (request, reply: FastifyReply) => {
    const personalPath = request.query.personalPath;
    const sharedPath = env['VITE_SQL_SHARED_PATH'] || undefined;

    const configs = await getSqlSourceStatus(sharedPath, personalPath);
    return reply.send({ success: true, data: { sources: configs } });
  });

  /**
   * GET /api/sql/files?source=server
   */
  app.get<{
    Querystring: { source?: string; personalPath?: string };
  }>('/files', async (request, reply: FastifyReply) => {
    const { source, personalPath } = request.query;

    if (!source) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'Missing required parameter: source' },
      });
    }

    if (!isValidSource(source)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETER', message: `Invalid source: ${source}. Must be 'server', 'shared', or 'personal'.` },
      });
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
          return reply.status(400).send({
            success: false,
            error: { code: 'MISSING_PARAMETER', message: 'Personal source requires personalPath parameter' },
          });
        }
        if (!isDirectoryPathSafe(personalPath)) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_PATH', message: 'Path contains invalid characters or accesses restricted directories' },
          });
        }
        files = await getPersonalSqlFiles(personalPath);
        break;
    }

    return reply.send({ success: true, data: { files } });
  });

  /**
   * GET /api/sql/file?source=server&filename=query.sql
   */
  app.get<{
    Querystring: { source?: string; filename?: string; personalPath?: string };
  }>('/file', async (request, reply: FastifyReply) => {
    const { source, filename, personalPath } = request.query;

    if (!source || !filename) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'Missing required parameters: source, filename' },
      });
    }

    if (!isValidSource(source)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETER', message: `Invalid source: ${source}` },
      });
    }

    if (!isFilenameSafe(filename)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_FILENAME', message: 'Filename contains invalid characters' },
      });
    }

    if (personalPath && !isDirectoryPathSafe(personalPath)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path contains invalid characters or accesses restricted directories' },
      });
    }

    const paths = {
      shared: env['VITE_SQL_SHARED_PATH'] || undefined,
      personal: personalPath,
    };

    const fileInfo = await getSqlFile(source, filename, paths);
    const content = await getSqlFileContent(source, filename, paths);

    if (!fileInfo || content === null) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `File not found: ${filename} in ${source}` },
      });
    }

    return reply.send({ success: true, data: { ...fileInfo, content } });
  });

  /**
   * GET /api/sql/validate?source=server&filename=query.sql
   */
  app.get<{
    Querystring: { source?: string; filename?: string; personalPath?: string };
  }>('/validate', async (request, reply: FastifyReply) => {
    const { source, filename, personalPath } = request.query;

    if (!source || !filename) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'Missing required parameters: source, filename' },
      });
    }

    if (!isValidSource(source)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETER', message: `Invalid source: ${source}` },
      });
    }

    if (!isFilenameSafe(filename)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_FILENAME', message: 'Filename contains invalid characters' },
      });
    }

    if (personalPath && !isDirectoryPathSafe(personalPath)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path contains invalid characters or accesses restricted directories' },
      });
    }

    const paths = {
      shared: env['VITE_SQL_SHARED_PATH'] || undefined,
      personal: personalPath,
    };

    const content = await getSqlFileContent(source, filename, paths);

    if (content === null) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `File not found: ${filename} in ${source}` },
      });
    }

    const metadata = parseSqlMetadata(content, filename);
    const validation = validateSqlMetadata(content, filename, metadata);

    return reply.send({ success: true, data: validation });
  });

  /**
   * POST /api/sql/validate-content
   */
  app.post<{
    Body: { content?: string; filename?: string };
  }>('/validate-content', async (request, reply: FastifyReply) => {
    const { content, filename } = request.body;

    if (!content) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'Missing required field: content' },
      });
    }

    const name = filename ?? 'untitled.sql';
    const metadata = parseSqlMetadata(content, name);
    const validation = validateSqlMetadata(content, name, metadata);

    return reply.send({ success: true, data: { metadata, validation } });
  });

  /**
   * POST /api/sql/shared/configure
   */
  app.post<{
    Body: { path?: string };
  }>('/shared/configure', async (request, reply: FastifyReply) => {
    const { path } = request.body;

    if (!path) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'Missing required field: path' },
      });
    }

    if (!isDirectoryPathSafe(path)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path contains invalid characters or accesses restricted directories' },
      });
    }

    const isValid = await validateSqlDirectory(path);

    if (!isValid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Directory is not accessible or does not exist' },
      });
    }

    const files = await getSharedSqlFiles(path);
    return reply.send({ success: true, data: { path, isValid: true, fileCount: files.length } });
  });

  /**
   * POST /api/sql/personal/validate
   */
  app.post<{
    Body: { path?: string };
  }>('/personal/validate', async (request, reply: FastifyReply) => {
    const { path } = request.body;

    if (!path) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_PARAMETER', message: 'Missing required field: path' },
      });
    }

    if (!isDirectoryPathSafe(path)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Path contains invalid characters or accesses restricted directories' },
      });
    }

    const isValid = await validateSqlDirectory(path);

    if (!isValid) {
      return reply.send({
        success: true,
        data: { path, isValid: false, fileCount: 0, error: 'Directory is not accessible or does not exist' },
      });
    }

    const files = await getPersonalSqlFiles(path);
    return reply.send({ success: true, data: { path, isValid: true, fileCount: files.length } });
  });
}
