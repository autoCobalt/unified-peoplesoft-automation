/**
 * HTTP Helper Utilities
 *
 * Shared utilities for handling HTTP requests and responses in server handlers.
 * Consolidates common patterns like body parsing and JSON responses.
 */

import type { IncomingMessage, ServerResponse } from 'http';

/* ==============================================
   Constants
   ============================================== */

/**
 * Maximum allowed request body size (2MB)
 *
 * This limit prevents memory exhaustion attacks from oversized payloads.
 * Adjust if your API needs to accept larger request bodies.
 */
export const MAX_BODY_SIZE = 2 * 1024 * 1024;

/* ==============================================
   Request Helpers
   ============================================== */

/**
 * Parse JSON request body with size limit
 *
 * Tracks incoming data size and aborts immediately if the limit is
 * exceeded, preventing memory exhaustion from large payloads.
 *
 * @param req - Incoming HTTP request
 * @param maxSize - Maximum allowed body size in bytes (default: 2MB)
 * @throws Error if body exceeds size limit or contains invalid JSON
 *
 * @example
 * ```typescript
 * const body = await parseBody<{ username: string; password: string }>(req);
 * ```
 */
export async function parseBody<T>(
  req: IncomingMessage,
  maxSize: number = MAX_BODY_SIZE
): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;

      // Abort immediately if limit exceeded - don't accumulate more data
      if (totalSize > maxSize) {
        req.destroy();
        reject(new Error(`Request body too large. Maximum size: ${String(maxSize)} bytes`));
        return;
      }

      chunks.push(chunk);
    });

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

/**
 * Get raw request body as string (no JSON parsing)
 *
 * Useful when you need the raw body content without parsing,
 * such as for signature verification or non-JSON payloads.
 *
 * @param req - Incoming HTTP request
 * @param maxSize - Maximum allowed body size in bytes (default: 2MB)
 * @throws Error if body exceeds size limit
 */
export async function getRawBody(
  req: IncomingMessage,
  maxSize: number = MAX_BODY_SIZE
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;

      if (totalSize > maxSize) {
        req.destroy();
        reject(new Error(`Request body too large. Maximum size: ${String(maxSize)} bytes`));
        return;
      }

      chunks.push(chunk);
    });

    req.on('error', reject);

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
  });
}

/* ==============================================
   Response Helpers
   ============================================== */

/**
 * Send JSON response
 *
 * Sets appropriate headers and serializes the data as JSON.
 *
 * @param res - Server response object
 * @param statusCode - HTTP status code
 * @param data - Data to serialize as JSON
 *
 * @example
 * ```typescript
 * sendJson(res, 200, { success: true, data: result });
 * sendJson(res, 400, { success: false, error: { code: 'INVALID', message: 'Bad request' } });
 * ```
 */
export function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}
