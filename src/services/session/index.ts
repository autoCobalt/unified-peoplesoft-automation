/**
 * Session Module
 *
 * Exports client-side session management utilities.
 */

export {
  setSessionToken,
  getSessionToken,
  clearSessionToken,
  hasSessionToken,
  getSessionHeaders,
  checkSessionStatus,
  SESSION_HEADER,
} from './sessionStore.js';

export type { SessionStatusResponse } from './sessionStore.js';
