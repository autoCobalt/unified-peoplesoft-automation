/**
 * CI Shapes Route Plugin
 *
 * Endpoints for CI shape management (PeopleSoft Component Interface definitions).
 * Registered at /api prefix since routes span /api/soap and /api/ci-shapes.
 *
 * - POST /soap/fetch-ci-shape — Fetch CI shape from PeopleSoft via SOAP
 * - GET /ci-shapes — List saved CI shape names
 * - GET /ci-shapes/detail — Get a specific CI shape
 * - GET /ci-shapes/labels — Get field→label map for a CI shape
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import { soapService } from '../soap/index.js';
import { parseCIShapeXML } from '../ci-definitions/ciShapeParser.js';
import { loadCIShape, listCIShapes, saveCIShape } from '../ci-definitions/index.js';
import { logInfo } from '../utils/index.js';

export function ciShapesRoutes(app: FastifyInstance): void {
  // All CI shape routes require session auth
  app.addHook('preHandler', app.requireSession);

  /**
   * POST /api/soap/fetch-ci-shape
   *
   * Fetch a CI shape from PeopleSoft, parse, and save.
   */
  app.post<{
    Body: { ciName?: string };
  }>('/soap/fetch-ci-shape', async (request, reply: FastifyReply) => {
    const { ciName } = request.body;

    if (!ciName || typeof ciName !== 'string') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'ciName is required' },
      });
    }

    const normalizedName = ciName.toUpperCase().trim();
    logInfo('CI', `Fetching CI shape: ${normalizedName}`);

    const soapResult = await soapService.getCIShape(normalizedName);

    if (!soapResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: soapResult.error.code, message: soapResult.error.message },
      });
    }

    const rawXml = soapResult.data.rawXml;
    if (!rawXml) {
      return reply.status(500).send({
        success: false,
        error: { code: 'PARSE_ERROR', message: 'No XML in SOAP response' },
      });
    }

    const shape = await parseCIShapeXML(rawXml, 'soap');
    saveCIShape(shape);
    logInfo('CI', `Saved CI shape: ${shape.ciName} (${String(shape.level0Fields.length)} level0 fields, ${String(shape.collections.length)} collections)`);

    return reply.send({ success: true, data: shape });
  });

  /**
   * GET /api/ci-shapes
   */
  app.get('/ci-shapes', async (_request, reply: FastifyReply) => {
    const shapes = listCIShapes();
    return reply.send({ success: true, data: shapes });
  });

  /**
   * GET /api/ci-shapes/detail?name=CI_POSITION_DATA
   */
  app.get<{
    Querystring: { name?: string };
  }>('/ci-shapes/detail', async (request, reply: FastifyReply) => {
    const { name } = request.query;

    if (!name) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'name query parameter is required' },
      });
    }

    const shape = loadCIShape(name);
    if (!shape) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `CI shape not found: ${name}` },
      });
    }

    return reply.send({ success: true, data: shape });
  });

  /**
   * GET /api/ci-shapes/labels?name=CI_POSITION_DATA
   */
  app.get<{
    Querystring: { name?: string };
  }>('/ci-shapes/labels', async (request, reply: FastifyReply) => {
    const { name } = request.query;

    if (!name) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'name query parameter is required' },
      });
    }

    const shape = loadCIShape(name);
    if (!shape) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `CI shape not found: ${name}` },
      });
    }

    return reply.send({ success: true, data: shape.fieldLabels });
  });
}
