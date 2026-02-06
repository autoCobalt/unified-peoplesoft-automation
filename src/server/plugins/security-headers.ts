/**
 * Security Headers Plugin
 *
 * Applies security headers to all API responses via Fastify's onSend hook.
 * Replaces the inline setSecurityHeaders() from server/index.ts.
 *
 * Headers protect against:
 * - MIME sniffing (X-Content-Type-Options)
 * - Clickjacking (X-Frame-Options)
 * - Referrer leakage (Referrer-Policy)
 * - Resource injection (Content-Security-Policy)
 * - Feature abuse (Permissions-Policy)
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

function securityHeaders(app: FastifyInstance): void {
  app.addHook('onSend', async (_request, reply, payload: unknown) => {
    void reply.header('X-Content-Type-Options', 'nosniff');
    void reply.header('X-Frame-Options', 'DENY');
    void reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    void reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    void reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    return payload;
  });
}

export const securityHeadersPlugin = fp(securityHeaders, {
  name: 'security-headers',
});
