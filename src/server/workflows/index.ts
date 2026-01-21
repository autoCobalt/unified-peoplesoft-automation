/**
 * Workflows Module
 *
 * Central registry for workflow routes.
 * All workflow endpoints are business-level - browser control is internal.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import {
  handleGetStatus as managerGetStatus,
  handleApprove as managerApprove,
  handleStop as managerStop,
  handleReset as managerReset,
  handlePause as managerPause,
  handleResume as managerResume,
} from './manager/index.js';

/* ==============================================
   Route Definition Type
   ============================================== */

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => void | Promise<void>;

interface RouteConfig {
  method: 'GET' | 'POST';
  handler: RouteHandler;
}

/* ==============================================
   Workflow Routes Registry
   ============================================== */

/**
 * All workflow routes.
 *
 * These are business-level endpoints that hide Playwright implementation.
 * End users see only these URLs, not /api/browser/* endpoints.
 */
export const workflowRoutes: Record<string, RouteConfig> = {
  // Manager Workflow
  '/api/workflows/manager/status': {
    method: 'GET',
    handler: managerGetStatus,
  },
  '/api/workflows/manager/approve': {
    method: 'POST',
    handler: managerApprove,
  },
  '/api/workflows/manager/stop': {
    method: 'POST',
    handler: managerStop,
  },
  '/api/workflows/manager/reset': {
    method: 'POST',
    handler: managerReset,
  },
  '/api/workflows/manager/pause': {
    method: 'POST',
    handler: managerPause,
  },
  '/api/workflows/manager/resume': {
    method: 'POST',
    handler: managerResume,
  },

  // Other Workflow routes will be added here
  // '/api/workflows/other/status': { ... },
  // '/api/workflows/other/approve': { ... },
};

/* ==============================================
   Re-exports
   ============================================== */

export type { ManagerWorkflowState, OtherWorkflowState } from './types.js';
export { managerWorkflowService } from './manager/index.js';
