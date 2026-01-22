/**
 * SlideIn Component
 *
 * Directional slide entrance with fade. Consolidates multiple slide presets
 * into a single configurable component.
 *
 * @example
 * // Header sliding down
 * <SlideIn direction="down" as="header">
 *   <HeaderContent />
 * </SlideIn>
 *
 * @example
 * // Small tooltip with quick animation
 * <SlideIn direction="down" offset={10} duration={0.2}>
 *   <Tooltip />
 * </SlideIn>
 *
 * @example
 * // Staggered panels
 * <SlideIn direction="left" delay={0.1}>
 *   <LeftPanel />
 * </SlideIn>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps, SlideDirection } from './types';

interface SlideInOwnProps {
  /** Direction to slide from (default: 'up') */
  direction?: SlideDirection;
  /** Distance to slide in pixels (default: 20) */
  offset?: number;
  /** Animation duration in seconds (default: 0.4) */
  duration?: number;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Include exit animation for AnimatePresence contexts (default: false) */
  withExit?: boolean;
  /** Use instant exit (opacity only, no slide) for titles (default: false) */
  instantExit?: boolean;
}

export type SlideInProps<T extends ElementType = 'div'> =
  PolymorphicMotionProps<T, SlideInOwnProps>;

/**
 * Calculates the initial position based on direction and offset.
 */
function getInitialPosition(direction: SlideDirection, offset: number) {
  switch (direction) {
    case 'up':
      return { x: 0, y: offset };
    case 'down':
      return { x: 0, y: -offset };
    case 'left':
      return { x: -offset, y: 0 };
    case 'right':
      return { x: offset, y: 0 };
  }
}

/**
 * Directional slide entrance animation component.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function SlideIn<T extends ElementType = 'div'>({
  children,
  as,
  className,
  direction = 'up',
  offset = 20,
  duration = 0.4,
  delay = 0,
  withExit = false,
  instantExit = false,
  ...rest
}: SlideInProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveDuration = prefersReducedMotion ? 0 : duration;

  const initialPos = getInitialPosition(direction, offset);

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'div') as keyof typeof motion
  ] as typeof motion.div;

  // Calculate exit animation
  const exitAnimation = (() => {
    if (!withExit) return undefined;
    if (instantExit) return { opacity: 0 };
    return { opacity: 0, ...initialPos };
  })();

  return (
    <Component
      className={className}
      initial={{ opacity: 0, ...initialPos }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={exitAnimation}
      transition={{
        duration: effectiveDuration,
        delay: prefersReducedMotion ? 0 : delay,
        ...(withExit && instantExit && { exit: { duration: 0 } }),
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
