/**
 * Framer Motion Utilities
 *
 * Reusable animation configurations for consistent motion across components.
 * Import these presets to maintain uniform animation timing and behavior.
 */

import type { Variants, Transition } from 'framer-motion';

/* ==============================================
   Transition Presets
   ============================================== */

/** Standard transition for most animations */
export const transitionDefault: Transition = {
  duration: 0.4,
};

/** Faster transition for subtle animations */
export const transitionFast: Transition = {
  duration: 0.1,
};

/** Spring transition for tab indicators and layout animations */
export const transitionSpring: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

/* ==============================================
   Animation Presets (Initial/Animate pairs)
   ============================================== */

/**
 * Slide down from top + fade in
 * Use for: Header, top-positioned elements
 */
export const slideDownFade = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: transitionDefault,
};

/**
 * Slide up from bottom + fade in
 * Use for: Navigation, bottom-positioned elements
 */
export const slideUpFade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: transitionDefault,
};

/**
 * Scale up + fade in
 * Use for: Panels, cards, modal content
 */
export const scaleFade = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: transitionFast,
};

/**
 * Card stack 3D transition
 * Use for: Tab panels, page transitions
 * Requires: direction prop (1 = forward, -1 = backward)
 */
export const cardStackVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    rotateY: direction > 0 ? 25 : -25,
    rotateZ: direction > 0 ? 12 : -12,
    scale: 0.88,
    opacity: 0,
    filter: 'blur(3px)',
  }),
  center: {
    x: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    rotateY: direction > 0 ? -25 : 25,
    rotateZ: direction > 0 ? -12 : 12,
    scale: 0.88,
    opacity: 0,
    filter: 'blur(3px)',
  }),
};

export const cardStackTransition: Transition = {
  x: { type: 'spring', stiffness: 300, damping: 28 },
  rotateY: { type: 'spring', stiffness: 300, damping: 28 },
  rotateZ: { type: 'spring', stiffness: 300, damping: 28 },
  scale: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  opacity: { duration: 0.2, ease: 'easeOut' },
  filter: { duration: 0.2 },
};

/**
 * Simple fade in
 * Use for: Sections, containers, subtle entrances
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: transitionFast,
};

/* ==============================================
   Interactive Presets
   ============================================== */

/**
 * Button hover/tap feedback
 * Use for: All interactive buttons
 */
export const buttonInteraction = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

/* ==============================================
   Variant Presets (for complex animations)
   ============================================== */

/**
 * Staggered children animation
 * Use with motion parent + children for cascading effect
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionDefault,
  },
};

/* ==============================================
   Delay Utilities
   ============================================== */

/**
 * Create a delayed version of any animation preset
 */
export function withDelay<T extends { transition?: Transition }>(
  preset: T,
  delay: number
): T {
  return {
    ...preset,
    transition: {
      ...preset.transition,
      delay,
    },
  };
}
