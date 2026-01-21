/**
 * Workflow Types
 *
 * Generic type definitions for workflow state machines.
 * Provides base interfaces, type guards, and utility types
 * for building type-safe workflow systems.
 *
 * @example
 * type MyWorkflow =
 *   | { step: 'idle' }
 *   | { step: 'processing'; current: number; total: number }
 *   | { step: 'complete' }
 *   | { step: 'error'; message: string };
 *
 * // Use type guards
 * if (hasProgress(step)) {
 *   console.log(`${step.current}/${step.total}`);
 * }
 */

/* ==============================================
   Base Step Interfaces
   ============================================== */

/**
 * Base interface for all workflow steps.
 * Every step must have a string `step` property.
 */
export interface WorkflowStepBase {
  step: string;
}

/**
 * Workflow step that includes progress tracking.
 * Used for loop-based operations that process items.
 */
export interface WorkflowStepWithProgress extends WorkflowStepBase {
  current: number;
  total: number;
}

/**
 * Standard error step interface.
 * Includes an error message for display.
 */
export interface WorkflowErrorStep {
  step: 'error';
  message: string;
}

/**
 * Standard completion step interface.
 */
export interface WorkflowCompleteStep {
  step: 'complete';
}

/**
 * Standard idle/initial step interface.
 */
export interface WorkflowIdleStep {
  step: 'idle';
}

/* ==============================================
   Type Guards
   ============================================== */

/**
 * Check if a workflow step has progress (current/total).
 *
 * @example
 * if (hasProgress(step)) {
 *   console.log(`Processing ${step.current}/${step.total}`);
 * }
 */
export function hasProgress<T extends WorkflowStepBase>(
  step: T
): step is T & WorkflowStepWithProgress {
  return (
    'current' in step &&
    'total' in step &&
    typeof step.current === 'number' &&
    typeof step.total === 'number'
  );
}

/**
 * Check if a workflow step is an error state.
 */
export function isErrorStep<T extends WorkflowStepBase>(
  step: T
): step is T & WorkflowErrorStep {
  return step.step === 'error' && 'message' in step;
}

/**
 * Check if a workflow step is complete.
 */
export function isCompleteStep<T extends WorkflowStepBase>(
  step: T
): step is T & WorkflowCompleteStep {
  return step.step === 'complete';
}

/**
 * Check if a workflow step is idle (initial state).
 */
export function isIdleStep<T extends WorkflowStepBase>(
  step: T
): step is T & WorkflowIdleStep {
  return step.step === 'idle';
}

/* ==============================================
   Utility Types
   ============================================== */

/**
 * Normalized progress object for UI display.
 * Provides computed values from raw current/total.
 */
export interface WorkflowProgress {
  /** Current item being processed (1-indexed for display) */
  current: number;
  /** Total items to process */
  total: number;
  /** Whether processing is complete (current === total) */
  isComplete: boolean;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current item identifier (e.g., transaction ID) for display */
  currentItem?: string;
}

/* ==============================================
   Task Configuration Types
   ============================================== */

/**
 * Task status in a workflow checklist.
 */
export type TaskStatus = 'pending' | 'active' | 'completed';

/**
 * Configuration for a workflow task in a checklist.
 * Generic over the step name type for type safety.
 *
 * @template TStepName - Union type of valid step names
 */
export interface WorkflowTask<TStepName extends string> {
  /** Unique identifier for the task */
  id: string;
  /** Step that triggers this task's action */
  triggerStep: TStepName;
  /** Step that marks this task as complete */
  completionStep: TStepName;
  /** Display label in checklist */
  label: string;
  /** Button label when this task is active */
  buttonLabel: string;
  /** Action to execute when button is clicked */
  action: () => Promise<void>;
}

/**
 * Task with computed status for UI rendering.
 */
export interface TaskWithStatus<TStepName extends string>
  extends WorkflowTask<TStepName> {
  /** Computed status based on current workflow step */
  status: TaskStatus;
  /** Task index in the list */
  index: number;
}

/* ==============================================
   Component Props Types
   ============================================== */

/**
 * Props for WorkflowActionButton component.
 */
export interface WorkflowActionButtonProps {
  /** Button text label */
  label: string;
  /** Whether workflow is currently processing */
  isProcessing: boolean;
  /** Whether workflow is paused (shows processing styling with pause text) */
  isPaused?: boolean;
  /** Progress info for loop operations */
  progress?: WorkflowProgress | null;
  /** Click handler */
  onAction: () => void;
  /** Optional CSS class name for theming */
  className?: string;
  /** Whether button is disabled (besides processing state) */
  disabled?: boolean;
}

/**
 * Single task item for WorkflowChecklist component.
 */
export interface ChecklistTask {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Current status */
  status: TaskStatus;
}

/**
 * Props for WorkflowChecklist component.
 */
export interface WorkflowChecklistProps {
  /** Array of tasks to display */
  tasks: ChecklistTask[];
  /** Optional CSS class name for theming */
  className?: string;
}

/**
 * Status message types for WorkflowStatusMessage component.
 */
export type StatusMessageType = 'complete' | 'error' | 'empty';

/**
 * Props for WorkflowStatusMessage component.
 */
export interface WorkflowStatusMessageProps {
  /** Type of status message */
  type: StatusMessageType;
  /** Message text to display */
  message: string;
  /** Optional CSS class name for theming */
  className?: string;
}
