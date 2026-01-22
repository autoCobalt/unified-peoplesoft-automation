/**
 * ScaleIn Component
 *
 * Scale up + fade entrance animation for panels and cards.
 * Creates a subtle "pop" effect as content appears.
 *
 * @example
 * // Panel entrance
 * <ScaleIn as="section" className="feature-panel">
 *   <SmartFormContent />
 * </ScaleIn>
 *
 * @example
 * // Card with custom scale
 * <ScaleIn initialScale={0.9} duration={0.2}>
 *   <CardContent />
 * </ScaleIn>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps } from './types';

interface ScaleInOwnProps {
  /** Starting scale value between 0 and 1 (default: 0.95) */
  initialScale?: number;
  /** Animation duration in seconds (default: 0.1) */
  duration?: number;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Include exit animation for AnimatePresence contexts (default: true) */
  withExit?: boolean;
}

export type ScaleInProps<T extends ElementType = 'div'> =
  PolymorphicMotionProps<T, ScaleInOwnProps>;

/**
 * Scale + fade entrance animation component.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function ScaleIn<T extends ElementType = 'div'>({
  children,
  as,
  className,
  initialScale = 0.95,
  duration = 0.1,
  delay = 0,
  withExit = true,
  ...rest
}: ScaleInProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveDuration = prefersReducedMotion ? 0 : duration;

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'div') as keyof typeof motion
  ] as typeof motion.div;

  return (
    <Component
      className={className}
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={withExit ? { opacity: 0, scale: initialScale } : undefined}
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
