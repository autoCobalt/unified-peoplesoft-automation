/**
 * Server Configuration
 *
 * Centralizes environment-driven configuration for the Fastify server.
 * Reads from process.env and .env files (via dotenv-style loading).
 *
 * In development, tsx + vite handle env loading.
 * In production, environment variables should be set externally.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/* ==============================================
   Types
   ============================================== */

export interface ServerConfig {
  /** Server port (default: 3001) */
  port: number;

  /** Server host (default: localhost) */
  host: string;

  /** Whether running in development mode */
  isDevelopment: boolean;

  /** CORS allowed origins */
  allowedOrigins: string[];

  /** Full environment variables map */
  env: Record<string, string>;
}

/* ==============================================
   .env File Loading
   ============================================== */

/**
 * Simple .env file parser (no external dependency needed).
 * Parses KEY=VALUE lines, ignoring comments and empty lines.
 */
function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Load environment variables from .env files (Vite-compatible order).
 * Only sets values not already present in process.env.
 */
function loadEnvFiles(): Record<string, string> {
  const cwd = process.cwd();
  const mode = process.env['NODE_ENV'] === 'production' ? 'production' : 'development';

  // Load in priority order (later files take precedence for our merged map,
  // but process.env always wins)
  const envFiles = [
    join(cwd, '.env'),
    join(cwd, `.env.${mode}`),
    join(cwd, '.env.local'),
    join(cwd, `.env.${mode}.local`),
  ];

  const merged: Record<string, string> = {};

  for (const file of envFiles) {
    const vars = loadEnvFile(file);
    for (const [key, value] of Object.entries(vars)) {
      merged[key] = value;
    }
  }

  // process.env overrides file-based values
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

/* ==============================================
   Configuration Builder
   ============================================== */

export function buildServerConfig(): ServerConfig {
  const env = loadEnvFiles();

  const isDevelopment = env['VITE_APP_MODE'] === 'development' ||
    env['NODE_ENV'] !== 'production';

  const port = Number(env['VITE_SERVER_PORT']) || 3001;
  const host = env['VITE_SERVER_HOST'] ?? 'localhost';

  // Build allowed CORS origins
  const configuredOrigins = env['VITE_ALLOWED_ORIGINS'];
  const allowedOrigins: string[] = isDevelopment
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : (configuredOrigins ? configuredOrigins.split(',').map(o => o.trim()).filter(Boolean) : []);

  return {
    port,
    host,
    isDevelopment,
    allowedOrigins,
    env,
  };
}
