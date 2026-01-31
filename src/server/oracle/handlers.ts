/**
 * Oracle API Route Handlers
 *
 * HTTP handlers for Oracle query endpoints.
 * These are called by the Vite middleware router.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { QueryParameters } from '../../types/oracle.js';
import { oracleService } from './oracleService.js';
import { isValidQueryId, getAvailableQueryIds, getQueryConfig } from '../sql/index.js';
import { sessionService } from '../auth/index.js';
import { parseBody, sendJson, sendInternalError, isRedirectEnabled, captureOracleQuery, loadSqlText, getStoredOracleConnectionInfo } from '../utils/index.js';

/** Raw request body before validation */
interface RawQueryRequest {
  queryId?: string;
  parameters?: QueryParameters;
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
 * Connect to Oracle database and create session
 *
 * Request body:
 * {
 *   connectionString: string,
 *   username: string,
 *   password: string
 * }
 *
 * Response on success includes sessionToken for subsequent authenticated requests.
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

    // On successful connection, create a session and return the token
    if (result.success) {
      const sessionToken = sessionService.createSession(body.username, 'oracle');

      sendJson(res, 200, {
        ...result,
        data: {
          ...result.data,
          sessionToken,
        },
      });
    } else {
      sendJson(res, 500, result);
    }
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * POST /api/oracle/disconnect
 * Disconnect from Oracle database and invalidate all Oracle sessions
 *
 * Security: Invalidates all sessions authenticated via Oracle.
 * This ensures disconnected users can't continue making API calls.
 */
export async function handleDisconnect(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Invalidate all Oracle sessions before disconnecting
  sessionService.invalidateByAuthSource('oracle');

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

    // Redirect mode: capture to JSON instead of executing
    if (isRedirectEnabled()) {
      const queryConfig = getQueryConfig(queryId);
      if (queryConfig) {
        const sqlText = loadSqlText(queryConfig.filename);
        const connectionInfo = getStoredOracleConnectionInfo();

        captureOracleQuery({
          queryId,
          queryConfig,
          sqlText,
          bindParameters: body.parameters,
          connectionInfo,
        });

        sendJson(res, 200, {
          success: true,
          data: { rows: [], rowCount: 0, columns: [], executionTimeMs: 0 },
        });
        return;
      }
    }

    // Execute query - queryId is now typed as OracleQueryId
    const result = await oracleService.executeQuery(queryId, body.parameters);

    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    sendInternalError(res, error);
  }
}
