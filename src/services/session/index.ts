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
  SESSION_HEADER,
} from './sessionStore.js';
