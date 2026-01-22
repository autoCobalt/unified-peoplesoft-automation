/**
 * StaggerList Component
 *
 * Parent container for cascading list animations.
 * Use with StaggerItem children for sequential entrance effects.
 *
 * @example
 * // Basic staggered list
 * <StaggerList>
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>
 *       <ItemContent item={item} />
 *     </StaggerItem>
 *   ))}
 * </StaggerList>
 *
 * @example
 * // Custom stagger delay with semantic list
 * <StaggerList as="ol" staggerDelay={0.08} className="wf-checklist">
 *   {tasks.map(task => (
 *     <StaggerItem key={task.id}>
 *       <TaskContent task={task} />
 *     </StaggerItem>
 *   ))}
 * </StaggerList>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ElementType } from 'react';
import type { PolymorphicMotionProps } from './types';

interface StaggerListOwnProps {
  /** Delay between each child animation in seconds (default: 0.13) */
  staggerDelay?: number;
}

export type StaggerListProps<T extends ElementType = 'ul'> =
  PolymorphicMotionProps<T, StaggerListOwnProps>;

/**
 * Creates stagger container variants with custom delay.
 */
function createContainerVariants(staggerDelay: number): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };
}

/**
 * Stagger list container component.
 * Must contain StaggerItem children for the cascade effect.
 * Automatically respects user's `prefers-reduced-motion` preference.
 */
export function StaggerList<T extends ElementType = 'ul'>({
  children,
  as,
  className,
  staggerDelay = 0.13,
  ...rest
}: StaggerListProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'ul') as keyof typeof motion
  ] as typeof motion.ul;

  // When reduced motion is preferred, show immediately without stagger
  const variants = prefersReducedMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      }
    : createContainerVariants(staggerDelay);

  return (
    <Component
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      {...rest}
    >
      {children}
    </Component>
  );
}
