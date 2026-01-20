/**
 * Playwright Browser Configuration
 *
 * Centralized browser launch options and timeouts.
 * Uses Microsoft Edge (Chromium) for PeopleSoft compatibility.
 */

import type { LaunchOptions } from 'playwright';

/* ==============================================
   Browser Launch Options
   ============================================== */

/**
 * Default browser launch configuration
 * Uses Edge channel for enterprise compatibility
 */
export const BROWSER_OPTIONS: LaunchOptions = {
  channel: 'msedge',
  headless: false, // Visible browser for user oversight
  args: [
    '--window-size=800,600',
    '--disable-blink-features=AutomationControlled', // Reduce automation detection
  ],
  timeout: 30000, // 30 second launch timeout
};

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
