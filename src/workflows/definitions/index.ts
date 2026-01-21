/**
 * Workflow Definitions Barrel Export
 *
 * All workflow definitions are exported from here.
 * When adding a new workflow, create a definition file and export it here.
 */

// Manager Workflow
export {
  managerWorkflowDefinition,
  MANAGER_STEPS,
  MANAGER_TASKS,
  MANAGER_STEP_ORDER,
  MANAGER_PROCESSING_STEPS,
} from './managerWorkflow';

// Other Workflow
export {
  otherWorkflowDefinition,
  OTHER_STEPS,
  OTHER_TASKS,
  OTHER_STEP_ORDER,
  OTHER_PROCESSING_STEPS,
} from './otherWorkflow';
