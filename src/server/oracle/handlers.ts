/**
 * Oracle API Route Handlers
 *
 * HTTP handlers for Oracle query endpoints.
 * These are called by the Vite middleware router.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { QueryParameters } from '../../types/oracle.js';
import { oracleService } from './oracleService.js';
import { isValidQueryId, getAvailableQueryIds } from '../sql/index.js';

/** Raw request body before validation */
interface RawQueryRequest {
  queryId?: string;
  parameters?: QueryParameters;
}

/* ==============================================
   Helper Functions
   ============================================== */

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Parse JSON request body
 */
async function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve(body ? JSON.parse(body) as T : {} as T);
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

/* ==============================================
   Route Handlers
   ============================================== */

/**
 * GET /api/oracle/status
 * Returns current Oracle connection state
 */
export function handleGetStatus(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const state = oracleService.getState();

  sendJson(res, 200, {
    success: true,
    data: {
      isConnected: state.isConnected,
      connectionTime: state.connectionTime?.toISOString() ?? null,
      lastQueryTime: state.lastQueryTime?.toISOString() ?? null,
      error: state.error,
    },
  });
}

/**
 * GET /api/oracle/queries
 * Returns list of available query IDs
 */
export function handleGetQueries(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  sendJson(res, 200, {
    success: true,
    data: {
      queries: getAvailableQueryIds(),
    },
  });
}

/**
 * POST /api/oracle/connect
 * Connect to Oracle database
 *
 * Request body:
 * {
 *   connectionString: string,
 *   username: string,
 *   password: string
 * }
 */
export async function handleConnect(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{
      connectionString?: string;
      username?: string;
      password?: string;
    }>(req);

    // Validate required fields
    if (!body.connectionString || !body.username || !body.password) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required fields: connectionString, username, password',
        },
      });
      return;
    }

    const result = await oracleService.connect(
      body.connectionString,
      body.username,
      body.password
    );

    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * POST /api/oracle/disconnect
 * Disconnect from Oracle database
 */
export async function handleDisconnect(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const result = await oracleService.disconnect();
  sendJson(res, 200, result);
}

/**
 * POST /api/oracle/query
 * Execute a registered query
 *
 * Request body:
 * {
 *   queryId: string,
 *   parameters?: Record<string, unknown>
 * }
 */
export async function handleQuery(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<RawQueryRequest>(req);
    const queryId = body.queryId;

    // Validate queryId presence
    if (!queryId) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: queryId',
        },
      });
      return;
    }

    // Validate queryId is registered
    if (!isValidQueryId(queryId)) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'QUERY_NOT_FOUND',
          message: `Unknown query ID: ${queryId}`,
          details: `Available queries: ${getAvailableQueryIds().join(', ')}`,
        },
      });
      return;
    }

    // Execute query - queryId is now typed as OracleQueryId
    const result = await oracleService.executeQuery(queryId, body.parameters);

    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
