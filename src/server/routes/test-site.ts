/**
 * Test Site Route Plugin
 *
 * Serves mock PeopleSoft pages at /test-site/* for Playwright testing.
 * Only registered in development mode.
 *
 * Delegates to the existing test-site handlers which write directly
 * to raw Node.js response objects (HTML/CSS, not JSON).
 */

import type { FastifyInstance } from 'fastify';
import { handleTestSiteRequest } from '../test-site/index.js';

export function testSiteRoutes(app: FastifyInstance): void {
  /**
   * Catch-all for /test-site and /test-site/* routes.
   * Delegates to the existing handler which writes raw HTML/CSS responses.
   */
  app.get('/test-site', handleTestSiteWildcard);
  app.get('/test-site/*', handleTestSiteWildcard);
}

const handleTestSiteWildcard: import('fastify').RouteHandlerMethod = function (request, reply) {
  const handled = handleTestSiteRequest(request.raw, reply.raw);
  if (handled) {
    // Raw response already sent — tell Fastify not to double-send
    void reply.hijack();
  } else {
    void reply.status(404).send('Test site route not found');
  }
};
