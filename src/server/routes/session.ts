/**
 * Session Route Plugin
 *
 * Endpoints for session lifecycle management.
 * - GET /status — Check session validity (public)
 * - POST /create — Create a new general session (public)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sessionService } from '../auth/index.js';

const SESSION_HEADER = 'x-session-token';

function extractToken(request: FastifyRequest): string | undefined {
  const header = request.headers[SESSION_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

export function sessionRoutes(app: FastifyInstance): void {
  /**
   * GET /api/session/status
   *
   * Public endpoint — returns session validity and time remaining.
   * Does NOT extend session (passive check).
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractToken(request);
    const sessionInfo = sessionService.getSessionInfo(token);

    if (!sessionInfo) {
      return reply.send({
        success: true,
        data: {
          valid: false,
          expiresInMs: 0,
          reason: 'no_token',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        valid: sessionInfo.valid,
        expiresInMs: sessionInfo.expiresInMs,
        oracleVerified: sessionInfo.oracleVerified,
        soapVerified: sessionInfo.soapVerified,
        reason: sessionInfo.valid ? undefined : 'expired',
      },
    });
  });

  /**
   * POST /api/session/create
   *
   * Creates a new general session (no auth levels).
   * Returns existing token if one is provided and still valid.
   */
  app.post('/create', async (request: FastifyRequest, reply: FastifyReply) => {
    const existingToken = extractToken(request);
    const token = sessionService.createSession(existingToken ?? undefined);

    return reply.send({
      success: true,
      data: {
        sessionToken: token,
      },
    });
  });
}
