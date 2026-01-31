/**
 * Server Utilities
 *
 * Shared utilities for server-side operations.
 */

export {
  initializeSecureLogger,
  redact,
  redactConnectionString,
  logSensitive,
  logDebug,
  logInfo,
  logWarn,
  logError,
  logConnectionAttempt,
  logConnectionSuccess,
  logCredentialsSet,
} from './secureLogger.js';

export {
  MAX_BODY_SIZE,
  parseBody,
  getRawBody,
  sendJson,
  sendInternalError,
} from './httpHelpers.js';

export {
  initializeRedirectCapture,
  isRedirectEnabled,
  captureOracleQuery,
  captureSoapSubmit,
  loadSqlText,
  getStoredOracleConnectionInfo,
} from './redirectCapture.js';
