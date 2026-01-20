/**
 * Manager Workflow HTTP Handlers
 *
 * HTTP route handlers for the Manager workflow.
 * These are business-level endpoints - browser control is internal.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { managerWorkflowService } from './managerWorkflowService.js';

/* ==============================================
   Response Helpers
   ============================================== */

function sendJson(res: ServerResponse, data: unknown, statusCode = 200): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

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

  sendJson(res, {
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
    const body = await readRequestBody(req);
    const data = JSON.parse(body) as {
      transactionIds?: string[];
      testSiteUrl?: string;
    };

    if (!data.transactionIds || !Array.isArray(data.transactionIds)) {
      sendJson(res, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionIds array is required',
        },
      }, 400);
      return;
    }

    if (data.transactionIds.length === 0) {
      sendJson(res, {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionIds cannot be empty',
        },
      }, 400);
      return;
    }

    // Start the workflow (runs asynchronously)
    // Note: We don't await the full workflow - return immediately and let client poll status
    void managerWorkflowService.runApprovals(
      data.transactionIds,
      data.testSiteUrl
    );

    sendJson(res, {
      success: true,
      data: {
        message: 'Approval workflow started',
        transactionCount: data.transactionIds.length,
      },
    });

  } catch (error) {
    sendJson(res, {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid JSON body',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }, 400);
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

  sendJson(res, {
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

  sendJson(res, {
    success: true,
    data: {
      message: 'Workflow reset',
    },
  });
}
