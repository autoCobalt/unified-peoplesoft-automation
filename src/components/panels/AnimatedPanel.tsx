/**
 * AnimatedPanel Component
 *
 * Wrapper component that applies card-stack 3D animation to tab panels.
 * All tab content should be wrapped in this component for consistent
 * enter/exit animations when switching tabs.
 *
 * The animation direction is based on whether the user is navigating
 * forward (to a higher tab index) or backward (to a lower tab index).
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cardStackVariants, cardStackTransition } from '../../utils';

interface AnimatedPanelProps {
  /** Unique key for AnimatePresence to track (typically the tab ID) */
  panelKey: string;
  /** Animation direction: 1 = forward, -1 = backward */
  direction: number;
  /** The panel content to render */
  children: ReactNode;
}

export function AnimatedPanel({ panelKey, direction, children }: AnimatedPanelProps) {
  return (
    <motion.div
      key={panelKey}
      custom={direction}
      variants={cardStackVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={cardStackTransition}
      style={{
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.div>
  );
}
