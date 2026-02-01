/**
 * Manager Workflow HTTP Handlers
 *
 * HTTP route handlers for the Manager workflow.
 * These are business-level endpoints - browser control is internal.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { managerWorkflowService } from './managerWorkflowService.js';
import { getRawBody, sendJson } from '../../utils/index.js';

/* ==============================================
   Route Handlers
   ============================================== */

/**
 * GET /api/workflows/manager/status
 * Returns the current workflow state
 */
export function handleGetStatus(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const state = managerWorkflowService.getState();

  sendJson(res, 200, {
    success: true,
    data: {
      status: state.status,
      step: state.currentStep,
      progress: state.progress,
      error: state.error,
      results: state.results,
    },
  });
}

/**
 * POST /api/workflows/manager/approve
 * Start the approval workflow for provided transactions
 *
 * Request body:
 * {
 *   transactionIds: string[],
 *   testSiteUrl?: string  // Optional, for development testing
 * }
 */
export async function handleApprove(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await getRawBody(req);
    const data = JSON.parse(body) as {
      transactionIds?: string[];
      testSiteUrl?: string;
    };

    if (!data.transactionIds || !Array.isArray(data.transactionIds)) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionIds array is required',
        },
      });
      return;
    }

    if (data.transactionIds.length === 0) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionIds cannot be empty',
        },
      });
      return;
    }

    // Start the workflow (runs asynchronously)
    // Note: We don't await the full workflow - return immediately and let client poll status
    void managerWorkflowService.runApprovals(
      data.transactionIds,
      data.testSiteUrl
    );

    sendJson(res, 200, {
      success: true,
      data: {
        message: 'Approval workflow started',
        transactionCount: data.transactionIds.length,
      },
    });

  } catch (error) {
    sendJson(res, 400, {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid JSON body',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * POST /api/workflows/manager/stop
 * Stop the current workflow
 */
export async function handleStop(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await managerWorkflowService.stop();

  sendJson(res, 200, {
    success: true,
    data: {
      message: 'Workflow stopped',
    },
  });
}

/**
 * POST /api/workflows/manager/reset
 * Reset workflow to initial state
 */
export function handleReset(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  managerWorkflowService.reset();

  sendJson(res, 200, {
    success: true,
    data: {
      message: 'Workflow reset',
    },
  });
}

/**
 * POST /api/workflows/manager/pause
 * Pause the current workflow (pauses between transactions)
 *
 * Optional body: { reason?: string } — e.g., 'tab-switch'
 */
export async function handlePause(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let reason: string | undefined;
  try {
    const body = await getRawBody(req);
    if (body) {
      const data = JSON.parse(body) as { reason?: string };
      reason = data.reason;
    }
  } catch {
    // No body or invalid JSON — proceed without reason
  }

  managerWorkflowService.pause(reason);

  sendJson(res, 200, {
    success: true,
    data: {
      message: 'Workflow paused',
    },
  });
}

/**
 * POST /api/workflows/manager/resume
 * Resume a paused workflow
 */
export function handleResume(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  managerWorkflowService.resume();

  sendJson(res, 200, {
    success: true,
    data: {
      message: 'Workflow resumed',
    },
  });
}
