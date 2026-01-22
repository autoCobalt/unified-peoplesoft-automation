/**
 * Shared TypeScript types for Motion Components
 *
 * Provides common type definitions used across all animation wrapper components.
 */

import type { HTMLMotionProps } from 'framer-motion';
import type { ElementType, ReactNode, ComponentPropsWithoutRef } from 'react';

/**
 * Base props shared by all motion wrapper components.
 * Enables polymorphic "as" prop pattern for rendering as any HTML element.
 */
export interface BaseMotionProps<T extends ElementType = 'div'> {
  /** Content to animate */
  children: ReactNode;
  /** HTML element to render as (default varies by component) */
  as?: T;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Polymorphic component props that merge base props with the target element's props.
 * Excludes conflicting keys to prevent type errors.
 */
export type PolymorphicMotionProps<
  T extends ElementType,
  P extends object = object,
> = P &
  BaseMotionProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof P | keyof BaseMotionProps<T>>;

/**
 * Direction for bidirectional animations (tabs, carousels, etc.)
 * 1 = forward/right, -1 = backward/left
 */
export type AnimationDirection = 1 | -1;

/**
 * Speed presets for timing-based animations
 */
export type AnimationSpeed = 'quick' | 'default';

/**
 * Slide direction options
 */
export type SlideDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Entrance animation types for interactive elements
 */
export type EntranceType = 'scale' | 'fade' | 'scaleFade';

/**
 * Animation variant names used with AnimatePresence
 */
export type PresenceVariant = 'fade' | 'scale' | 'slideHorizontal';

/**
 * AnimatePresence mode options
 */
export type PresenceMode = 'wait' | 'popLayout' | 'sync';

/**
 * Stagger child animation types
 */
export type StaggerAnimation = 'slideUp' | 'fadeIn';

/**
 * Duration mapping for speed presets (in seconds)
 */
export const SPEED_DURATIONS: Record<AnimationSpeed, number> = {
  quick: 0.2,
  default: 0.3,
};

/**
 * Helper type to extract motion props for a given element type.
 * Useful for forwarding motion-specific props.
 */
export type MotionPropsFor<T extends ElementType> = T extends string
  ? HTMLMotionProps<T extends keyof HTMLElementTagNameMap ? T : 'div'>
  : HTMLMotionProps<'div'>;
