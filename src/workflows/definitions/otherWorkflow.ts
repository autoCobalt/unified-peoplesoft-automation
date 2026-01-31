/**
 * Other Workflow Definition
 *
 * The Other approval workflow handles a 3-step process:
 * 1. Submit dept company clearing (SOAP) — auto-skip if no records
 * 2. Submit position create data (SOAP)
 * 3. Process approvals (browser automation) — with pause/resume
 *
 * Uses the same definition-driven approach as the Manager workflow,
 * including a checklist UI, requirements checking, and shared workflow
 * components.
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
 * - 'never': idle, submissions-complete, approved, complete, error (waiting/terminal)
 * - 'transitional': submitting-dept-co, submitting-position-create (SOAP loops — transition when done)
 * - 'server-controlled': approving (browser automation via server)
 */
export const OTHER_STEPS: readonly StepConfig<OtherWorkflowStepName>[] = [
  {
    name: 'idle',
    processingBehavior: 'never',
    label: 'Ready to start',
    validTransitions: ['submitting-dept-co', 'submitting-position-create', 'error'],
  },
  {
    name: 'submitting-dept-co',
    processingBehavior: 'transitional',
    label: 'Submitting DEPARTMENT_TBL',
    validTransitions: ['submitting-position-create', 'error'],
  },
  {
    name: 'submitting-position-create',
    processingBehavior: 'transitional',
    label: 'Submitting POSITION_CREATE_CI',
    validTransitions: ['submissions-complete', 'error'],
  },
  {
    name: 'submissions-complete',
    processingBehavior: 'never',
    label: 'Submissions complete',
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
 * Three tasks in order:
 * 1. Submit DEPARTMENT_TBL (auto-skipped if no dept co records)
 * 2. Submit POSITION_CREATE_CI
 * 3. Process Approvals (browser automation)
 */
export const OTHER_TASKS: readonly TaskConfig<OtherWorkflowStepName>[] = [
  {
    id: 'other-dept-co',
    triggerStep: 'idle',
    completionStep: 'submitting-position-create',
    label: 'Submit DEPARTMENT_TBL',
    buttonLabel: 'Submit DEPARTMENT_TBL',
    requires: ['soap'],
  },
  {
    id: 'other-position-create',
    triggerStep: 'submitting-position-create',
    completionStep: 'submissions-complete',
    label: 'Submit POSITION_CREATE_CI',
    buttonLabel: 'Submit POSITION_CREATE_CI',
    requires: ['soap'],
  },
  {
    id: 'other-approvals',
    triggerStep: 'submissions-complete',
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
 *   requirementStatus,
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
