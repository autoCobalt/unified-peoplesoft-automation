/**
 * Workflow Helpers
 *
 * Pure utility functions for workflow state management.
 * These functions are stateless and can be used in both
 * components and hooks.
 */

import type {
  WorkflowStepBase,
  WorkflowProgress,
  TaskStatus,
  WorkflowTask,
} from '../../types/workflow';
import { hasProgress } from '../../types/workflow';

/* ==============================================
   Progress Utilities
   ============================================== */

/**
 * Extract normalized progress from a workflow step.
 * Returns null if the step doesn't have progress tracking.
 *
 * @example
 * const progress = getProgress(step);
 * if (progress) {
 *   console.log(`${progress.percentage}% complete`);
 * }
 */
export function getProgress(
  step: WorkflowStepBase
): WorkflowProgress | null {
  if (!hasProgress(step)) {
    return null;
  }

  const { current, total } = step;
  return {
    current,
    total,
    isComplete: current === total,
    percentage: total > 0 ? Math.round((current / total) * 100) : 0,
  };
}

/**
 * Check if workflow is actively processing.
 * Considers both the step name and loop completion status.
 *
 * @param step - Current workflow step
 * @param processingSteps - Step names that indicate processing
 * @returns true if workflow is in an active processing state
 *
 * @example
 * const isProcessing = isActivelyProcessing(step, ['preparing', 'approving']);
 */
export function isActivelyProcessing(
  step: WorkflowStepBase,
  processingSteps: string[]
): boolean {
  if (!processingSteps.includes(step.step)) {
    return false;
  }

  // For steps with progress, check if loop is complete
  if (hasProgress(step)) {
    return step.current < step.total;
  }

  // Non-progress steps are processing if they match
  return true;
}

/* ==============================================
   Step Navigation Utilities
   ============================================== */

/**
 * Get the index of a step in the step order array.
 * Returns -1 if step is not found.
 */
function getStepIndex<TStepName extends string>(
  stepName: TStepName,
  stepOrder: readonly TStepName[]
): number {
  return stepOrder.indexOf(stepName);
}

/* ==============================================
   Task Status Utilities
   ============================================== */

/**
 * Determine the status of a task based on workflow progress.
 *
 * @param currentStepName - Current step name
 * @param stepOrder - Array of all steps in order
 * @param completionStepName - Step that marks this task complete
 * @param triggerStepName - Step that activates this task
 * @returns TaskStatus: 'pending', 'active', or 'completed'
 */
export function getTaskStatus<TStepName extends string>(
  currentStepName: TStepName,
  stepOrder: readonly TStepName[],
  completionStepName: TStepName,
  triggerStepName: TStepName
): TaskStatus {
  const currentIndex = getStepIndex(currentStepName, stepOrder);
  const completionIndex = getStepIndex(completionStepName, stepOrder);
  const triggerIndex = getStepIndex(triggerStepName, stepOrder);

  // If current step is not in the order (e.g., 'error'), return pending
  // This prevents incorrect status when workflow is in an unexpected state
  if (currentIndex === -1) {
    return 'pending';
  }

  // If completion step is not found, task can never be completed
  // If trigger step is not found, task is always pending
  if (completionIndex === -1 || triggerIndex === -1) {
    return 'pending';
  }

  // Task is complete when we've reached or passed its completion step
  if (currentIndex >= completionIndex) {
    return 'completed';
  }

  // Task is active when we're at or past its trigger step (but not complete)
  if (currentIndex >= triggerIndex) {
    return 'active';
  }

  return 'pending';
}

/**
 * Find the currently active task from a list of tasks.
 * Returns the first task that is 'active', or null if none.
 *
 * @example
 * const activeTask = getActiveTask(currentStep, tasks, stepOrder);
 * if (activeTask) {
 *   handleAction(activeTask.action);
 * }
 */
export function getActiveTask<TStepName extends string>(
  currentStepName: TStepName,
  tasks: readonly WorkflowTask<TStepName>[],
  stepOrder: readonly TStepName[]
): WorkflowTask<TStepName> | null {
  for (const task of tasks) {
    const status = getTaskStatus(
      currentStepName,
      stepOrder,
      task.completionStep,
      task.triggerStep
    );
    if (status === 'active') {
      return task;
    }
  }
  return null;
}

/**
 * Compute status for all tasks in a list.
 * Returns tasks with their status and index added.
 */
export function computeTaskStatuses<TStepName extends string>(
  currentStepName: TStepName,
  tasks: readonly WorkflowTask<TStepName>[],
  stepOrder: readonly TStepName[]
): Array<WorkflowTask<TStepName> & { status: TaskStatus; index: number }> {
  return tasks.map((task, index) => ({
    ...task,
    status: getTaskStatus(
      currentStepName,
      stepOrder,
      task.completionStep,
      task.triggerStep
    ),
    index,
  }));
}
