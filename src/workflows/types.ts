/**
 * Workflow Definition Types
 *
 * Type-safe workflow configuration system that allows workflows
 * to be defined declaratively in a single location. This eliminates
 * hardcoded step names from utility functions and enables adding
 * new workflows without modifying shared code.
 *
 * @example
 * // Define a workflow with typed steps
 * const myWorkflow: WorkflowDefinition<MyStepName> = {
 *   id: 'my-workflow',
 *   name: 'My Workflow',
 *   steps: [
 *     { name: 'idle', processingBehavior: 'never' },
 *     { name: 'processing', processingBehavior: 'progress-until-done' },
 *     { name: 'complete', processingBehavior: 'never' },
 *   ],
 *   tasks: [...],
 *   initialStep: 'idle',
 * };
 */

/* ==============================================
   Step Processing Behaviors
   ============================================== */

/**
 * Processing behavior determines how isActivelyProcessing() evaluates a step.
 *
 * - 'always': Always processing when in this step (simple steps, no progress)
 * - 'server-controlled': Processing until server transitions away (e.g., 'approving')
 * - 'progress-until-done': Processing until current === total (client-controlled loops)
 * - 'transitional': Processing until step changes, even if current === total
 *   (for steps that transition to another step when complete)
 * - 'never': Never processing (waiting states, terminal states)
 */
export type StepProcessingBehavior =
  | 'always'
  | 'server-controlled'
  | 'progress-until-done'
  | 'transitional'
  | 'never';

/* ==============================================
   Step Configuration
   ============================================== */

/**
 * Configuration for a single workflow step.
 *
 * @template TStepName - Union type of valid step names for this workflow
 */
export interface StepConfig<TStepName extends string> {
  /** Step name (must match a value in the workflow's step union type) */
  name: TStepName;

  /** How this step should be evaluated for processing state */
  processingBehavior: StepProcessingBehavior;

  /**
   * Human-readable label for this step (optional).
   * Useful for debugging and admin interfaces.
   */
  label?: string;

  /**
   * Valid transitions from this step (optional).
   * If provided, enables dev-mode warnings for invalid transitions.
   */
  validTransitions?: readonly TStepName[];
}

/* ==============================================
   Requirement Types
   ============================================== */

/**
 * Known requirement types for workflow tasks.
 *
 * These represent external conditions that must be met before
 * a task can proceed. The actual boolean values are provided
 * at runtime via the useWorkflowDefinition hook.
 *
 * - 'oracle': Oracle database connection required
 * - 'soap': PeopleSoft SOAP connection required
 * - 'browser': Playwright browser connection required
 */
export type RequirementType = 'oracle' | 'soap' | 'browser';

/**
 * Map of requirement types to their current status (met or not).
 * Provided to useWorkflowDefinition at runtime.
 */
export type RequirementStatus = Partial<Record<RequirementType, boolean>>;

/* ==============================================
   Task Configuration
   ============================================== */

/**
 * Task configuration (metadata only - no action function).
 *
 * Tasks represent user-triggered actions in a workflow checklist.
 * The action function is provided separately when using the workflow
 * to allow for context-dependent implementations.
 *
 * @template TStepName - Union type of valid step names for this workflow
 */
export interface TaskConfig<TStepName extends string> {
  /** Unique identifier for the task */
  id: string;

  /** Step that triggers this task becoming active */
  triggerStep: TStepName;

  /** Step that marks this task as complete */
  completionStep: TStepName;

  /** Display label in the checklist */
  label: string;

  /** Button label when this task is active */
  buttonLabel: string;

  /**
   * Requirements that must be met before this task can proceed.
   * If specified, the task will be marked as "blocked" until all
   * requirements are satisfied.
   *
   * @example
   * requires: ['soap']  // Requires SOAP connection
   * requires: ['oracle', 'soap']  // Requires both connections
   */
  requires?: readonly RequirementType[];
}

/* ==============================================
   Workflow Definition
   ============================================== */

/**
 * Complete workflow definition.
 *
 * Contains all configuration needed to drive a workflow:
 * - Step order and processing behaviors
 * - Task checklist definitions
 * - Initial and terminal states
 *
 * @template TStepName - Union type of valid step names for this workflow
 *
 * @example
 * const managerWorkflow: WorkflowDefinition<ManagerWorkflowStepName> = {
 *   id: 'manager-workflow',
 *   name: 'Manager Approval Workflow',
 *   steps: [...],
 *   tasks: [...],
 *   initialStep: 'idle',
 *   completeStep: 'complete',
 *   errorStep: 'error',
 * };
 */
export interface WorkflowDefinition<TStepName extends string> {
  /** Unique identifier for this workflow */
  id: string;

  /** Human-readable name for display */
  name: string;

  /**
   * Step configurations in order.
   * The order defines the step progression for status calculations.
   */
  steps: readonly StepConfig<TStepName>[];

  /** Task definitions for the checklist UI */
  tasks: readonly TaskConfig<TStepName>[];

  /** Initial step when workflow starts */
  initialStep: TStepName;

  /** Step name that indicates completion (defaults to 'complete') */
  completeStep?: TStepName;

  /** Step name that indicates error state (defaults to 'error') */
  errorStep?: TStepName;
}

/* ==============================================
   Utility Types
   ============================================== */

/**
 * Extract step names from a workflow definition.
 * Useful when you have a definition but need the step name type.
 */
export type ExtractStepNames<T> = T extends WorkflowDefinition<infer S> ? S : never;

/**
 * Map of task IDs to action functions.
 * Used to connect workflow definitions to context-provided actions.
 *
 * @template TStepName - Union type of valid step names
 *
 * @example
 * const actions: ActionMap<ManagerWorkflowStepName> = {
 *   prepare: prepareSubmissions,
 *   approvals: openBrowser,
 *   position: submitPositionData,
 *   job: submitJobData,
 * };
 */
export type ActionMap = Record<string, () => Promise<void>>;

/* ==============================================
   Hook Options Types
   ============================================== */

/**
 * Options for useWorkflowDefinition hook.
 *
 * @template TStepName - Union type of valid step names
 * @template TStep - Full step type (discriminated union)
 */
export interface UseWorkflowDefinitionOptions<
  TStepName extends string,
  TStep extends { step: TStepName }
> {
  /** Workflow definition containing steps and tasks */
  definition: WorkflowDefinition<TStepName>;

  /** Current workflow step from context/state */
  workflowStep: TStep;

  /**
   * Current status of requirements (optional).
   * Provide the current boolean state for each requirement type
   * that tasks in this workflow may depend on.
   *
   * @example
   * requirementStatus: {
   *   soap: soapState.isConnected,
   *   oracle: oracleState.isConnected,
   * }
   */
  requirementStatus?: RequirementStatus;
}

/**
 * Action configuration for useWorkflowActions hook.
 */
export interface WorkflowActionConfig {
  /** Action to execute */
  action: () => Promise<void>;

  /** Optional: Action name for error messages */
  name?: string;

  /** Optional: Abort signal for cooperative cancellation */
  signal?: AbortSignal;
}

/**
 * Options for useWorkflowActions hook.
 *
 * @template TStep - Full step type (discriminated union)
 */
export interface UseWorkflowActionsOptions<TStep> {
  /**
   * Function to create an error step.
   * Called when an action throws an error.
   */
  createErrorStep: (message: string) => TStep;

  /**
   * Optional: Function to set workflow state.
   * If not provided, errors are reported but state is not changed.
   */
  setWorkflowStep?: (step: TStep) => void;
}
