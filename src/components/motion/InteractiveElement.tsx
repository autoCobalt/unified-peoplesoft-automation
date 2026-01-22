/**
 * InteractiveElement Component
 *
 * Hover/tap feedback wrapper for buttons and clickable elements.
 * Optionally includes entrance animations.
 *
 * @example
 * // Basic button with interaction feedback
 * <InteractiveElement onClick={handleClick}>
 *   Submit
 * </InteractiveElement>
 *
 * @example
 * // Button with entrance animation
 * <InteractiveElement withEntrance entranceType="scaleFade">
 *   <LogoutIcon /> Disconnect
 * </InteractiveElement>
 *
 * @example
 * // Disabled state (no interaction animations)
 * <InteractiveElement disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Submit'}
 * </InteractiveElement>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps, EntranceType } from './types';

interface InteractiveElementOwnProps {
  /** Scale multiplier on hover (default: 1.02) */
  hoverScale?: number;
  /** Scale multiplier on tap/click (default: 0.98) */
  tapScale?: number;
  /** Include entrance animation (default: false) */
  withEntrance?: boolean;
  /** Type of entrance animation (default: 'scaleFade') */
  entranceType?: EntranceType;
  /** Disable interaction animations (default: false) */
  disabled?: boolean;
  /** Duration for entrance animation in seconds (default: 0.1) */
  duration?: number;
}

export type InteractiveElementProps<T extends ElementType = 'button'> =
  PolymorphicMotionProps<T, InteractiveElementOwnProps>;

/**
 * Calculates entrance animation props based on type.
 */
function getEntranceProps(type: EntranceType) {
  switch (type) {
    case 'fade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      };
    case 'scale':
      return {
        initial: { scale: 0.95 },
        animate: { scale: 1 },
      };
    case 'scaleFade':
    default:
      return {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
      };
  }
}

/**
 * Interactive element with hover/tap feedback.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function InteractiveElement<T extends ElementType = 'button'>({
  children,
  as,
  className,
  hoverScale = 1.02,
  tapScale = 0.98,
  withEntrance = false,
  entranceType = 'scaleFade',
  disabled = false,
  duration = 0.1,
  ...rest
}: InteractiveElementProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'button') as keyof typeof motion
  ] as typeof motion.button;

  // Disable animations when reduced motion is preferred or component is disabled
  const shouldAnimate = !prefersReducedMotion && !disabled;

  // Build entrance props if needed
  const entranceProps = withEntrance ? getEntranceProps(entranceType) : {};

  return (
    <Component
      className={className}
      disabled={disabled}
      {...entranceProps}
      whileHover={shouldAnimate ? { scale: hoverScale } : undefined}
      whileTap={shouldAnimate ? { scale: tapScale } : undefined}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
