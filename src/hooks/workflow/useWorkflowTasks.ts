/**
 * useWorkflowTasks Hook
 *
 * Computes task statuses for workflow checklists.
 * Takes task definitions and step order, returns tasks
 * with computed status values.
 *
 * @example
 * const { tasksWithStatus, activeTask } = useWorkflowTasks({
 *   currentStepName: managerWorkflow.step,
 *   tasks,
 *   stepOrder,
 * });
 */

import { useMemo } from 'react';
import type {
  WorkflowTask,
  TaskWithStatus,
} from '../../types/workflow';
import {
  computeTaskStatuses,
  getActiveTask,
} from '../../utils/workflow';

/**
 * Options for useWorkflowTasks hook.
 */
export interface UseWorkflowTasksOptions<TStepName extends string> {
  /** Current step name from workflow state */
  currentStepName: TStepName;
  /** Task definitions */
  tasks: readonly WorkflowTask<TStepName>[];
  /** Step order for status calculation */
  stepOrder: readonly TStepName[];
}

/**
 * Return type for useWorkflowTasks hook.
 */
export interface UseWorkflowTasksReturn<TStepName extends string> {
  /** Tasks with computed status */
  tasksWithStatus: TaskWithStatus<TStepName>[];
  /** Currently active task, or null */
  activeTask: WorkflowTask<TStepName> | null;
  /** Index of active task (-1 if none) */
  activeTaskIndex: number;
}

/**
 * Hook for computing task statuses in a workflow checklist.
 *
 * Memoizes computation to avoid recalculating on every render.
 */
export function useWorkflowTasks<TStepName extends string>(
  options: UseWorkflowTasksOptions<TStepName>
): UseWorkflowTasksReturn<TStepName> {
  const { currentStepName, tasks, stepOrder } = options;

  return useMemo(() => {
    const tasksWithStatus = computeTaskStatuses(
      currentStepName,
      tasks,
      stepOrder
    );

    const activeTask = getActiveTask(currentStepName, tasks, stepOrder);
    const activeTaskIndex = activeTask
      ? tasks.findIndex(t => t.id === activeTask.id)
      : -1;

    return {
      tasksWithStatus,
      activeTask,
      activeTaskIndex,
    };
  }, [currentStepName, tasks, stepOrder]);
}
