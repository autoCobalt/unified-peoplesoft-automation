/**
 * Workflow Helpers
 *
 * Pure utility functions for workflow state management.
 * These functions are stateless and can be used in both
 * components and hooks.
 */

import type {
  WorkflowStepBase,
  NormalizedWorkflowProgress,
} from '../../types/workflow';
import { hasProgress } from '../../types/workflow';
import type { StepConfig, StepProcessingBehavior } from '../../workflows/types';

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
): NormalizedWorkflowProgress | null {
  if (!hasProgress(step)) {
    return null;
  }

  const { current, total } = step;
  // Check if step has currentItem (for approving steps with transaction IDs)
  const currentItem = 'currentItem' in step && typeof step.currentItem === 'string'
    ? step.currentItem
    : undefined;

  return {
    current,
    total,
    isComplete: current === total,
    percentage: total > 0 ? Math.round((current / total) * 100) : 0,
    currentItem,
  };
}

/**
 * Evaluate processing state based on step processing behavior.
 * This is the new config-driven approach.
 *
 * @param step - Current workflow step
 * @param behavior - Processing behavior from step config
 * @returns true if workflow is in an active processing state
 */
function evaluateProcessingBehavior(
  step: WorkflowStepBase,
  behavior: StepProcessingBehavior
): boolean {
  switch (behavior) {
    case 'never':
      // Never processing (waiting states, terminal states)
      return false;

    case 'always':
      // Always processing when in this step (simple steps without progress)
      return true;

    case 'server-controlled':
      // Processing until server transitions away
      // The server determines completion, not the client
      return true;

    case 'transitional':
      // Processing until step changes, even if current === total
      // Used for steps that represent "processing the last item"
      if (hasProgress(step)) {
        return step.current > 0;
      }
      return true;

    case 'progress-until-done':
      // Processing until current === total (client-controlled loops)
      if (hasProgress(step)) {
        return step.current > 0 && step.current < step.total;
      }
      // If no progress but marked as progress-until-done, treat as processing
      return true;
  }
}

/**
 * Check if workflow is actively processing using step config.
 * Uses the definition-driven approach for determining processing state.
 *
 * @param step - Current workflow step
 * @param stepConfig - Step configuration from workflow definition
 * @returns true if workflow is in an active processing state
 *
 * @example
 * const stepConfig = MANAGER_STEPS.find(s => s.name === step.step);
 * const isProcessing = isActivelyProcessing(step, stepConfig);
 */
export function isActivelyProcessing<TStepName extends string>(
  step: WorkflowStepBase,
  stepConfig: StepConfig<TStepName> | undefined
): boolean {
  if (!stepConfig) {
    // If no config found, default to not processing
    return false;
  }

  return evaluateProcessingBehavior(step, stepConfig.processingBehavior);
}
