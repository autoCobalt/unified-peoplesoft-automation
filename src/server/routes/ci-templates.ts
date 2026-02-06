/**
 * CI Templates Route Plugin
 *
 * CRUD endpoints for custom CI usage templates.
 * All endpoints require session authentication.
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { CustomCITemplate } from '../ci-definitions/types.js';
import { loadCIShape } from '../ci-definitions/index.js';
import {
  listCustomTemplates,
  loadCustomTemplate,
  saveCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  validateCustomTemplate,
} from '../ci-definitions/customTemplateService.js';
import { logInfo } from '../utils/index.js';

export function ciTemplatesRoutes(app: FastifyInstance): void {
  // All template routes require session auth
  app.addHook('preHandler', app.requireSession);

  /**
   * GET /api/ci-templates
   */
  app.get('/', async (_request, reply: FastifyReply) => {
    const templates = listCustomTemplates();
    return reply.send({ success: true, data: templates });
  });

  /**
   * GET /api/ci-templates/by-id?id=UUID
   */
  app.get<{
    Querystring: { id?: string };
  }>('/by-id', async (request, reply: FastifyReply) => {
    const { id } = request.query;

    if (!id) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'id query parameter is required' },
      });
    }

    const template = loadCustomTemplate(id);
    if (!template) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Template not found: ${id}` },
      });
    }

    return reply.send({ success: true, data: template });
  });

  /**
   * POST /api/ci-templates/save
   */
  app.post<{
    Body: Partial<Omit<CustomCITemplate, 'id' | 'createdAt' | 'modifiedAt'>>;
  }>('/save', async (request, reply: FastifyReply) => {
    const body = request.body;

    if (!body.name || !body.ciName || !body.action || !body.fields) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'name, ciName, action, and fields are required' },
      });
    }

    const templateData: Omit<CustomCITemplate, 'id' | 'createdAt' | 'modifiedAt'> = {
      name: body.name,
      ciName: body.ciName,
      action: body.action,
      fields: body.fields,
      description: body.description ?? '',
    };

    // Validate against CI shape if available
    const shape = loadCIShape(templateData.ciName);
    if (shape) {
      const tempForValidation: CustomCITemplate = {
        ...templateData,
        id: 'temp',
        createdAt: '',
        modifiedAt: '',
      };
      const validation = validateCustomTemplate(tempForValidation, shape);
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template validation failed',
            details: validation.errors.join('; '),
          },
        });
      }
    }

    const saved = saveCustomTemplate(templateData);
    logInfo('CI', `Saved custom template: ${saved.name} (${saved.id})`);
    return reply.status(201).send({ success: true, data: saved });
  });

  /**
   * POST /api/ci-templates/update
   */
  app.post<{
    Body: { id: string } & Partial<CustomCITemplate>;
  }>('/update', async (request, reply: FastifyReply) => {
    const { id, ...updates } = request.body;

    if (!id) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'id is required' },
      });
    }

    const updated = updateCustomTemplate(id, updates);
    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Template not found: ${id}` },
      });
    }

    logInfo('CI', `Updated custom template: ${updated.name} (${updated.id})`);
    return reply.send({ success: true, data: updated });
  });

  /**
   * POST /api/ci-templates/delete
   */
  app.post<{
    Body: { id?: string };
  }>('/delete', async (request, reply: FastifyReply) => {
    const { id } = request.body;

    if (!id) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'id is required' },
      });
    }

    const deleted = deleteCustomTemplate(id);
    if (!deleted) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Template not found: ${id}` },
      });
    }

    logInfo('CI', `Deleted custom template: ${id}`);
    return reply.send({ success: true, data: { deleted: true } });
  });
}
