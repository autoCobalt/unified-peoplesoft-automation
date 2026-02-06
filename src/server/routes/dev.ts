/**
 * Dev Route Plugin
 *
 * Development-only endpoints. Only registered when isDevelopment is true.
 * - POST /api/dev/create-session — Create a dev session for simulation
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { sessionService } from '../auth/index.js';
import { logInfo } from '../utils/index.js';

export function devRoutes(app: FastifyInstance): void {
  /**
   * POST /api/dev/create-session
   *
   * Creates a session for simulated connections without real Oracle/SOAP.
   */
  app.post<{
    Body: {
      username?: string;
      authSource?: 'oracle' | 'soap';
    };
  }>('/create-session', async (request, reply: FastifyReply) => {
    const username = request.body.username ?? 'dev_user';
    const authSource = request.body.authSource ?? 'oracle';

    // Create session and upgrade auth level
    const sessionToken = sessionService.upgradeAuth(authSource, username);

    logInfo('Dev', `Created simulated session for ${username} (${authSource})`);

    return reply.send({
      success: true,
      data: {
        message: 'Development session created',
        sessionToken,
      },
    });
  });
}
