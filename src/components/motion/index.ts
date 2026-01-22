/**
 * Motion Components
 *
 * Reusable Framer Motion wrapper components that encapsulate common animation
 * patterns with sensible defaults while maintaining flexibility through props.
 *
 * All components:
 * - Support polymorphic `as` prop for rendering as any HTML element
 * - Automatically respect `prefers-reduced-motion` accessibility preference
 * - Provide TypeScript-safe props based on the target element
 *
 * @example
 * import { FadeIn, SlideIn, ScaleIn, StaggerList, StaggerItem } from '@/components/motion';
 *
 * // Simple fade entrance
 * <FadeIn>
 *   <Content />
 * </FadeIn>
 *
 * // Staggered list
 * <StaggerList>
 *   {items.map(item => (
 *     <StaggerItem key={item.id}>{item.name}</StaggerItem>
 *   ))}
 * </StaggerList>
 */

// Types
export type {
  BaseMotionProps,
  PolymorphicMotionProps,
  AnimationDirection,
  AnimationSpeed,
  SlideDirection,
  EntranceType,
  PresenceVariant,
  PresenceMode,
  StaggerAnimation,
  MotionPropsFor,
} from './types';

export { SPEED_DURATIONS } from './types';

// Components
export { FadeIn, type FadeInProps } from './FadeIn';
export { SlideIn, type SlideInProps } from './SlideIn';
export { ScaleIn, type ScaleInProps } from './ScaleIn';
export { ExpandCollapse, type ExpandCollapseProps } from './ExpandCollapse';
export {
  InteractiveElement,
  type InteractiveElementProps,
} from './InteractiveElement';
export { StaggerList, type StaggerListProps } from './StaggerList';
export { StaggerItem, type StaggerItemProps } from './StaggerItem';
export { PresenceWrapper, type PresenceWrapperProps } from './PresenceWrapper';
export { CardStack, type CardStackProps } from './CardStack';
