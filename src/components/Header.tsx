import { motion } from 'framer-motion';
import { useConnection } from '../context';
import { slideDownFade, buttonScaleFade } from '../utils';
import { AppLogoIcon, LogoutIcon } from './icons';

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
  const { oracleState, soapState, disconnectAll } = useConnection();

  const hasActiveConnection = oracleState.isConnected || soapState.isConnected;

  return (
    <motion.header
      className="header"
      {...slideDownFade}
    >
      <div className="header-content">
        <div className="header-title">
          <AppLogoIcon className="header-icon" />
          <h1>
            <span className="title-full">Unified PeopleSoft Automation</span>
            <span className="title-short">PeopleSoft Automation</span>
            <span className="title-tiny">PS Automation</span>
          </h1>
        </div>

        {hasActiveConnection && (
          <motion.button
            className="disconnect-button"
            onClick={disconnectAll}
            {...buttonScaleFade}
          >
            <LogoutIcon />
            Disconnect
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}
