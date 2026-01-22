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
import {
  handleGetStatus as oracleGetStatus,
  handleGetQueries as oracleGetQueries,
  handleConnect as oracleConnect,
  handleDisconnect as oracleDisconnect,
  handleQuery as oracleQuery,
} from '../oracle/index.js';
import {
  soapGetStatus,
  soapConnect,
  soapDisconnect,
  soapGetCIShape,
  soapSubmit,
} from '../soap/index.js';

/* ==============================================
   Route Definition Type
   ============================================== */

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => void | Promise<void>;

/**
 * Authentication policy for a route
 *
 * - 'public': No authentication required (connect, status endpoints)
 * - 'authenticated': Requires valid session token
 */
type AuthPolicy = 'public' | 'authenticated';

interface RouteConfig {
  method: 'GET' | 'POST';
  handler: RouteHandler;

  /**
   * Authentication requirement for this route.
   *
   * Why different policies?
   * - 'public' routes like /connect are needed to establish authentication
   * - 'public' routes like /status allow UI to show connection state without auth
   * - 'authenticated' routes require a valid session from prior /connect call
   *
   * Default: 'authenticated' (secure by default)
   */
  auth: AuthPolicy;
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
  // ============================================
  // Manager Workflow Routes (all authenticated)
  // ============================================
  // These routes control browser automation and data processing.
  // Must be protected to prevent unauthorized workflow execution.
  '/api/workflows/manager/status': {
    method: 'GET',
    handler: managerGetStatus,
    auth: 'authenticated',
  },
  '/api/workflows/manager/approve': {
    method: 'POST',
    handler: managerApprove,
    auth: 'authenticated',
  },
  '/api/workflows/manager/stop': {
    method: 'POST',
    handler: managerStop,
    auth: 'authenticated',
  },
  '/api/workflows/manager/reset': {
    method: 'POST',
    handler: managerReset,
    auth: 'authenticated',
  },
  '/api/workflows/manager/pause': {
    method: 'POST',
    handler: managerPause,
    auth: 'authenticated',
  },
  '/api/workflows/manager/resume': {
    method: 'POST',
    handler: managerResume,
    auth: 'authenticated',
  },

  // Other Workflow routes will be added here
  // '/api/workflows/other/status': { ... },
  // '/api/workflows/other/approve': { ... },

  // ============================================
  // Oracle Routes
  // ============================================
  // Status is public so UI can show connection state before auth.
  // Connect is public because it's how you authenticate.
  // Everything else requires authentication.
  '/api/oracle/status': {
    method: 'GET',
    handler: oracleGetStatus,
    auth: 'public',
  },
  '/api/oracle/queries': {
    method: 'GET',
    handler: oracleGetQueries,
    auth: 'authenticated',
  },
  '/api/oracle/connect': {
    method: 'POST',
    handler: oracleConnect,
    auth: 'public',
  },
  '/api/oracle/disconnect': {
    method: 'POST',
    handler: oracleDisconnect,
    auth: 'authenticated',
  },
  '/api/oracle/query': {
    method: 'POST',
    handler: oracleQuery,
    auth: 'authenticated',
  },

  // ============================================
  // SOAP Routes
  // ============================================
  // Same pattern: status and connect are public, everything else authenticated.
  '/api/soap/status': {
    method: 'GET',
    handler: soapGetStatus,
    auth: 'public',
  },
  '/api/soap/connect': {
    method: 'POST',
    handler: soapConnect,
    auth: 'public',
  },
  '/api/soap/disconnect': {
    method: 'POST',
    handler: soapDisconnect,
    auth: 'authenticated',
  },
  '/api/soap/get-ci-shape': {
    method: 'POST',
    handler: soapGetCIShape,
    auth: 'authenticated',
  },
  '/api/soap/submit': {
    method: 'POST',
    handler: soapSubmit,
    auth: 'authenticated',
  },
};

/* ==============================================
   Re-exports
   ============================================== */

export type { ManagerWorkflowState, OtherWorkflowState } from './types.js';
export { managerWorkflowService } from './manager/index.js';
export { oracleService } from '../oracle/index.js';
export { soapService } from '../soap/index.js';
