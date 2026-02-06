/**
 * WebSocket Route Plugin
 *
 * Handles /ws connections using @fastify/websocket.
 * Authenticates via query parameter token, then delegates connection
 * management to the WebSocket manager.
 *
 * Client connects with: ws://host/ws?token=<session-token>
 *
 * Close codes:
 * - 4001: Invalid or missing token
 * - 4002: Session expired (sent by wsManager)
 * - 1001: Server shutting down
 */

import type { FastifyInstance } from 'fastify';
import { sessionService } from '../auth/index.js';
import { wsManager } from '../services/wsManager.js';
import { logInfo, logDebug } from '../utils/index.js';

/* ==============================================
   Route Plugin
   ============================================== */

export function websocketRoutes(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket, request) => {
    // Extract token from query string
    const url = new URL(request.url, `http://${request.hostname}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logDebug('WebSocket', 'Connection rejected: no token provided');
      socket.close(4001, 'Missing token');
      return;
    }

    // Validate session (read-only check — don't extend session)
    const sessionInfo = sessionService.getSessionInfo(token);

    if (!sessionInfo || !sessionInfo.valid) {
      logDebug('WebSocket', 'Connection rejected: invalid or expired token');
      socket.close(4001, 'Invalid token');
      return;
    }

    // Valid session — register with WebSocket manager
    wsManager.addClient(token, socket);

    logInfo('WebSocket', `Client authenticated (sessions: ${String(wsManager.totalSessions())}, connections: ${String(wsManager.totalConnections())})`);

    // Handle incoming messages from client (currently unused, but log for debugging)
    socket.on('message', (data: Buffer) => {
      const message = String(data);
      logDebug('WebSocket', `Received from client: ${message}`);
    });
  });

  logInfo('WebSocket', 'Route /ws registered');
}
