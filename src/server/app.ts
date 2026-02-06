/**
 * Fastify Application Factory
 *
 * Creates and configures the Fastify server instance with all plugins and routes.
 * Replaces the Vite middleware approach (src/server/index.ts) with a standalone server.
 *
 * Architecture:
 * 1. Core plugins (CORS, security headers, auth)
 * 2. Route plugins (session, oracle, soap, workflows, CI, SQL)
 * 3. Dev-only routes (test site, dev session creation)
 * 4. Static file serving (production only)
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { join } from 'path';
import type { ServerConfig } from './config.js';
import { securityHeadersPlugin } from './plugins/security-headers.js';
import { authPlugin } from './plugins/auth.js';
import { sessionRoutes } from './routes/session.js';
import { oracleRoutes } from './routes/oracle.js';
import { soapRoutes } from './routes/soap.js';
import { workflowsManagerRoutes } from './routes/workflows-manager.js';
import { workflowsOtherRoutes } from './routes/workflows-other.js';
import { ciShapesRoutes } from './routes/ci-shapes.js';
import { ciTemplatesRoutes } from './routes/ci-templates.js';
import { sqlRoutes } from './routes/sql.js';
import { devRoutes } from './routes/dev.js';
import { testSiteRoutes } from './routes/test-site.js';
import { websocketRoutes } from './routes/websocket.js';
import { soapService, buildSoapConfig } from './soap/index.js';
import { initializeSecureLogger, initializeRedirectCapture, logInfo } from './utils/index.js';
import { runSqlMetadataTest } from './sql/devTest.js';

/* ==============================================
   Type Augmentation
   ============================================== */

declare module 'fastify' {
  interface FastifyInstance {
    serverConfig: ServerConfig;
  }
}

/* ==============================================
   Body Size Limit
   ============================================== */

/**
 * Maximum request body size (2MB) — matches the previous httpHelpers.ts MAX_BODY_SIZE.
 * Fastify enforces this at the framework level, replacing manual stream tracking.
 */
const MAX_BODY_SIZE = 2 * 1024 * 1024;

/* ==============================================
   App Factory
   ============================================== */

export async function buildApp(config: ServerConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isDevelopment
      ? { level: 'info', transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : { level: 'warn' },
    bodyLimit: MAX_BODY_SIZE,
  });

  // Initialize secure logger (controls redaction in production)
  initializeSecureLogger(config.isDevelopment);

  // Initialize redirect capture (VITE_SUBMIT_REDIRECT mode)
  initializeRedirectCapture(config.env);

  // Initialize SOAP service with environment config
  const soapConfig = buildSoapConfig(config.env);
  soapService.initialize(soapConfig, config.isDevelopment);

  /* ==============================================
     Core Plugins
     ============================================== */

  // CORS — replaces manual handleCors() from server/index.ts
  await app.register(fastifyCors, {
    origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Session-Token'],
    maxAge: 86400,
  });

  // Security headers — applied to all API responses
  await app.register(securityHeadersPlugin);

  // Auth decorators — adds requireSession, requireOracle, requireSoap hooks
  await app.register(authPlugin, { isDevelopment: config.isDevelopment });

  // WebSocket support — must be registered before websocket route plugin
  await app.register(fastifyWebsocket);

  /* ==============================================
     Decorate app with shared config
     ============================================== */

  // Make env and config available to route plugins
  app.decorate('serverConfig', config);

  /* ==============================================
     API Route Plugins
     ============================================== */

  await app.register(sessionRoutes, { prefix: '/api/session' });
  await app.register(oracleRoutes, { prefix: '/api/oracle' });
  await app.register(soapRoutes, { prefix: '/api/soap' });
  await app.register(workflowsManagerRoutes, { prefix: '/api/workflows/manager' });
  await app.register(workflowsOtherRoutes, { prefix: '/api/workflows/other' });
  await app.register(ciShapesRoutes, { prefix: '/api' });
  await app.register(ciTemplatesRoutes, { prefix: '/api/ci-templates' });
  await app.register(sqlRoutes, { prefix: '/api/sql' });
  await app.register(websocketRoutes);

  /* ==============================================
     Dev-Only Routes
     ============================================== */

  if (config.isDevelopment) {
    await app.register(devRoutes, { prefix: '/api/dev' });
    await app.register(testSiteRoutes);

    logInfo('Fastify', 'Development mode enabled');
    logInfo('Fastify', '  GET /test-site?TRANSACTION_NBR=123456');
    void runSqlMetadataTest();
  }

  /* ==============================================
     Production Static Serving
     ============================================== */

  if (!config.isDevelopment) {
    // Serve the Vite-built frontend from dist/
    await app.register(fastifyStatic, {
      root: join(process.cwd(), 'dist'),
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback — serve index.html for unmatched routes
    app.setNotFoundHandler((_request, reply) => {
      void reply.sendFile('index.html');
    });
  }

  /* ==============================================
     Health Check
     ============================================== */

  app.get('/api/health', () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  /* ==============================================
     Startup Logging
     ============================================== */

  logInfo('Fastify', 'Application configured');

  return app;
}
