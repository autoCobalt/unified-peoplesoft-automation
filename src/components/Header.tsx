import { motion } from 'framer-motion';
import { slideDownFade } from '../utils';

/**
 * Header Component
 *
 * Displays the application title with a stacked layers icon.
 * The icon matches the favicon design for visual consistency.
 * Uses framer-motion for smooth entrance animation (slide down + fade).
 */
export function Header() {
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
          <h1>Unified PeopleSoft Automation</h1>
        </div>
      </div>
    </motion.header>
  );
}
