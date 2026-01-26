/**
 * Auth Handlers
 *
 * HTTP request handlers for authentication-related endpoints.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { sessionService } from './sessionService.js';

/**
 * Session token header name (must match server/index.ts)
 */
const SESSION_HEADER = 'x-session-token';

/**
 * Handle GET /api/session/status
 *
 * Returns the current session's validity and time remaining.
 * This endpoint is intentionally lightweight for client polling.
 *
 * Response format:
 * - valid: boolean - whether the session is currently valid
 * - expiresInMs: number - milliseconds until session expires (0 if invalid)
 *
 * Note: This is a PUBLIC endpoint (no auth required) because:
 * - It's used to CHECK if auth is still valid
 * - If we required auth, we couldn't distinguish "no token" from "expired token"
 * - The endpoint only returns timing info, no sensitive data
 */
export function handleGetSessionStatus(
  req: IncomingMessage,
  res: ServerResponse
): void {
  // Extract token from header (case-insensitive header lookup)
  const tokenHeader = req.headers[SESSION_HEADER];
  const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

  // Get session info (does NOT extend session - passive check)
  const sessionInfo = sessionService.getSessionInfo(token);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');

  if (!sessionInfo) {
    // No token provided
    res.end(JSON.stringify({
      success: true,
      data: {
        valid: false,
        expiresInMs: 0,
        reason: 'no_token',
      },
    }));
    return;
  }

  res.end(JSON.stringify({
    success: true,
    data: {
      valid: sessionInfo.valid,
      expiresInMs: sessionInfo.expiresInMs,
      reason: sessionInfo.valid ? undefined : 'expired',
    },
  }));
}
