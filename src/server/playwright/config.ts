/**
 * Playwright Browser Configuration
 *
 * Centralized CDP connection options and timeouts.
 * Uses Chrome DevTools Protocol to connect to the user's existing
 * Microsoft Edge browser, inheriting SSO/authentication state.
 */

import { join } from 'node:path';

/* ==============================================
   CDP Connection Configuration
   ============================================== */

/**
 * Auto-detect the default Edge user data directory on Windows.
 * Returns undefined on non-Windows platforms.
 */
function getDefaultEdgeUserDataDir(): string | undefined {
  const localAppData = process.env['LOCALAPPDATA'];
  if (!localAppData) return undefined;
  return join(localAppData, 'Microsoft', 'Edge', 'User Data');
}

/**
 * Get the Edge executable path on Windows.
 * Checks both Program Files locations.
 */
export function getEdgeExecutablePath(): string {
  // Standard install location (64-bit)
  const programFiles = process.env['PROGRAMFILES'] ?? 'C:\\Program Files';
  return join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
}

/**
 * CDP connection configuration.
 * Connects Playwright to an existing Edge browser via Chrome DevTools Protocol,
 * so the automation inherits the user's SSO/Kerberos/Azure AD session state.
 */
export const CDP_CONFIG = {
  /** CDP debugging port */
  port: Number(process.env['VITE_EDGE_DEBUG_PORT']) || 9222,

  /** Edge user data directory (real profile with cookies/SSO) */
  userDataDir: process.env['VITE_EDGE_USER_DATA_DIR'] ?? getDefaultEdgeUserDataDir() ?? '',

  /** Max time (ms) to wait for Edge debug port after launching */
  connectTimeout: 15_000,

  /** Polling interval (ms) when waiting for debug port */
  connectRetryInterval: 300,
} as const;

/* ==============================================
   Timeouts
   ============================================== */

export const TIMEOUTS = {
  /** Browser launch timeout (ms) */
  LAUNCH: 30000,

  /** Page navigation timeout (ms) */
  NAVIGATION: 60000,

  /** Element wait timeout (ms) */
  ELEMENT: 10000,

  /** Action timeout (click, type, etc.) (ms) */
  ACTION: 5000,

  /** Network idle wait timeout (ms) */
  NETWORK_IDLE: 30000,
} as const;

/* ==============================================
   Server Configuration
   ============================================== */

export const SERVER_CONFIG = {
  /** API route prefix */
  API_PREFIX: '/api',

  /** Status polling interval recommendation (ms) */
  POLL_INTERVAL: 1000,
} as const;
