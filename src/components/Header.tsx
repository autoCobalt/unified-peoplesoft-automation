import { AnimatePresence, motion } from 'framer-motion';
import { useConnection } from '../context';
import { slideDownFade, buttonScaleFade } from '../utils';
import { AppLogoIcon, LogoutIcon } from './icons';
import { ResponsiveText } from './ResponsiveText';
import './Header.css';

const HEADER_CONFIG = {
  title: {
    full: 'Unified PeopleSoft Automation',
    short: 'PeopleSoft Automation',
  },
  disconnectLabel: 'Disconnect',
} as const;

/**
 * Header Component
 *
 * Displays the application title with a stacked layers icon.
 * The icon matches the favicon design for visual consistency.
 * Uses framer-motion for smooth entrance animation (slide down + fade).
 *
 * Shows a disconnect button when either connection is active.
 */
export function Header() {
  const { hasActiveConnection, disconnectAll } = useConnection();

  return (
    <motion.header
      className="header"
      {...slideDownFade}
    >
      <div className="header-content">
        <div className="header-title">
          <AppLogoIcon className="header-icon" />
          <h1>
            <ResponsiveText
              full={HEADER_CONFIG.title.full}
              short={HEADER_CONFIG.title.short}
            />
          </h1>
        </div>

        <AnimatePresence>
          {hasActiveConnection && (
            <motion.button
              key="disconnect-button"
              className="disconnect-button"
              onClick={disconnectAll}
              {...buttonScaleFade}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <LogoutIcon />
              {HEADER_CONFIG.disconnectLabel}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
