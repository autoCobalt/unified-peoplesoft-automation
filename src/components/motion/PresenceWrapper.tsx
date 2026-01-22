/**
 * PresenceWrapper Component
 *
 * Generic AnimatePresence wrapper for content switching scenarios.
 * Handles enter/exit animations when content changes based on a key.
 *
 * @example
 * // Fade between states
 * <PresenceWrapper
 *   transitionKey={isConnected ? 'connected' : 'form'}
 *   mode="wait"
 * >
 *   {isConnected ? <ConnectedView /> : <LoginForm />}
 * </PresenceWrapper>
 *
 * @example
 * // Horizontal slide for tabs
 * <PresenceWrapper
 *   transitionKey={activeTab}
 *   variant="slideHorizontal"
 *   direction={direction}
 * >
 *   <TabContent />
 * </PresenceWrapper>
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ElementType, Key } from 'react';
import type {
  PolymorphicMotionProps,
  PresenceVariant,
  PresenceMode,
  AnimationDirection,
} from './types';

interface PresenceWrapperOwnProps {
  /** Key to trigger transition when changed */
  transitionKey: Key;
  /** Animation variant type (default: 'fade') */
  variant?: PresenceVariant;
  /** Direction for directional variants (default: 1) */
  direction?: AnimationDirection;
  /** AnimatePresence mode (default: 'wait') */
  mode?: PresenceMode;
  /** Animation duration in seconds (default: 0.2) */
  duration?: number;
}

export type PresenceWrapperProps<T extends ElementType = 'div'> =
  PolymorphicMotionProps<T, PresenceWrapperOwnProps>;

/**
 * Creates variants based on the selected animation type.
 * Returns Variants object - slideHorizontal uses custom functions for direction.
 */
function createVariants(variant: PresenceVariant, duration: number): Variants {
  switch (variant) {
    case 'scale':
      return {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1, transition: { duration } },
        exit: { opacity: 0, scale: 0.95, transition: { duration } },
      };

    case 'slideHorizontal':
      // Uses custom prop for direction-aware animation
      return {
        initial: (dir: number) => ({
          opacity: 0,
          x: dir > 0 ? 20 : -20,
        }),
        animate: {
          opacity: 1,
          x: 0,
          transition: { duration },
        },
        exit: (dir: number) => ({
          opacity: 0,
          x: dir > 0 ? -20 : 20,
          transition: { duration },
        }),
      };

    case 'fade':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration } },
        exit: { opacity: 0, transition: { duration } },
      };
  }
}

/**
 * Styles for popLayout container to clip exiting elements.
 * position: relative ensures absolute-positioned exit element stays contained.
 * overflow: hidden clips content that extends beyond container bounds.
 */
const popLayoutContainerStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
};

/**
 * AnimatePresence wrapper for content transitions.
 * Automatically respects user's `prefers-reduced-motion` preference.
 *
 * When using mode="popLayout", wraps content in a container with
 * overflow:hidden to prevent exiting elements from overlapping siblings.
 */
export function PresenceWrapper<T extends ElementType = 'div'>({
  children,
  as,
  className,
  transitionKey,
  variant = 'fade',
  direction = 1,
  mode = 'wait',
  duration = 0.2,
  ...rest
}: PresenceWrapperProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveDuration = prefersReducedMotion ? 0 : duration;

  // Use type assertion for polymorphic component
  const Component = motion[
    (as || 'div') as keyof typeof motion
  ] as typeof motion.div;

  const variants = createVariants(variant, effectiveDuration);
  const needsCustom = variant === 'slideHorizontal';

  const animatePresenceContent = (
    <AnimatePresence mode={mode} custom={direction}>
      <Component
        key={String(transitionKey)}
        className={className}
        custom={needsCustom ? direction : undefined}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        {...rest}
      >
        {children}
      </Component>
    </AnimatePresence>
  );

  // Wrap in container for popLayout to clip exiting absolute-positioned elements
  if (mode === 'popLayout') {
    return (
      <div style={popLayoutContainerStyle}>
        {animatePresenceContent}
      </div>
    );
  }

  return animatePresenceContent;
}
