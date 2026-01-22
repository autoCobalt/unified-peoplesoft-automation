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
 *
 * Security:
 * - All authenticated routes require a valid session token in X-Session-Token header
 * - Sessions are created on successful /api/oracle/connect or /api/soap/connect
 * - Public routes (status, connect) don't require authentication
 */

import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { workflowRoutes } from './workflows/index.js';
import { handleTestSiteRequest } from './test-site/index.js';
import { soapService, buildSoapConfig } from './soap/index.js';
import { sessionService } from './auth/index.js';
import { initializeSecureLogger, logInfo, logDebug, logWarn, logError, parseBody } from './utils/index.js';

/**
 * Session token header name
 *
 * Why X-Session-Token instead of Authorization: Bearer?
 * - More explicit about being a session token (not OAuth/JWT)
 * - Avoids confusion with browser's built-in auth handling
 * - Custom headers are clearly application-specific
 */
const SESSION_HEADER = 'x-session-token';

/* ==============================================
   Security Headers
   ============================================== */

/**
 * Set security headers on API responses
 *
 * These headers protect against common web vulnerabilities:
 * - X-Content-Type-Options: Prevents MIME type sniffing attacks
 * - X-Frame-Options: Prevents clickjacking via iframe embedding
 * - Referrer-Policy: Controls information leakage via Referrer header
 * - Content-Security-Policy: Restricts resource loading (strict for JSON APIs)
 * - Permissions-Policy: Disables unnecessary browser features
 *
 * Note: HSTS is NOT set here because:
 * 1. Development uses HTTP (localhost)
 * 2. Production HSTS should be set at the reverse proxy/load balancer level
 */
function setSecurityHeaders(res: ServerResponse): void {
  // Prevent browsers from MIME-sniffing responses
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent embedding in iframes (clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');

  // Control referrer information sent with requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Strict CSP for JSON API responses - no scripts, styles, or other resources
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  // Disable unnecessary browser features for API responses
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
}

/* ==============================================
   CORS Configuration
   ============================================== */

/**
 * Handle CORS for API requests
 *
 * This application is designed to run with frontend and API on the same origin,
 * so we use a restrictive CORS policy:
 * - Same-origin requests: Always allowed (CORS doesn't apply)
 * - Cross-origin requests: Only allowed from explicitly configured origins
 *
 * The X-Session-Token custom header requires CORS preflight (OPTIONS request),
 * so we must handle OPTIONS requests explicitly.
 *
 * @param req - Incoming request
 * @param res - Server response
 * @param allowedOrigins - List of allowed origins (empty = same-origin only)
 * @returns true if request was handled (OPTIONS preflight), false to continue
 */
function handleCors(
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigins: string[]
): boolean {
  const origin = req.headers.origin;

  // No Origin header = same-origin request, CORS doesn't apply
  if (!origin) {
    return false;
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes(origin);

  if (isAllowed) {
    // Set CORS headers for allowed origins
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      res.statusCode = 204; // No Content
      res.end();
    } else {
      // Origin not allowed - return 403 Forbidden
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'CORS_FORBIDDEN',
          message: 'Cross-origin request not allowed',
        },
      }));
    }
    return true; // Request handled
  }

  // For non-OPTIONS requests from disallowed origins, let the request proceed
  // but without CORS headers - browser will block the response
  return false;
}

/* ==============================================
   DEV-ONLY: Session Creation Handler
   ============================================== */

/**
 * DEV-ONLY: Create a session for simulated connections
 *
 * This endpoint allows the development banner's simulation buttons to work
 * with the new authentication system. It creates a real session on the server
 * without requiring actual Oracle/SOAP connections.
 *
 * SECURITY: This endpoint ONLY exists in development mode.
 */
async function handleDevCreateSession(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{
      username?: string;
      authSource?: 'oracle' | 'soap';
    }>(req);

    const username = body.username ?? 'dev_user';
    const authSource = body.authSource ?? 'oracle';

    // Create a real session
    const sessionToken = sessionService.createSession(username, authSource);

    logInfo('Dev', `Created simulated session for ${username} (${authSource})`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      data: {
        message: 'Development session created',
        sessionToken,
      },
    }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }));
  }
}

