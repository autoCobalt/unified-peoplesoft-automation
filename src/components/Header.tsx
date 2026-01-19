import { motion } from 'framer-motion';
import { useConnection } from '../context';
import { slideDownFade } from '../utils';

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
      initial={slideDownFade.initial}
      animate={slideDownFade.animate}
      transition={slideDownFade.transition}
    >
      <div className="header-content">
        <div className="header-title">
          <svg
            className="header-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 17L21 12L16 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Disconnect
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}
