/**
 * Server Module Entry Point
 *
 * Exports the middleware for Vite's configureServer().
 * This is imported by vite.config.ts.
 *
 * Architecture:
 * - Workflow endpoints (/api/workflows/*) are the public API
 * - Playwright browser control is internal - NOT exposed via HTTP
 * - Test site (/test-site/*) is only available in development mode
 */

import type { ViteDevServer } from 'vite';
import { workflowRoutes } from './workflows/index.js';
import { handleTestSiteRequest } from './test-site/index.js';

/**
 * Configure Vite dev server with workflow API middleware
 *
 * Adds /api/workflows/* routes for business-level automation control.
 * Adds /test-site/* routes in development mode for testing automation.
 * Routes are matched before Vite's static file serving.
 *
 * Note: Browser control (Playwright) is internal to the workflow services.
 * There are no direct browser control endpoints exposed to the network.
 *
 * @param server - Vite dev server instance
 * @param env - Environment variables loaded via Vite's loadEnv()
 */
export function configureWorkflowMiddleware(
  server: ViteDevServer,
  env: Record<string, string> = {}
): void {
  const isDevelopment = env['VITE_APP_MODE'] === 'development';

  server.middlewares.use((req, res, next) => {
    const url = req.url ?? '';

    // Handle test-site routes (development only)
    if (isDevelopment && url.startsWith('/test-site')) {
      const handled = handleTestSiteRequest(req, res);
      if (handled) return;
    }

    // Only handle /api routes
    if (!url.startsWith('/api')) {
      next();
      return;
    }

    // Find matching route - use explicit lookup to allow undefined
    const route = Object.hasOwn(workflowRoutes, url) ? workflowRoutes[url] : undefined;

    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route not found: ${url}`,
        },
      }));
      return;
    }

    // Check method
    const method = req.method ?? 'UNKNOWN';
    if (method !== route.method) {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${method} not allowed for ${url}. Use ${route.method}.`,
        },
      }));
      return;
    }

    // Handle the request (may be sync or async)
    void Promise.resolve(route.handler(req, res)).catch((error: unknown) => {
      console.error(`[API Error] ${url}:`, error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected server error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    });
  });

  console.log('[Vite] Workflow API middleware configured');
  console.log('[Vite] Available endpoints:');
  Object.entries(workflowRoutes).forEach(([path, { method }]) => {
    console.log(`  ${method} ${path}`);
  });

  if (isDevelopment) {
    console.log('[Vite] Test site enabled (VITE_APP_MODE=development)');
    console.log('  GET /test-site?TRANSACTION_NBR=123456');
  }
}

// Re-export workflow services for direct access if needed
export { managerWorkflowService, oracleService } from './workflows/index.js';
