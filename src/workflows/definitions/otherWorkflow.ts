/**
 * Other Workflow Definition
 *
 * The Other approval workflow handles a 2-phase process:
 * Phase 1: Position creation (if distinct positions exist)
 * Phase 2: Approval processing (if positions remain after refresh)
 *
 * This workflow is simpler than Manager and doesn't use a checklist UI,
 * but still benefits from the definition-driven approach for processing
 * state calculation.
 */

import type { OtherWorkflowStepName } from '../../types';
import type { WorkflowDefinition, StepConfig, TaskConfig } from '../types';

/* ==============================================
   Step Configurations
   ============================================== */

/**
 * Other workflow step configurations.
 *
 * Processing behaviors:
 * - 'never': idle, positions-created, approved, complete (waiting/terminal)
 * - 'progress-until-done': creating-positions (client-controlled loop)
 * - 'server-controlled': approving (server determines completion)
 */
export const OTHER_STEPS: readonly StepConfig<OtherWorkflowStepName>[] = [
  {
    name: 'idle',
    processingBehavior: 'never',
    label: 'Ready to start',
    validTransitions: ['creating-positions', 'approving', 'error'],
  },
  {
    name: 'creating-positions',
    processingBehavior: 'progress-until-done',
    label: 'Creating position records',
    validTransitions: ['positions-created', 'error'],
  },
  {
    name: 'positions-created',
    processingBehavior: 'never',
    label: 'Positions created',
    validTransitions: ['approving', 'complete', 'error'],
  },
  {
    name: 'approving',
    processingBehavior: 'server-controlled',
    label: 'Processing approvals',
    validTransitions: ['approved', 'error'],
  },
  {
    name: 'approved',
    processingBehavior: 'never',
    label: 'Approvals complete',
    validTransitions: ['complete', 'error'],
  },
  {
    name: 'complete',
    processingBehavior: 'never',
    label: 'Workflow complete',
    validTransitions: ['idle'],
  },
  {
    name: 'error',
    processingBehavior: 'never',
    label: 'Error occurred',
    validTransitions: ['idle'],
  },
];

/* ==============================================
   Task Configurations
   ============================================== */

/**
 * Other workflow task configurations.
 *
 * Note: The Other workflow uses dynamic action selection based on
 * context (distinct position count, etc.) rather than a fixed checklist.
 * Tasks are still defined for potential future checklist UI.
 */
export const OTHER_TASKS: readonly TaskConfig<OtherWorkflowStepName>[] = [
  {
    id: 'create-positions',
    triggerStep: 'idle',
    completionStep: 'positions-created',
    label: 'Create position records',
    buttonLabel: 'Create Position Records',
  },
  {
    id: 'approvals',
    triggerStep: 'positions-created',
    completionStep: 'approved',
    label: 'Process approvals',
    buttonLabel: 'Process Approvals',
  },
];

/* ==============================================
   Workflow Definition
   ============================================== */

/**
 * Complete Other workflow definition.
 *
 * Use this with useWorkflowDefinition hook:
 * ```tsx
 * const { isProcessing, stepConfig, ... } = useWorkflowDefinition({
 *   definition: otherWorkflowDefinition,
 *   workflowStep: state.otherWorkflow,
 * });
 * ```
 */
export const otherWorkflowDefinition: WorkflowDefinition<OtherWorkflowStepName> = {
  id: 'other-workflow',
  name: 'Other Approval Workflow',
  steps: OTHER_STEPS,
  tasks: OTHER_TASKS,
  initialStep: 'idle',
  completeStep: 'complete',
  errorStep: 'error',
};

/* ==============================================
   Utility Exports
   ============================================== */

/**
 * Step order array extracted from definition.
 * Useful for backward compatibility with existing code.
 */
export const OTHER_STEP_ORDER: readonly OtherWorkflowStepName[] =
  OTHER_STEPS.map(s => s.name);

/**
 * Processing steps array extracted from definition.
 * Includes all steps where processingBehavior !== 'never'.
 */
export const OTHER_PROCESSING_STEPS: readonly OtherWorkflowStepName[] =
  OTHER_STEPS
    .filter(s => s.processingBehavior !== 'never')
    .map(s => s.name);
