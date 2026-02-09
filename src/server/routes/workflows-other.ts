/**
 * Other Workflow Route Plugin
 *
 * Business-level endpoints for the Other approval workflow.
 * All endpoints require session authentication.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { otherWorkflowService } from '../workflows/other/index.js';

export function workflowsOtherRoutes(app: FastifyInstance): void {
  // All routes in this plugin require session auth
  app.addHook('preHandler', app.requireSession);

  /**
   * GET /api/workflows/other/status
   */
  app.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const state = otherWorkflowService.getState();

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
   * POST /api/workflows/other/approve
   */
  app.post<{
    Body: {
      transactionIds?: string[];
      transactionUrls?: Record<string, string>;
    };
  }>('/approve', async (request, reply: FastifyReply) => {
    const { transactionIds, transactionUrls } = request.body;

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

    if (!transactionUrls || typeof transactionUrls !== 'object') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'transactionUrls map is required' },
      });
    }

    // Start workflow asynchronously — client receives updates via WebSocket + polling
    const sessionToken = (request.headers['x-session-token'] as string | undefined);
    void otherWorkflowService.runApprovals(transactionIds, transactionUrls, sessionToken);

    return reply.send({
      success: true,
      data: {
        message: 'Approval workflow started',
        transactionCount: transactionIds.length,
      },
    });
  });

  /**
   * POST /api/workflows/other/stop
   */
  app.post('/stop', async (_request: FastifyRequest, reply: FastifyReply) => {
    await otherWorkflowService.stop();
    return reply.send({ success: true, data: { message: 'Workflow stopped' } });
  });

  /**
   * POST /api/workflows/other/reset
   */
  app.post('/reset', async (_request: FastifyRequest, reply: FastifyReply) => {
    otherWorkflowService.reset();
    return reply.send({ success: true, data: { message: 'Workflow reset' } });
  });

  /**
   * POST /api/workflows/other/pause
   */
  app.post<{
    Body: { reason?: string };
  }>('/pause', async (request, reply: FastifyReply) => {
    otherWorkflowService.pause(request.body.reason);
    return reply.send({ success: true, data: { message: 'Workflow paused' } });
  });

  /**
   * POST /api/workflows/other/resume
   */
  app.post('/resume', async (_request: FastifyRequest, reply: FastifyReply) => {
    otherWorkflowService.resume();
    return reply.send({ success: true, data: { message: 'Workflow resumed' } });
  });
}
