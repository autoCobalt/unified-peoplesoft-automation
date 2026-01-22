/**
 * Secure Logger Utility
 *
 * Provides environment-aware logging that protects sensitive information.
 *
 * In DEVELOPMENT mode:
 * - Full details are logged for debugging
 * - Usernames and connection info visible
 *
 * In PRODUCTION mode:
 * - Sensitive values are redacted
 * - Only essential information logged
 *
 * Why this matters:
 * - Logs are often aggregated to centralized systems (Splunk, ELK, etc.)
 * - These systems may have weaker access controls
 * - Usernames can be used for targeted attacks
 * - Connection strings reveal server topology
 */

/* ==============================================
   Configuration
   ============================================== */

/**
 * Track if we're in development mode
 * Set via initialize() from server middleware
 */
let isDevelopment = true;

/**
 * Initialize the secure logger with environment context
 *
 * @param devMode - Whether running in development mode
 */
export function initializeSecureLogger(devMode: boolean): void {
  isDevelopment = devMode;
}

/* ==============================================
   Redaction Utilities
   ============================================== */

/**
 * Redact a string value for safe logging
 *
 * Shows only first 2 chars and length indicator in production.
 *
 * @example
 * redact('admin_user') // Development: 'admin_user'
 * redact('admin_user') // Production: 'ad***[10]'
 */
export function redact(value: string): string {
  if (isDevelopment) {
    return value;
  }

  if (!value || value.length < 3) {
    return '***';
  }

  // Show first 2 chars + length hint
  return `${value.slice(0, 2)}***[${String(value.length)}]`;
}

/**
 * Redact a connection string
 *
 * Connection strings may contain:
 * - Server hostnames (topology info)
 * - Port numbers (attack surface)
 * - Service names (business logic)
 *
 * @example
 * redactConnectionString('host:1521/PROD') // Development: 'host:1521/PROD'
 * redactConnectionString('host:1521/PROD') // Production: '[REDACTED]'
 */
export function redactConnectionString(connectionString: string): string {
  if (isDevelopment) {
    return connectionString;
  }

  return '[REDACTED]';
}

/* ==============================================
   Logging Functions
   ============================================== */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Core logging function
 */
function log(level: LogLevel, prefix: string, message: string): void {
  const formatted = `[${prefix}] ${message}`;

  switch (level) {
    case 'debug':
      // Debug logs only in development
      if (isDevelopment) {
        console.debug(formatted);
      }
      break;
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * Log with sensitive value (redacted in production)
 *
 * @param prefix - Log prefix (e.g., 'Oracle', 'SOAP')
 * @param template - Message template with {0}, {1} placeholders
 * @param sensitiveValues - Values to redact in production
 */
export function logSensitive(
  prefix: string,
  template: string,
  ...sensitiveValues: string[]
): void {
  const redactedValues = sensitiveValues.map(redact);
  let message = template;

  redactedValues.forEach((value, index) => {
    message = message.replace(`{${String(index)}}`, value);
  });

  log('info', prefix, message);
}

/**
 * Debug log (only in development)
 */
export function logDebug(prefix: string, message: string): void {
  log('debug', prefix, message);
}

/**
 * Info log (always shown)
 */
export function logInfo(prefix: string, message: string): void {
  log('info', prefix, message);
}

/**
 * Warning log (always shown)
 */
export function logWarn(prefix: string, message: string): void {
  log('warn', prefix, message);
}

/**
 * Error log (always shown)
 */
export function logError(prefix: string, message: string): void {
  log('error', prefix, message);
}

/* ==============================================
   Convenience Functions for Common Cases
   ============================================== */

/**
 * Log a connection attempt with redacted username
 */
export function logConnectionAttempt(
  service: 'Oracle' | 'SOAP',
  username: string,
  target: string
): void {
  if (isDevelopment) {
    logInfo(service, `Connecting as ${username} to ${target}`);
  } else {
    logInfo(service, `Connecting as ${redact(username)} to [target]`);
  }
}

/**
 * Log successful connection with redacted details
 */
export function logConnectionSuccess(
  service: 'Oracle' | 'SOAP',
  username: string
): void {
  if (isDevelopment) {
    logInfo(service, `Connected successfully as ${username}`);
  } else {
    logInfo(service, 'Connected successfully');
  }
}

/**
 * Log credentials being set (for session establishment)
 */
export function logCredentialsSet(
  service: 'Oracle' | 'SOAP',
  username: string
): void {
  if (isDevelopment) {
    logInfo(service, `Credentials set for user: ${username}`);
  } else {
    logInfo(service, 'Credentials set');
  }
}
