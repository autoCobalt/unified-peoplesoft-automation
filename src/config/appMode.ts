/**
 * Application Mode Configuration
 *
 * Determines whether the application is running in development or production mode,
 * and configures SOAP batch submission behavior.
 *
 * All values are compile-time constants derived from environment variables.
 * Vite's dead code elimination removes unreachable branches in production builds.
 *
 * Development mode:
 * - Uses mock data and placeholder servers
 * - Enables dev simulation controls
 * - Shows development banner
 * - SOAP submissions are always sequential (batch mode ignored)
 *
 * Production mode:
 * - Connects to live PeopleSoft & Oracle systems
 * - Hides dev controls
 * - Shows production warning banner
 * - SOAP submissions use batch or sequential mode based on VITE_SOAP_BATCH_MODE
 */

/**
 * Whether the application is running in development mode.
 *
 * This is evaluated once at module load time and never changes.
 * Vite's dead code elimination will remove dev-only code paths
 * when this is `false` in production builds.
 */
export const isDevelopment: boolean =
  ((import.meta.env.VITE_APP_MODE as string | undefined) ?? 'development') === 'development';

/**
 * Whether production SOAP submissions should use batch mode.
 *
 * When `true`, records are grouped by action and sent in chunks of `soapBatchSize`
 * per HTTP request, using the server's `submitBatch()` endpoint.
 * When `false`, records are sent one at a time (original sequential behavior).
 *
 * Development mode always uses sequential submission regardless of this setting.
 * Defaults to `true`.
 */
export const isSoapBatchMode: boolean =
  ((import.meta.env.VITE_SOAP_BATCH_MODE as string | undefined) ?? 'true') === 'true';

/**
 * Number of records per batch HTTP request.
 *
 * Only applies when `isSoapBatchMode` is `true` and running in production mode.
 * Guarded with `Math.max(1, ...)` so it can never be 0 or negative.
 * Defaults to `5`.
 */
export const soapBatchSize: number =
  Math.max(1, parseInt((import.meta.env.VITE_SOAP_BATCH_SIZE as string | undefined) ?? '5', 10) || 5);
