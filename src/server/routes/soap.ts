/**
 * SOAP Route Plugin
 *
 * Endpoints for PeopleSoft SOAP operations.
 * - GET /status — SOAP service state (public)
 * - POST /connect — Test SOAP connection (public, upgrades session)
 * - POST /disconnect — Clear SOAP credentials (authenticated)
 * - POST /get-ci-shape — Get CI structure via SOAP (authenticated)
 * - POST /submit — Submit data to CI (authenticated)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ActionType } from '../../types/soap.js';
import type { SoapCredentials } from '../../types/connection.js';
import { soapService } from '../soap/soapService.js';
import { sessionService } from '../auth/index.js';
import { isRedirectEnabled, captureSoapSubmit } from '../utils/index.js';

const SESSION_HEADER = 'x-session-token';

function extractToken(request: FastifyRequest): string | undefined {
  const header = request.headers[SESSION_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

export function soapRoutes(app: FastifyInstance): void {
  /**
   * GET /api/soap/status (public)
   */
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const state = soapService.getState();

    return reply.send({
      success: true,
      data: {
        isConfigured: soapService.isConfigured(),
        hasCredentials: state.hasCredentials,
        lastConnectionTime: state.lastConnectionTime?.toISOString() ?? null,
        error: state.error,
      },
    });
  });

  /**
   * POST /api/soap/connect (public — this IS the auth step)
   */
  app.post<{
    Body: {
      username?: string;
      password?: string;
    };
  }>('/connect', async (request, reply: FastifyReply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required fields: username, password',
        },
      });
    }

    const credentials: SoapCredentials = { username, password };
    const result = await soapService.testConnection(credentials);

    if (result.success) {
      const existingToken = extractToken(request);
      const sessionToken = sessionService.upgradeAuth('soap', username, existingToken ?? undefined);

      return reply.send({
        ...result,
        data: {
          ...result.data,
          sessionToken,
        },
      });
    }

    return reply.status(401).send(result);
  });

  /**
   * POST /api/soap/disconnect (authenticated)
   */
  app.post('/disconnect', {
    preHandler: [app.requireSession],
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    sessionService.downgradeAllByAuthSource('soap');
    soapService.clearCredentials();

    return reply.send({
      success: true,
      data: { message: 'Disconnected from SOAP service' },
    });
  });

  /**
   * POST /api/soap/get-ci-shape (authenticated)
   */
  app.post<{
    Body: { ciName?: string };
  }>('/get-ci-shape', {
    preHandler: [app.requireSession],
  }, async (request, reply: FastifyReply) => {
    const { ciName } = request.body;

    if (!ciName) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: ciName',
        },
      });
    }

    const result = await soapService.getCIShape(ciName);
    return reply.status(result.success ? 200 : 500).send(result);
  });

  /**
   * POST /api/soap/submit (authenticated)
   */
  app.post<{
    Body: {
      ciName?: string;
      action?: string;
      data?: Record<string, unknown> | Record<string, unknown>[];
    };
  }>('/submit', {
    preHandler: [app.requireSession],
  }, async (request, reply: FastifyReply) => {
    const { ciName, action, data } = request.body;

    if (!ciName) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'Missing required field: ciName' },
      });
    }

    if (!action) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'Missing required field: action' },
      });
    }

    const validActions: ActionType[] = ['CREATE', 'UPDATE', 'UPDATEDATA'];
    if (!validActions.includes(action as ActionType)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: `Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`,
        },
      });
    }

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'Missing required field: data' },
      });
    }

    const typedAction = action as ActionType;

    // Redirect mode: capture to JSON instead of submitting
    if (isRedirectEnabled()) {
      captureSoapSubmit({
        ciName,
        action: typedAction,
        isBatch: Array.isArray(data),
        data,
      });

      return reply.send({
        success: true,
        data: {
          success: true,
          notification: '1',
          transactions: [],
          errors: [],
          warnings: [],
        },
      });
    }

    // Handle single or batch submission
    const result = Array.isArray(data)
      ? await soapService.submitBatch(ciName, typedAction, data)
      : await soapService.submitData(ciName, typedAction, data);

    return reply.status(result.success ? 200 : 500).send(result);
  });
}
