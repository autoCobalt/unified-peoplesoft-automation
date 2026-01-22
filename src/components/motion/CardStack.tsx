/**
 * CardStack Component
 *
 * 3D card transition wrapper for tab/page switching.
 * Creates a dynamic, perspective-based animation as content changes.
 *
 * @example
 * // Tab panel transition
 * <CardStack
 *   transitionKey={`${activeTab}-${transitionId}`}
 *   direction={direction}
 * >
 *   <ActivePanel />
 * </CardStack>
 *
 * @example
 * // Without perspective wrapper
 * <CardStack
 *   transitionKey={currentPage}
 *   direction={pageDirection}
 *   withPerspective={false}
 * >
 *   <PageContent />
 * </CardStack>
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';
import type { ElementType, Key } from 'react';
import type {
  PolymorphicMotionProps,
  PresenceMode,
  AnimationDirection,
} from './types';

interface CardStackOwnProps {
  /** Key to trigger transition when changed */
  transitionKey: Key;
  /** Direction: 1 = forward, -1 = backward */
  direction: AnimationDirection;
  /** AnimatePresence mode (default: 'popLayout') */
  mode?: PresenceMode;
  /** Apply perspective wrapper for 3D effect (default: true) */
  withPerspective?: boolean;
}

export type CardStackProps<T extends ElementType = 'div'> =
  PolymorphicMotionProps<T, CardStackOwnProps>;

/**
 * Full 3D card stack variants.
 * Includes rotation, scale, blur, and position changes.
 */
const cardStackVariants: Variants = {
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

/**
 * Reduced motion variants (simple fade).
 */
const reducedMotionVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Transition timing for card stack animation.
 */
const cardStackTransition: Transition = {
  x: { type: 'spring', stiffness: 300, damping: 28 },
  rotateY: { type: 'spring', stiffness: 300, damping: 28 },
  rotateZ: { type: 'spring', stiffness: 300, damping: 28 },
  scale: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  opacity: { duration: 0.2, ease: 'easeOut' },
  filter: { duration: 0.2 },
};

/**
 * Reduced motion transition (quick fade).
 */
const reducedMotionTransition: Transition = {
  duration: 0.15,
};

/**
 * 3D card stack transition component for tab/page switching.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function CardStack<T extends ElementType = 'div'>({
  children,
  as,
  className,
  transitionKey,
  direction,
  mode = 'popLayout',
  withPerspective = true,
  ...rest
}: CardStackProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'div') as keyof typeof motion
  ] as typeof motion.div;

  const variants = prefersReducedMotion
    ? reducedMotionVariants
    : cardStackVariants;
  const transition = prefersReducedMotion
    ? reducedMotionTransition
    : cardStackTransition;

  const content = (
    <AnimatePresence mode={mode} custom={direction}>
      <Component
        key={String(transitionKey)}
        className={className}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        {...rest}
      >
        {children}
      </Component>
    </AnimatePresence>
  );

  // Wrap in perspective container if enabled
  if (withPerspective && !prefersReducedMotion) {
    return <div style={{ perspective: '1200px' }}>{content}</div>;
  }

  return content;
}
