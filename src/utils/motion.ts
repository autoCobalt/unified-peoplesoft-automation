/**
 * Framer Motion Utilities
 *
 * Reusable animation configurations for consistent motion across components.
 * Import these presets to maintain uniform animation timing and behavior.
 *
 * Organization:
 * 1. Transition Timing - Raw duration/easing presets
 * 2. Spreadable Transitions - Objects with `transition` key for spreading
 * 3. Fade Animations - Opacity-based entrances/exits
 * 4. Slide Animations (Vertical) - Y-axis movement
 * 5. Slide Animations (Horizontal) - X-axis movement
 * 6. Scale Animations - Size-based transitions
 * 7. Expand/Collapse - Height-based animations
 * 8. Card Stack / 3D - Complex directional variants
 * 9. Interactive Presets - Hover/tap feedback
 * 10. Stagger Animations - Parent/child cascading
 */

import type { Variants, Transition } from 'framer-motion';

/* ==============================================
   1. Transition Timing Presets
   ============================================== */

/** Fast transition (0.1s) - for subtle, snappy animations */
export const transitionFast: Transition = {
  duration: 0.1,
};

/** Quick transition (0.2s) - for tab/panel switching */
export const transitionQuick: Transition = {
  duration: 0.2,
};

/** Default transition (0.4s) - standard timing for most animations */
export const transitionDefault: Transition = {
  duration: 0.4,
};

/* ==============================================
   2. Spreadable Transition Presets
   ============================================== */

/**
 * Spring transition for layout animations
 * Use for: Tab indicators, layoutId elements
 * Spread directly: {...transitionSpring}
 */
export const transitionSpring = {
  transition: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
  } as Transition,
};

/* ==============================================
   3. Fade Animations
   ============================================== */

/**
 * Simple fade in
 * Use for: Sections, containers, subtle entrances
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: transitionFast,
};

/**
 * Fade in/out for AnimatePresence contexts
 * Use for: Content that appears/disappears (connected states, form toggles)
 */
export const fadeInOut = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: transitionQuick,
};

/* ==============================================
   4. Slide Animations (Vertical)
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
 * Slide down from off-screen (banner entrance)
 * Use for: Mode banners, notification bars that slide in from top
 */
export const slideDownBanner = {
  initial: { opacity: 1, y: '-100%' },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay: 0.5 },
};

/**
 * Small slide down + fade (for error messages, tooltips)
 * Use for: Error messages, notifications that appear above content
 */
export const slideDownSmallFade = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: transitionQuick,
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

/** Slide up with stagger delay (for sequential entrance) */
export const slideUpFadeDelay = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.1 },
};

/** Slide up with instant exit (for titles in AnimatePresence) */
export const slideUpFadeInstantExit = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.4, exit: { duration: 0 } },
};

/* ==============================================
   5. Slide Animations (Horizontal)
   ============================================== */

/**
 * Slide in from left + fade
 * Use for: Left-positioned panels
 */
export const slideLeftFade = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: transitionDefault,
};

/** Slide from left with stagger delay (first in sequence) */
export const slideLeftFadeStagger = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, delay: 0.1 },
};

/**
 * Slide in from right + fade
 * Use for: Right-positioned panels
 */
export const slideRightFade = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: transitionDefault,
};

/** Slide from right with stagger delay (second in sequence) */
export const slideRightFadeStagger = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, delay: 0.2 },
};

/**
 * Horizontal slide variants for bidirectional tab/panel switching
 * Use with AnimatePresence mode="wait"
 * Direction: 1 = slide from right, -1 = slide from left
 *
 * @example
 * <AnimatePresence mode="wait">
 *   <motion.div
 *     key={activeTab}
 *     custom={direction}
 *     variants={slideHorizontalVariants}
 *     initial="enter"
 *     animate="center"
 *     exit="exit"
 *     transition={transitionQuick}
 *   />
 * </AnimatePresence>
 */
export const slideHorizontalVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : -20,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
  }),
};

/* ==============================================
   6. Scale Animations
   ============================================== */

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

/* ==============================================
   7. Expand/Collapse Animations
   ============================================== */

/**
 * Expand/collapse with fade
 * Use for: Collapsible sections, accordion content
 */
export const expandCollapse = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.3 },
};

/** Expand/collapse with quick timing (for info panels, tooltips) */
export const expandCollapseQuick = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
  transition: transitionQuick,
};

/* ==============================================
   8. Card Stack / 3D Animations
   ============================================== */

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

/* ==============================================
   9. Interactive Presets (Hover/Tap)
   ============================================== */

/**
 * Button hover/tap feedback
 * Use for: All interactive buttons
 */
export const buttonInteraction = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

/**
 * Scale+fade entrance with button interaction
 * Use for: Buttons that appear/disappear (disconnect, close, etc.)
 */
export const buttonScaleFade = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

/* ==============================================
   10. Stagger Animations
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
      staggerChildren: 0.13,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25 },
  },
};
