import { motion } from 'framer-motion';
import './ModeBanner.css';

// Application mode from environment variables
const appMode = (import.meta.env.VITE_APP_MODE as string | undefined) ?? 'development';
const isDevelopment = appMode === 'development';

/**
 * ModeBanner Component
 *
 * Displays a banner at the top of the application indicating
 * whether the app is running in development or production mode.
 * - Development: Green banner, uses mock data and placeholder servers
 * - Production: Red banner, connects to live PeopleSoft & Oracle systems
 *
 * Animates in from the top with a slide-down fade effect.
 */
export function ModeBanner() {
  return (
    <motion.div
      className={`mode-banner ${isDevelopment ? 'mode-development' : 'mode-production'}`}
      initial={{ opacity: 1, y: '-100%' }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      <span className="mode-indicator"></span>
      <span className="mode-text">
        {isDevelopment ? 'Development Mode' : 'Production Mode'}
      </span>
      <span className="mode-description">
        {isDevelopment
          ? '— Using mock data and placeholder servers'
          : '— Connected to live PeopleSoft & Oracle systems'}
      </span>
    </motion.div>
  );
}
