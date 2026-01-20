/**
 * useWorkflowState Hook
 *
 * Provides state machine utilities for workflow management.
 * Wraps an external workflow state with computed properties
 * for easier UI consumption.
 *
 * @example
 * const {
 *   isProcessing,
 *   progress,
 *   isComplete,
 *   isError,
 *   errorMessage
 * } = useWorkflowState({
 *   workflowStep: managerWorkflow,
 *   processingSteps: ['preparing', 'approving', 'submitting-position'],
 * });
 */

import { useMemo } from 'react';
import type {
  WorkflowStepBase,
  WorkflowProgress,
} from '../../types/workflow';
import { isErrorStep, isCompleteStep, isIdleStep } from '../../types/workflow';
import { getProgress, isActivelyProcessing } from '../../utils/workflow';

/**
 * Options for useWorkflowState hook.
 */
export interface UseWorkflowStateOptions<T extends WorkflowStepBase> {
  /** Current workflow step from context/state */
  workflowStep: T;
  /** Step names that indicate processing state */
  processingSteps: string[];
}

/**
 * Return type for useWorkflowState hook.
 */
export interface UseWorkflowStateReturn<T extends WorkflowStepBase> {
  /** The current workflow step object */
  step: T;
  /** The step name string */
  stepName: string;
  /** Progress info if available */
  progress: WorkflowProgress | null;
  /** Whether workflow is actively processing */
  isProcessing: boolean;
  /** Whether workflow has completed */
  isComplete: boolean;
  /** Whether workflow is in error state */
  isError: boolean;
  /** Whether workflow is in idle state */
  isIdle: boolean;
  /** Error message if in error state */
  errorMessage: string | null;
}

/**
 * Hook for managing workflow state with computed properties.
 *
 * This hook doesn't own the state - it wraps external state
 * from a context provider and adds computed convenience properties.
 */
export function useWorkflowState<T extends WorkflowStepBase>(
  options: UseWorkflowStateOptions<T>
): UseWorkflowStateReturn<T> {
  const { workflowStep, processingSteps } = options;

  return useMemo(() => {
    const progress = getProgress(workflowStep);
    const isProcessing = isActivelyProcessing(workflowStep, processingSteps);
    const isComplete = isCompleteStep(workflowStep);
    const isError = isErrorStep(workflowStep);
    const isIdle = isIdleStep(workflowStep);

    // Extract error message if in error state
    const errorMessage = isError
      ? (workflowStep as { message: string }).message
      : null;

    return {
      step: workflowStep,
      stepName: workflowStep.step,
      progress,
      isProcessing,
      isComplete,
      isError,
      isIdle,
      errorMessage,
    };
  }, [workflowStep, processingSteps]);
}
