/**
 * Authentication Plugin
 *
 * Provides preHandler hooks for route-level auth enforcement.
 * Replaces the inline authentication check from server/index.ts.
 *
 * Three auth levels (used as preHandler arrays on routes):
 * - requireSession: Any valid session token
 * - requireOracle: Session with oracle auth level verified
 * - requireSoap: Session with soap auth level verified
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { sessionService } from '../auth/index.js';
import { logDebug, logWarn } from '../utils/index.js';

/* ==============================================
   Constants
   ============================================== */

const SESSION_HEADER = 'x-session-token';

/* ==============================================
   Hook Factories
   ============================================== */

function extractToken(request: FastifyRequest): string | undefined {
  const header = request.headers[SESSION_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

function authPluginImpl(
  app: FastifyInstance,
  opts: { isDevelopment: boolean },
): void {
  /**
   * requireSession — validates that a session token is present and not expired.
   * Attaches session to request for downstream use.
   */
  app.decorate('requireSession', async function requireSession(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = extractToken(request);

    if (opts.isDevelopment) {
      const activeCount = sessionService.getActiveSessionCount();
      logDebug('Auth', `Token ${token ? 'present' : 'MISSING'}, active sessions: ${String(activeCount)}`);
    }

    const session = sessionService.validateSession(token);

    if (!session) {
      const hasToken = Boolean(token);
      const activeCount = sessionService.getActiveSessionCount();

      logWarn(
        'Auth',
        `Rejected ${request.method} ${request.url}: ${hasToken ? 'invalid token' : 'no token'} (active sessions: ${String(activeCount)})`,
      );

      return reply.status(401).header('WWW-Authenticate', 'Session realm="API"').send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: hasToken
            ? 'Session expired or invalid. Please reconnect to refresh your session.'
            : 'Authentication required. Please connect via Oracle or SOAP first.',
          hint: hasToken
            ? 'Your session may have been cleared by a server restart. Try disconnecting and reconnecting.'
            : 'Include the session token in the X-Session-Token header.',
        },
      });
    }

    if (opts.isDevelopment) {
      logDebug('Auth', `Authenticated request: ${request.method} ${request.url}`);
    }
  });

  /**
   * requireOracle — session must have oracle auth level verified.
   * Should be used after requireSession in the preHandler array.
   */
  app.decorate('requireOracle', async function requireOracle(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = extractToken(_request);
    const session = sessionService.validateSession(token);

    if (!session?.auth.oracle.verified) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'ORACLE_NOT_CONNECTED',
          message: 'Oracle database connection required for this operation.',
        },
      });
    }
  });

  /**
   * requireSoap — session must have soap auth level verified.
   * Should be used after requireSession in the preHandler array.
   */
  app.decorate('requireSoap', async function requireSoap(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const token = extractToken(_request);
    const session = sessionService.validateSession(token);

    if (!session?.auth.soap.verified) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'SOAP_NOT_CONNECTED',
          message: 'SOAP connection required for this operation.',
        },
      });
    }
  });
}

export const authPlugin = fp(authPluginImpl, {
  name: 'auth',
});

/* ==============================================
   Type Augmentation
   ============================================== */

declare module 'fastify' {
  interface FastifyInstance {
    requireSession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireOracle: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireSoap: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
