/**
 * HTTP Helper Utilities
 *
 * Minimal helpers for server handlers that write raw Node.js responses
 * (e.g., test-site HTML handlers wrapped via Fastify's reply.hijack()).
 *
 * Most routes use Fastify's built-in request.body and reply.send() instead.
 */

import type { ServerResponse } from 'http';

/**
 * Send JSON response
 *
 * Sets appropriate headers and serializes the data as JSON.
 * Used by test-site handlers that write directly to raw Node.js responses.
 *
 * @param res - Server response object
 * @param statusCode - HTTP status code
 * @param data - Data to serialize as JSON
 */
export function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}
