/**
 * Manager Workflow Definition
 *
 * The Manager approval workflow handles the 4-task process:
 * 1. Process approvals via browser automation
 * 2. Submit DEPARTMENT_TBL (dept company clearing — auto-skipped if none)
 * 3. Submit CI_POSITION_DATA
 * 4. Submit CI_JOB_DATA
 *
 * CI data is auto-parsed during query execution — no manual prepare step.
 *
 * This definition contains all configuration in one place:
 * - Step order and processing behaviors
 * - Task checklist definitions
 * - Valid state transitions
 */

import type { ManagerWorkflowStepName } from '../../types';
import type { WorkflowDefinition, StepConfig, TaskConfig } from '../types';

/* ==============================================
   Step Configurations
   ============================================== */

/**
 * Manager workflow step configurations.
 *
 * Processing behaviors:
 * - 'never': idle, approved, complete (waiting/terminal states)
 * - 'server-controlled': approving (server determines completion)
 * - 'transitional': submitting-position, submitting-job (step changes when done)
 */
export const MANAGER_STEPS: readonly StepConfig<ManagerWorkflowStepName>[] = [
  {
    name: 'idle',
    processingBehavior: 'never',
    label: 'Ready to start',
    validTransitions: ['approving', 'error'],
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
    validTransitions: ['submitting-dept-co', 'error'],
  },
  {
    name: 'submitting-dept-co',
    processingBehavior: 'transitional',
    label: 'Submitting dept company data',
    validTransitions: ['submitting-position', 'error'],
  },
  {
    name: 'submitting-position',
    processingBehavior: 'transitional',
    label: 'Submitting position data',
    validTransitions: ['submitting-job', 'error'],
  },
  {
    name: 'submitting-job',
    processingBehavior: 'transitional',
    label: 'Submitting job data',
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
 * Manager workflow task configurations.
 *
 * Each task defines:
 * - triggerStep: When the task becomes active
 * - completionStep: When the task is marked complete
 * - buttonLabel: Text shown on action button
 */
export const MANAGER_TASKS: readonly TaskConfig<ManagerWorkflowStepName>[] = [
  {
    id: 'approvals',
    triggerStep: 'idle',
    completionStep: 'approved',
    label: 'Process approvals (opens browser)',
    buttonLabel: 'Process Approvals',
  },
  {
    id: 'dept-co',
    triggerStep: 'approved',
    completionStep: 'submitting-position',
    label: 'Submit dept company clearing (if any)',
    buttonLabel: 'Submit DEPARTMENT_TBL',
    requires: ['soap'],
  },
  {
    id: 'position',
    triggerStep: 'submitting-position',
    completionStep: 'submitting-job',
    label: 'Submit position data',
    buttonLabel: 'Submit CI_POSITION_DATA',
    requires: ['soap'],
  },
  {
    id: 'job',
    triggerStep: 'submitting-job',
    completionStep: 'complete',
    label: 'Submit job data',
    buttonLabel: 'Submit CI_JOB_DATA',
    requires: ['soap'],
  },
];

/* ==============================================
   Workflow Definition
   ============================================== */

/**
 * Complete Manager workflow definition.
 *
 * Use this with useWorkflowDefinition hook:
 * ```tsx
 * const { isProcessing, activeTask, ... } = useWorkflowDefinition({
 *   definition: managerWorkflowDefinition,
 *   workflowStep: state.managerWorkflow,
 * });
 * ```
 */
export const managerWorkflowDefinition: WorkflowDefinition<ManagerWorkflowStepName> = {
  id: 'manager-workflow',
  name: 'Manager Approval Workflow',
  steps: MANAGER_STEPS,
  tasks: MANAGER_TASKS,
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
export const MANAGER_STEP_ORDER: readonly ManagerWorkflowStepName[] =
  MANAGER_STEPS.map(s => s.name);

/**
 * Processing steps array extracted from definition.
 * Includes all steps where processingBehavior !== 'never'.
 */
export const MANAGER_PROCESSING_STEPS: readonly ManagerWorkflowStepName[] =
  MANAGER_STEPS
    .filter(s => s.processingBehavior !== 'never')
    .map(s => s.name);
