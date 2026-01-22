/**
 * ModeBanner Component
 *
 * Displays a banner at the top of the application indicating
 * whether the app is running in development or production mode.
 *
 * - Development: Green banner with simulation controls
 * - Production: Red banner warning of live system connection
 *
 * Animates in from the top with a slide-down fade effect.
 */

import { motion } from 'framer-motion';
import { isDevelopment } from '../../config';
import { DevControls } from './DevControls';
import './ModeBanner.css';

/* ==============================================
   Mode Configuration
   ============================================== */

interface ModeConfig {
  className: string;
  label: string;
  description: string;
}

const MODE_CONFIG: Record<'development' | 'production', ModeConfig> = {
  development: {
    className: 'mode-development',
    label: 'Development Mode',
    description: '— Using mock data and placeholder servers',
  },
  production: {
    className: 'mode-production',
    label: 'Production Mode',
    description: '— Connected to live PeopleSoft & Oracle systems',
  },
};

/* ==============================================
   Component
   ============================================== */

export function ModeBanner() {
  const config = MODE_CONFIG[isDevelopment ? 'development' : 'production'];

  return (
    <motion.div
      className={`mode-banner ${config.className}`}
      initial={{ y: '-100%' }}
      animate={{ y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      <div className="mode-info">
        <span className="mode-indicator" />
        <span className="mode-text">{config.label}</span>
        <span className="mode-description">{config.description}</span>
      </div>

      {isDevelopment && <DevControls />}
    </motion.div>
  );
}
