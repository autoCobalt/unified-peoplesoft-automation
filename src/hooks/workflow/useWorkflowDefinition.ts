/**
 * useWorkflowDefinition Hook
 *
 * Unified hook for managing workflow state using a workflow definition.
 * Provides all workflow state in a single call using the definition
 * as the source of truth.
 *
 * Features:
 * - Single source of truth (workflow definition)
 * - Step config automatically looked up from definition
 * - Processing state computed from step config
 * - Task statuses computed from definition
 * - Reduces boilerplate in components
 *
 * @example
 * const {
 *   isProcessing,
 *   isComplete,
 *   tasksWithStatus,
 *   activeTask,
 *   ...
 * } = useWorkflowDefinition({
 *   definition: managerWorkflowDefinition,
 *   workflowStep: state.managerWorkflow,
 * });
 */

import { useMemo } from 'react';
import type {
  WorkflowStepBase,
  NormalizedWorkflowProgress,
  TaskStatus,
} from '../../types/workflow';
import { isErrorStep, isCompleteStep, isIdleStep } from '../../types/workflow';
import type {
  StepConfig,
  TaskConfig,
  UseWorkflowDefinitionOptions,
  RequirementType,
} from '../../workflows/types';
import { getProgress, isActivelyProcessing } from '../../utils/workflow';

/* ==============================================
   Return Types
   ============================================== */

/**
 * Task with computed status for UI rendering.
 * Similar to TaskWithStatus but using TaskConfig (no action function).
 */
export interface TaskConfigWithStatus<TStepName extends string>
  extends TaskConfig<TStepName> {
  /** Computed status based on current workflow step */
  status: TaskStatus;
  /** Task index in the list */
  index: number;
}

/**
 * Return type for useWorkflowDefinition hook.
 */
export interface UseWorkflowDefinitionReturn<
  TStepName extends string,
  TStep extends WorkflowStepBase
> {
  /* ----- Step State ----- */
  /** The current workflow step object */
  step: TStep;
  /** The step name string */
  stepName: TStepName;
  /** Step configuration from the definition */
  stepConfig: StepConfig<TStepName> | undefined;

  /* ----- Progress ----- */
  /** Progress info if available */
  progress: NormalizedWorkflowProgress | null;

  /* ----- Status Flags ----- */
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

  /* ----- Step Order ----- */
  /** Step names in order (for status calculation) */
  stepOrder: readonly TStepName[];

  /* ----- Tasks ----- */
  /** Tasks with computed status */
  tasksWithStatus: TaskConfigWithStatus<TStepName>[];
  /** Currently active task, or null */
  activeTask: TaskConfig<TStepName> | null;
  /** Index of active task (-1 if none) */
  activeTaskIndex: number;

  /* ----- Requirements ----- */
  /**
   * Whether the active task can proceed (all requirements met).
   * True if: no active task, active task has no requirements, or all requirements satisfied.
   */
  canProceed: boolean;
  /**
   * List of requirement types that are not currently met for the active task.
   * Empty array if canProceed is true.
   */
  missingRequirements: RequirementType[];
}

/* ==============================================
   Internal Utilities
   ============================================== */

/**
 * Get step index in the step order array.
 */
function getStepIndex<TStepName extends string>(
  stepName: TStepName,
  stepOrder: readonly TStepName[]
): number {
  return stepOrder.indexOf(stepName);
}

/**
 * Compute task status based on current step and step order.
 */
function computeTaskStatus<TStepName extends string>(
  currentStepName: TStepName,
  stepOrder: readonly TStepName[],
  task: TaskConfig<TStepName>
): TaskStatus {
  const currentIndex = getStepIndex(currentStepName, stepOrder);
  const completionIndex = getStepIndex(task.completionStep, stepOrder);
  const triggerIndex = getStepIndex(task.triggerStep, stepOrder);

  // If any step is not found, default to pending
  if (currentIndex === -1 || completionIndex === -1 || triggerIndex === -1) {
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

/* ==============================================
   Hook Implementation
   ============================================== */

/**
 * Hook for managing workflow state using a workflow definition.
 *
 * Provides all workflow state in a single call using the definition
 * as the source of truth. Computes processing state from step config
 * and task statuses from task definitions.
 */
export function useWorkflowDefinition<
  TStepName extends string,
  TStep extends { step: TStepName }
>(
  options: UseWorkflowDefinitionOptions<TStepName, TStep>
): UseWorkflowDefinitionReturn<TStepName, TStep> {
  const { definition, workflowStep, requirementStatus = {} } = options;

  return useMemo(() => {
    const stepName = workflowStep.step;

    // Extract step order from definition
    const stepOrder = definition.steps.map(s => s.name);

    // Find current step config
    const stepConfig = definition.steps.find(s => s.name === stepName);

    // Compute progress
    const progress = getProgress(workflowStep as WorkflowStepBase);

    // Compute processing state using config-driven approach
    const isProcessing = isActivelyProcessing(
      workflowStep as WorkflowStepBase,
      stepConfig
    );

    // Compute terminal states
    const completeStep = definition.completeStep ?? 'complete';
    const errorStep = definition.errorStep ?? 'error';

    const isComplete = stepName === completeStep || isCompleteStep(workflowStep as WorkflowStepBase);
    const isError = stepName === errorStep || isErrorStep(workflowStep as WorkflowStepBase);
    const isIdle = stepName === definition.initialStep || isIdleStep(workflowStep as WorkflowStepBase);

    // Extract error message if in error state
    const errorMessage = isError && 'message' in workflowStep
      ? (workflowStep as { message: string }).message
      : null;

    // Compute task statuses
    const tasksWithStatus: TaskConfigWithStatus<TStepName>[] = definition.tasks.map(
      (task, index) => ({
        ...task,
        status: computeTaskStatus(stepName, stepOrder, task),
        index,
      })
    );

    // Find active task (include requires field)
    const activeTaskWithStatus = tasksWithStatus.find(t => t.status === 'active');
    const activeTask: TaskConfig<TStepName> | null = activeTaskWithStatus
      ? {
          id: activeTaskWithStatus.id,
          triggerStep: activeTaskWithStatus.triggerStep,
          completionStep: activeTaskWithStatus.completionStep,
          label: activeTaskWithStatus.label,
          buttonLabel: activeTaskWithStatus.buttonLabel,
          requires: activeTaskWithStatus.requires,
        }
      : null;
    const activeTaskIndex = activeTaskWithStatus?.index ?? -1;

    // Compute missing requirements for the active task
    const missingRequirements: RequirementType[] = [];
    if (activeTask?.requires) {
      for (const req of activeTask.requires) {
        // Requirement is missing if not provided or explicitly false
        if (requirementStatus[req] !== true) {
          missingRequirements.push(req);
        }
      }
    }
    const canProceed = missingRequirements.length === 0;

    return {
      // Step state
      step: workflowStep,
      stepName,
      stepConfig,

      // Progress
      progress,

      // Status flags
      isProcessing,
      isComplete,
      isError,
      isIdle,
      errorMessage,

      // Step order
      stepOrder,

      // Tasks
      tasksWithStatus,
      activeTask,
      activeTaskIndex,

      // Requirements
      canProceed,
      missingRequirements,
    };
  }, [definition, workflowStep, requirementStatus]);
}
