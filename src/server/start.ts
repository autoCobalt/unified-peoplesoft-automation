/**
 * Server Entry Point
 *
 * Starts the Fastify server and handles graceful shutdown.
 * Run with: tsx watch src/server/start.ts (development)
 *       or: tsx src/server/start.ts (production)
 */

import { buildApp } from './app.js';
import { buildServerConfig } from './config.js';
import { logInfo, logError } from './utils/index.js';
import { sessionService } from './auth/index.js';
import { wsManager } from './services/wsManager.js';
import { eventBus } from './events/index.js';

async function main(): Promise<void> {
  const config = buildServerConfig();
  const app = await buildApp(config);

  /* ==============================================
     Graceful Shutdown
     ============================================== */

  const shutdown = async (signal: string): Promise<void> => {
    logInfo('Server', `${signal} received, shutting down gracefully...`);
    wsManager.shutdown();
    eventBus.shutdown();
    sessionService.shutdown();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  /* ==============================================
     Start Listening
     ============================================== */

  try {
    await app.listen({ port: config.port, host: config.host });
    logInfo('Server', `Fastify server listening on http://${config.host}:${String(config.port)}`);
    logInfo('Server', `Mode: ${config.isDevelopment ? 'development' : 'production'}`);
  } catch (error) {
    logError('Server', `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

void main();
