/**
 * FadeIn Component
 *
 * Simple fade entrance animation with optional exit support.
 * Wraps content in an animated container that fades from transparent to opaque.
 *
 * @example
 * // Basic usage
 * <FadeIn>
 *   <ConnectionPanel />
 * </FadeIn>
 *
 * @example
 * // With AnimatePresence support
 * <AnimatePresence>
 *   {isVisible && (
 *     <FadeIn withExit delay={0.2} as="section">
 *       <Content />
 *     </FadeIn>
 *   )}
 * </AnimatePresence>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps } from './types';

interface FadeInOwnProps {
  /** Animation duration in seconds (default: 0.1) */
  duration?: number;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Include exit animation for AnimatePresence contexts (default: false) */
  withExit?: boolean;
}

export type FadeInProps<T extends ElementType = 'div'> = PolymorphicMotionProps<
  T,
  FadeInOwnProps
>;

/**
 * Fade entrance animation component.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function FadeIn<T extends ElementType = 'div'>({
  children,
  as,
  className,
  duration = 0.1,
  delay = 0,
  withExit = false,
  ...rest
}: FadeInProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveDuration = prefersReducedMotion ? 0 : duration;

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'div') as keyof typeof motion
  ] as typeof motion.div;

  return (
    <Component
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={withExit ? { opacity: 0 } : undefined}
      transition={{
        duration: effectiveDuration,
        delay: prefersReducedMotion ? 0 : delay,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
