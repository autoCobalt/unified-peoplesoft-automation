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
  /** Animation duration in seconds (default: 0.2) */
  duration?: number;
}

/* ==============================================
   Animation Variants
   ============================================== */

/**
 * Slide variants using `custom` for dynamic direction.
 * Custom value: 1 = slide from right, -1 = slide from left
 */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
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
  duration = 0.2,
}: SlideTransitionProps) {
  // Convert direction to numeric value for variants
  const directionValue = direction === 'right' ? 1 : -1;

  return (
    <AnimatePresence mode="wait" custom={directionValue}>
      <motion.div
        key={transitionKey}
        custom={directionValue}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          duration,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
