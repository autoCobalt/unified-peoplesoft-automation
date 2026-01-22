/**
 * StaggerItem Component
 *
 * Child component for staggered list animations.
 * Must be used inside a StaggerList parent for proper cascade timing.
 *
 * @example
 * // With slide up animation (default)
 * <StaggerList>
 *   <StaggerItem>First item</StaggerItem>
 *   <StaggerItem>Second item</StaggerItem>
 * </StaggerList>
 *
 * @example
 * // With fade-only animation
 * <StaggerList>
 *   {items.map(item => (
 *     <StaggerItem key={item.id} animation="fadeIn">
 *       <ItemContent item={item} />
 *     </StaggerItem>
 *   ))}
 * </StaggerList>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps, StaggerAnimation } from './types';

interface StaggerItemOwnProps {
  /** Animation type for this item (default: 'slideUp') */
  animation?: StaggerAnimation;
  /** Y offset for slide animation in pixels (default: 18) */
  offset?: number;
  /** Animation duration in seconds (default: 0.25) */
  duration?: number;
}

export type StaggerItemProps<T extends ElementType = 'li'> =
  PolymorphicMotionProps<T, StaggerItemOwnProps>;

/**
 * Creates item variants based on animation type.
 */
function createItemVariants(
  animation: StaggerAnimation,
  offset: number,
  duration: number,
): Variants {
  if (animation === 'fadeIn') {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { duration },
      },
    };
  }

  // Default: slideUp
  return {
    hidden: { opacity: 0, y: offset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration },
    },
  };
}

/**
 * Reduced motion variants (instant visibility).
 */
const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/**
 * Stagger list item component.
 * Animates as part of a StaggerList cascade.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function StaggerItem<T extends ElementType = 'li'>({
  children,
  as,
  className,
  animation = 'slideUp',
  offset = 18,
  duration = 0.25,
  ...rest
}: StaggerItemProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'li') as keyof typeof motion
  ] as typeof motion.li;

  const variants = prefersReducedMotion
    ? reducedMotionVariants
    : createItemVariants(animation, offset, duration);

  return (
    <Component className={className} variants={variants} {...rest}>
      {children}
    </Component>
  );
}
