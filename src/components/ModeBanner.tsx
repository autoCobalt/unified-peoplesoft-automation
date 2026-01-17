import './ModeBanner.css';

// Application mode from environment variables
const appMode = (import.meta.env.VITE_APP_MODE as string | undefined) ?? 'development';
const isDevelopment = appMode === 'development';

/**
 * ModeBanner Component
 *
 * Displays a fixed banner at the top of the application indicating
 * whether the app is running in development or production mode.
 * - Development: Green banner, uses mock data and placeholder servers
 * - Production: Red banner, connects to live PeopleSoft & Oracle systems
 */
export function ModeBanner() {
  return (
    <div className={`mode-banner ${isDevelopment ? 'mode-development' : 'mode-production'}`}>
      <span className="mode-indicator"></span>
      <span className="mode-text">
        {isDevelopment ? 'Development Mode' : 'Production Mode'}
      </span>
      <span className="mode-description">
        {isDevelopment
          ? '— Using mock data and placeholder servers'
          : '— Connected to live PeopleSoft & Oracle systems'}
      </span>
    </div>
  );
}
