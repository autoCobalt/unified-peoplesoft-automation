/**
 * Other Workflow Module
 *
 * Exports the Other workflow service and HTTP handlers.
 */

export { otherWorkflowService } from './otherWorkflowService.js';
export {
  handleGetStatus,
  handleApprove,
  handleStop,
  handleReset,
  handlePause,
  handleResume,
} from './handlers.js';
