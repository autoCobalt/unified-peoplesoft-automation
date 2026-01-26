/**
 * ExpandCollapse Component
 *
 * Height-based reveal/hide animation for accordion sections and collapsible content.
 * Animates both height and opacity for smooth transitions.
 *
 * @example
 * // Basic accordion section
 * <ExpandCollapse isOpen={showInfo}>
 *   <ConnectionInfoRows />
 * </ExpandCollapse>
 *
 * @example
 * // Quick expand with persistent mount
 * <ExpandCollapse isOpen={expanded} speed="quick" unmountOnCollapse={false}>
 *   <DetailsPanel />
 * </ExpandCollapse>
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps, AnimationSpeed } from './types';

interface ExpandCollapseOwnProps {
  /** Whether content is expanded/visible */
  isOpen: boolean;
  /** Animation speed preset (default: 'default') */
  speed?: AnimationSpeed;
  /** Unmount children when collapsed (default: true) */
  unmountOnCollapse?: boolean;
  /** Overflow behavior (default: 'hidden'). Use 'visible' for dropdowns/tooltips. */
  overflow?: 'hidden' | 'visible';
}

export type ExpandCollapseProps<T extends ElementType = 'div'> =
  PolymorphicMotionProps<T, ExpandCollapseOwnProps>;

/** Duration mapping for speed presets */
const DURATIONS: Record<AnimationSpeed, number> = {
  quick: 0.2,
  default: 0.3,
};

/**
 * Height-based expand/collapse animation component.
 * Automatically respects user's `prefers-reduced-motion` preference.
 *
 * Note: Uses `overflow: hidden` during animation to clip content.
 */
export function ExpandCollapse<T extends ElementType = 'div'>({
  children,
  as,
  className,
  isOpen,
  speed = 'default',
  unmountOnCollapse = true,
  overflow = 'hidden',
  ...rest
}: ExpandCollapseProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0 : DURATIONS[speed];

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'div') as keyof typeof motion
  ] as typeof motion.div;

  const content = (
    <Component
      className={className}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration }}
      style={{ overflow }}
      {...rest}
    >
      {children}
    </Component>
  );

  // When unmountOnCollapse is true, wrap in AnimatePresence
  if (unmountOnCollapse) {
    return <AnimatePresence>{isOpen && content}</AnimatePresence>;
  }

  // When keeping mounted, just toggle visibility
  return (
    <Component
      className={className}
      initial={false}
      animate={{
        opacity: isOpen ? 1 : 0,
        height: isOpen ? 'auto' : 0,
      }}
      transition={{ duration }}
      style={{ overflow }}
      {...rest}
    >
      {children}
    </Component>
  );
}
