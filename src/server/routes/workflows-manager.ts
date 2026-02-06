/**
 * Manager Workflow Route Plugin
 *
 * Business-level endpoints for the Manager approval workflow.
 * All endpoints require session authentication.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { managerWorkflowService } from '../workflows/manager/index.js';

export function workflowsManagerRoutes(app: FastifyInstance): void {
  // All routes in this plugin require session auth
  app.addHook('preHandler', app.requireSession);

  /**
   * GET /api/workflows/manager/status
   */
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const state = managerWorkflowService.getState();

    return reply.send({
      success: true,
      data: {
        status: state.status,
        step: state.currentStep,
        progress: state.progress,
        error: state.error,
        results: state.results,
      },
    });
  });

  /**
   * POST /api/workflows/manager/approve
   */
  app.post<{
    Body: {
      transactionIds?: string[];
      testSiteUrl?: string;
    };
  }>('/approve', async (request, reply: FastifyReply) => {
    const { transactionIds, testSiteUrl } = request.body;

    if (!transactionIds || !Array.isArray(transactionIds)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'transactionIds array is required' },
      });
    }

    if (transactionIds.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'transactionIds cannot be empty' },
      });
    }

    // Start workflow asynchronously — client receives updates via WebSocket + polling
    const sessionToken = (request.headers['x-session-token'] as string | undefined);
    void managerWorkflowService.runApprovals(transactionIds, testSiteUrl, sessionToken);

    return reply.send({
      success: true,
      data: {
        message: 'Approval workflow started',
        transactionCount: transactionIds.length,
      },
    });
  });

  /**
   * POST /api/workflows/manager/stop
   */
  app.post('/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
    await managerWorkflowService.stop();
    return reply.send({ success: true, data: { message: 'Workflow stopped' } });
  });

  /**
   * POST /api/workflows/manager/reset
   */
  app.post('/reset', async (_request: FastifyRequest, reply: FastifyReply) => {
    managerWorkflowService.reset();
    return reply.send({ success: true, data: { message: 'Workflow reset' } });
  });

  /**
   * POST /api/workflows/manager/pause
   */
  app.post<{
    Body: { reason?: string };
  }>('/pause', async (request, reply: FastifyReply) => {
    managerWorkflowService.pause(request.body.reason);
    return reply.send({ success: true, data: { message: 'Workflow paused' } });
  });

  /**
   * POST /api/workflows/manager/resume
   */
  app.post('/resume', async (_request: FastifyRequest, reply: FastifyReply) => {
    managerWorkflowService.resume();
    return reply.send({ success: true, data: { message: 'Workflow resumed' } });
  });
}
