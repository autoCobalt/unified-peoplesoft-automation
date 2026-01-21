/**
 * Application Mode Configuration
 *
 * Determines whether the application is running in development or production mode.
 * This is a compile-time constant derived from environment variables.
 *
 * Development mode:
 * - Uses mock data and placeholder servers
 * - Enables dev simulation controls
 * - Shows development banner
 *
 * Production mode:
 * - Connects to live PeopleSoft & Oracle systems
 * - Hides dev controls
 * - Shows production warning banner
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
