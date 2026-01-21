/**
 * ConnectedHeader Component
 *
 * Single-line header displayed when a connection is established.
 * Shows title, optional subtitle, username badge, and expandable info.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { fadeInOut, expandCollapseQuick } from '../../../utils/motion';
import { ChevronIcon } from '../../icons';

interface ConnectedHeaderProps {
  /** Connection title (e.g., "Oracle", "PeopleSoft") */
  title: string;
  /** Optional subtitle shown after title (e.g., service name) */
  subtitle?: React.ReactNode;
  /** Username to display in the badge */
  username: string;
  /** Whether the info panel is expanded */
  showInfo: boolean;
  /** Callback to toggle info visibility */
  onToggleInfo: () => void;
  /** InfoRow components to display when expanded */
  children: React.ReactNode;
}

export function ConnectedHeader({
  title,
  subtitle,
  username,
  showInfo,
  onToggleInfo,
  children,
}: ConnectedHeaderProps) {
  return (
    <motion.div
      key="connected"
      className="connected-single-line"
      {...fadeInOut}
    >
      <div className="connected-line">
        <h2 className="connected-title">
          <span className="title-full">{title}</span>
        </h2>
        {subtitle}
        <div className="connected-user-badge">
          <span>{username}</span>
        </div>
        <button
          type="button"
          className="info-toggle-compact"
          onClick={onToggleInfo}
          title="Connection Info"
        >
          <ChevronIcon className={`chevron ${showInfo ? 'open' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="info-content"
            {...expandCollapseQuick}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
