/**
 * Workflows Service Module
 *
 * API client for workflow endpoints.
 */

export {
  workflowApi,
  getManagerStatus,
  startManagerApprovals,
  stopManagerWorkflow,
  resetManagerWorkflow,
  pollManagerStatus,
} from './workflowApi.js';

export type {
  RawWorkflowProgress,
  WorkflowStatus,
  ManagerWorkflowState,
  ApiResponse,
} from './workflowApi.js';
