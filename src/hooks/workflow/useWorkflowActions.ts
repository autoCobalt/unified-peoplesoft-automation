/**
 * useWorkflowActions Hook
 *
 * Provides action execution with automatic error handling and
 * cancellation support for workflows.
 *
 * Features:
 * - Automatic try/catch with error state transition
 * - AbortController for cancellable actions
 * - isExecuting flag for UI feedback
 * - Action receives abort signal for cooperative cancellation
 *
 * @example
 * const { executeAction, cancelAction, isExecuting } = useWorkflowActions({
 *   createErrorStep: (msg) => ({ step: 'error', message: msg }),
 *   setWorkflowStep: setManagerWorkflow,
 * });
 *
 * // Execute an action with automatic error handling
 * await executeAction({
 *   action: async () => {
 *     await someAsyncWork();
 *   },
 *   name: 'Prepare submissions',
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  UseWorkflowActionsOptions,
  WorkflowActionConfig,
} from '../../workflows/types';

/* ==============================================
   Return Type
   ============================================== */

/**
 * Return type for useWorkflowActions hook.
 */
export interface UseWorkflowActionsReturn {
  /**
   * Execute an action with automatic error handling.
   * Returns true if successful, false if error occurred.
   */
  executeAction: (config: WorkflowActionConfig) => Promise<boolean>;

  /**
   * Cancel the currently executing action.
   * Aborts the AbortController signal.
   */
  cancelAction: () => void;

  /**
   * Whether an action is currently executing.
   */
  isExecuting: boolean;

  /**
   * The current AbortSignal, or null if no action is executing.
   * Pass this to fetch() or other cancellable operations.
   */
  abortSignal: AbortSignal | null;
}

/* ==============================================
   Hook Implementation
   ============================================== */

/**
 * Hook for executing workflow actions with error handling.
 *
 * This hook wraps action execution with:
 * - Automatic try/catch that transitions to error state
 * - AbortController for cancellable operations
 * - isExecuting flag for button/spinner state
 */
export function useWorkflowActions<TStep>(
  options: UseWorkflowActionsOptions<TStep>
): UseWorkflowActionsReturn {
  const { createErrorStep, setWorkflowStep } = options;

  const [isExecuting, setIsExecuting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cleanup on unmount: abort any running action.
   *
   * This prevents:
   * 1. Memory leaks from async operations holding references
   * 2. React warnings about state updates on unmounted components
   * 3. Wasted work from operations that will be discarded
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Execute an action with automatic error handling.
   */
  const executeAction = useCallback(
    async (config: WorkflowActionConfig): Promise<boolean> => {
      const { action, name = 'Action' } = config;

      // Create new AbortController for this action
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsExecuting(true);

      try {
        // Execute the action
        await action();

        // Check if aborted during execution
        if (controller.signal.aborted) {
          // Action was cancelled - don't treat as success or error
          return false;
        }

        return true;
      } catch (error) {
        // Check if aborted (AbortError)
        if (error instanceof Error && error.name === 'AbortError') {
          // Action was cancelled - not a real error
          return false;
        }

        // Real error occurred
        const errorMessage = error instanceof Error
          ? error.message
          : `${name} failed`;

        // Transition to error state if setter provided
        if (setWorkflowStep) {
          const errorStep = createErrorStep(errorMessage);
          setWorkflowStep(errorStep);
        } else {
          // Log error if no state setter
          console.error(`[Workflow] ${name} error:`, error);
        }

        return false;
      } finally {
        setIsExecuting(false);
        abortControllerRef.current = null;
      }
    },
    [createErrorStep, setWorkflowStep]
  );

  /**
   * Cancel the currently executing action.
   */
  const cancelAction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Get current abort signal.
   */
  const abortSignal = abortControllerRef.current?.signal ?? null;

  return {
    executeAction,
    cancelAction,
    isExecuting,
    abortSignal,
  };
}

/* ==============================================
   Utility: Create Action Wrapper
   ============================================== */

/**
 * Create an action that checks for abort signal.
 * Useful for wrapping async operations in actions.
 *
 * @example
 * const wrappedAction = createCancellableAction(
 *   async (signal) => {
 *     const response = await fetch('/api/data', { signal });
 *     return response.json();
 *   }
 * );
 */
export function createCancellableAction(
  action: (signal: AbortSignal) => Promise<void>
): (signal?: AbortSignal) => Promise<void> {
  return async (signal?: AbortSignal) => {
    // Create a default signal if none provided
    const controller = new AbortController();
    const effectiveSignal = signal ?? controller.signal;

    await action(effectiveSignal);
  };
}
