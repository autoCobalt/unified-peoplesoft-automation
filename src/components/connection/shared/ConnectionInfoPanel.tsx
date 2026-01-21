/**
 * ConnectionInfoPanel Component
 *
 * Expandable panel for displaying connection configuration details.
 * Has two modes: full (with label) for forms, compact (icon only) for connected state.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { expandCollapseQuick } from '../../../utils/motion';
import { ChevronIcon } from '../../icons';

interface ConnectionInfoPanelProps {
  /** Whether the info panel is expanded */
  isOpen: boolean;
  /** Callback to toggle open/closed state */
  onToggle: () => void;
  /** Compact mode shows only the chevron icon (for connected state) */
  compact?: boolean;
  /** Optional badge shown next to the toggle label */
  badge?: React.ReactNode;
  /** InfoRow components to display when expanded */
  children: React.ReactNode;
}

export function ConnectionInfoPanel({
  isOpen,
  onToggle,
  compact = false,
  badge,
  children,
}: ConnectionInfoPanelProps) {
  if (compact) {
    // Compact mode: just the chevron button
    return (
      <>
        <button
          type="button"
          className="info-toggle-compact"
          onClick={onToggle}
          title="Connection Info"
        >
          <ChevronIcon className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="info-content"
              {...expandCollapseQuick}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Full mode: toggle button with label + badge
  return (
    <div className="connection-info">
      <button
        type="button"
        className="info-toggle"
        onClick={onToggle}
      >
        <ChevronIcon className={`chevron ${isOpen ? 'open' : ''}`} />
        Connection Info
        {badge && <span className="info-badge">{badge}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="info-content"
            {...expandCollapseQuick}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
