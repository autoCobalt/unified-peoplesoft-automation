/**
 * SlideTransition Component
 *
 * Reusable horizontal slide animation wrapper for transitioning between content.
 * Uses Framer Motion's AnimatePresence for enter/exit animations.
 *
 * Usage:
 * ```tsx
 * <SlideTransition transitionKey={activeTab} direction={direction}>
 *   <TabContent />
 * </SlideTransition>
 * ```
 *
 * The component handles:
 * - AnimatePresence for mounting/unmounting
 * - Directional slide (left or right)
 * - Configurable animation speed
 */

import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ==============================================
   Types
   ============================================== */

type SlideDirection = 'left' | 'right';

interface SlideTransitionProps {
  /** Unique key to trigger transition when changed */
  transitionKey: string;
  /** Direction content slides FROM when entering */
  direction: SlideDirection;
  /** Content to animate */
  children: ReactNode;
  /** Optional className for the motion wrapper */
  className?: string;
  /** Animation duration in seconds (default: 0.15) */
  duration?: number;
  /** AnimatePresence mode (default: 'popLayout' for simultaneous transitions) */
  mode?: 'wait' | 'sync' | 'popLayout';
}

/* ==============================================
   Animation Variants
   ============================================== */

/**
 * Slide variants using `custom` for dynamic direction.
 * Custom value: 1 = slide from right, -1 = slide from left
 *
 * Uses smaller offset (24px) for snappy feel with popLayout mode.
 */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -24 : 24,
    opacity: 0,
  }),
};

/* ==============================================
   Component
   ============================================== */

export function SlideTransition({
  transitionKey,
  direction,
  children,
  className,
  duration = 0.15,
  mode = 'popLayout',
}: SlideTransitionProps) {
  // Convert direction to numeric value for variants
  const directionValue = direction === 'right' ? 1 : -1;

  return (
    <AnimatePresence mode={mode} custom={directionValue}>
      <motion.div
        key={transitionKey}
        custom={directionValue}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
