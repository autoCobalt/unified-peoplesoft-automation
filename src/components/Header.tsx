import { AnimatePresence } from 'framer-motion';
import { useConnection } from '../context';
import { SlideIn, InteractiveElement } from './motion';
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
    <SlideIn
      as="header"
      direction="down"
      className="header"
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
            <InteractiveElement
              key="disconnect-button"
              className="disconnect-button"
              onClick={() => void disconnectAll()}
              withEntrance
              entranceType="scaleFade"
            >
              <LogoutIcon />
              {HEADER_CONFIG.disconnectLabel}
            </InteractiveElement>
          )}
        </AnimatePresence>
      </div>
    </SlideIn>
  );
}
