/**
 * Oracle Route Plugin
 *
 * Endpoints for Oracle database connection and query execution.
 * - GET /status — Connection state (public)
 * - GET /queries — List available query IDs (authenticated)
 * - POST /connect — Connect to Oracle (public, creates/upgrades session)
 * - POST /disconnect — Disconnect from Oracle (authenticated)
 * - POST /query — Execute a registered query (authenticated)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { QueryParameters } from '../../types/oracle.js';
import { oracleService } from '../oracle/oracleService.js';
import { isValidQueryId, getAvailableQueryIds, getQueryConfig } from '../sql/index.js';
import { sessionService } from '../auth/index.js';
import { isRedirectEnabled, captureOracleQuery, loadSqlText, getStoredOracleConnectionInfo } from '../utils/index.js';

const SESSION_HEADER = 'x-session-token';

function extractToken(request: FastifyRequest): string | undefined {
  const header = request.headers[SESSION_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

export function oracleRoutes(app: FastifyInstance): void {
  /**
   * GET /api/oracle/status (public)
   */
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const state = oracleService.getState();

    return reply.send({
      success: true,
      data: {
        isConnected: state.isConnected,
        connectionTime: state.connectionTime?.toISOString() ?? null,
        lastQueryTime: state.lastQueryTime?.toISOString() ?? null,
        error: state.error,
      },
    });
  });

  /**
   * GET /api/oracle/queries (authenticated)
   */
  app.get('/queries', {
    preHandler: [app.requireSession],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        queries: getAvailableQueryIds(),
      },
    });
  });

  /**
   * POST /api/oracle/connect (public — this IS the auth step)
   */
  app.post<{
    Body: {
      connectionString?: string;
      username?: string;
      password?: string;
    };
  }>('/connect', async (request, reply: FastifyReply) => {
    const { connectionString, username, password } = request.body;

    if (!connectionString || !username || !password) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required fields: connectionString, username, password',
        },
      });
    }

    const result = await oracleService.connect(connectionString, username, password);

    if (result.success) {
      // Upgrade session with oracle auth level
      const existingToken = extractToken(request);
      const sessionToken = sessionService.upgradeAuth('oracle', username, existingToken ?? undefined);

      return reply.send({
        ...result,
        data: {
          ...result.data,
          sessionToken,
        },
      });
    }

    return reply.status(500).send(result);
  });

  /**
   * POST /api/oracle/disconnect (authenticated)
   */
  app.post('/disconnect', {
    preHandler: [app.requireSession],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // Downgrade all sessions' oracle auth level
    sessionService.downgradeAllByAuthSource('oracle');

    const result = await oracleService.disconnect();
    return reply.send(result);
  });

  /**
   * POST /api/oracle/query (authenticated)
   */
  app.post<{
    Body: {
      queryId?: string;
      parameters?: QueryParameters;
    };
  }>('/query', {
    preHandler: [app.requireSession],
  }, async (request, reply: FastifyReply) => {
    const { queryId, parameters } = request.body;

    if (!queryId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: queryId',
        },
      });
    }

    if (!isValidQueryId(queryId)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'QUERY_NOT_FOUND',
          message: `Unknown query ID: ${queryId}`,
          details: `Available queries: ${getAvailableQueryIds().join(', ')}`,
        },
      });
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
          bindParameters: parameters,
          connectionInfo,
        });

        return reply.send({
          success: true,
          data: { rows: [], rowCount: 0, columns: [], executionTimeMs: 0 },
        });
      }
    }

    const result = await oracleService.executeQuery(queryId, parameters);
    return reply.status(result.success ? 200 : 500).send(result);
  });
}