/* ==============================================
   Middleware Configuration
   ============================================== */

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

  // Initialize secure logger first - controls redaction of sensitive info in logs
  initializeSecureLogger(isDevelopment);

  // Build allowed CORS origins list
  // In development, allow localhost variants for flexibility
  // In production, use VITE_ALLOWED_ORIGINS or default to same-origin only (empty list)
  const configuredOrigins = env['VITE_ALLOWED_ORIGINS'];
  const allowedOrigins: string[] = isDevelopment
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : (configuredOrigins ? configuredOrigins.split(',').map(o => o.trim()).filter(Boolean) : []);

  // Initialize SOAP service with configuration from environment
  // Pass isDevelopment to enforce HTTPS in production
  const soapConfig = buildSoapConfig(env);
  soapService.initialize(soapConfig, isDevelopment);

  server.middlewares.use((req, res, next) => {
    const url = req.url ?? '';

    // Handle test-site routes (development only)
    if (isDevelopment && url.startsWith('/test-site')) {
      const handled = handleTestSiteRequest(req, res);
      if (handled) return;
    }

    // ==========================================
    // DEV-ONLY: Session creation for simulation
    // ==========================================
    // This endpoint allows the dev simulation to create a session
    // without real Oracle/SOAP credentials. ONLY available in development.
    if (isDevelopment && url === '/api/dev/create-session') {
      // Handle CORS for dev endpoint
      const corsHandled = handleCors(req, res, allowedOrigins);
      if (corsHandled) return;

      if (req.method === 'POST') {
        setSecurityHeaders(res);
        void handleDevCreateSession(req, res);
        return;
      }
    }

    // Only handle /api routes
    if (!url.startsWith('/api')) {
      next();
      return;
    }

    // Handle CORS (must be before other processing for preflight requests)
    const corsHandled = handleCors(req, res, allowedOrigins);
    if (corsHandled) {
      return; // OPTIONS preflight was handled
    }

    // Apply security headers to all API responses
    setSecurityHeaders(res);

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

    // ==========================================
    // Authentication Check
    // ==========================================
    // Routes marked as 'authenticated' require a valid session token.
    // This prevents unauthorized access to sensitive operations.
    if (route.auth === 'authenticated') {
      // Extract token from header (case-insensitive header lookup)
      const tokenHeader = req.headers[SESSION_HEADER];
      const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

      // Debug logging for auth issues (development only)
      if (isDevelopment) {
        const activeCount = sessionService.getActiveSessionCount();
        logDebug('Auth', `Token ${token ? 'present' : 'MISSING'}, active sessions: ${String(activeCount)}`);
      }

      // Validate the session
      const session = sessionService.validateSession(token);

      if (!session) {
        // No valid session - return 401 Unauthorized
        // Provide helpful error message based on situation
        const hasToken = Boolean(token);
        const activeCount = sessionService.getActiveSessionCount();

        logWarn('Auth', `Rejected ${method} ${url}: ${hasToken ? 'invalid token' : 'no token'} (active sessions: ${String(activeCount)})`);

        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('WWW-Authenticate', 'Session realm="API"');
        res.end(JSON.stringify({
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
        }));
        return;
      }

      // Session is valid - log the authenticated request (only in development)
      logDebug('Auth', `Authenticated request: ${method} ${url} (session: ${session.authSource})`);
    }

    // Handle the request (may be sync or async)
    void Promise.resolve(route.handler(req, res)).catch((error: unknown) => {
      logError('API', `Error on ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  logInfo('Vite', 'Workflow API middleware configured');
  logInfo('Vite', 'Available endpoints:');
  Object.entries(workflowRoutes).forEach(([path, { method }]) => {
    logInfo('Vite', `  ${method} ${path}`);
  });

  if (isDevelopment) {
    logInfo('Vite', 'Test site enabled (VITE_APP_MODE=development)');
    logInfo('Vite', '  GET /test-site?TRANSACTION_NBR=123456');
  }
}

// Re-export workflow services for direct access if needed
export { managerWorkflowService, oracleService, soapService } from './workflows/index.js';
