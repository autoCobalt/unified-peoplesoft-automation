/**
 * CI Definitions API Handlers
 *
 * HTTP request handlers for CI shape management and custom template CRUD.
 * All endpoints require session authentication (enforced by middleware).
 *
 * Endpoints:
 *   POST /api/soap/fetch-ci-shape  — Fetch a CI shape from PeopleSoft and save
 *   GET  /api/ci-shapes            — List all saved CI shape names
 *   GET  /api/ci-shapes/:name      — Get a specific CI shape (uses query param)
 *   GET  /api/ci-templates         — List all custom templates (metadata)
 *   GET  /api/ci-templates/by-id   — Get a specific custom template (query param: id)
 *   POST /api/ci-templates         — Save a new custom template
 *   POST /api/ci-templates/update  — Update an existing custom template
 *   POST /api/ci-templates/delete  — Delete a custom template
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { parseBody, sendJson, sendInternalError } from '../utils/index.js';
import { logInfo, logError } from '../utils/index.js';
import { soapService } from '../soap/index.js';
import { parseCIShapeXML } from './ciShapeParser.js';
import { loadCIShape, listCIShapes, saveCIShape } from './index.js';
import {
  listCustomTemplates,
  loadCustomTemplate,
  saveCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  validateCustomTemplate,
} from './customTemplateService.js';
import type { CustomCITemplate } from './types.js';

/* ==============================================
   CI Shape Handlers
   ============================================== */

/**
 * POST /api/soap/fetch-ci-shape
 *
 * Fetch a CI shape from PeopleSoft via GetCIShape SOAP request,
 * parse the response, and save as JSON.
 *
 * Requires both session auth and active SOAP credentials.
 */
export async function handleFetchCIShape(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{ ciName?: string }>(req);

    if (!body.ciName || typeof body.ciName !== 'string') {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'ciName is required' },
      });
      return;
    }

    const ciName = body.ciName.toUpperCase().trim();
    logInfo('CI', `Fetching CI shape: ${ciName}`);

    // Call SOAP service to get the CI shape
    const soapResult = await soapService.getCIShape(ciName);

    if (!soapResult.success) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: soapResult.error.code,
          message: soapResult.error.message,
        },
      });
      return;
    }

    // Parse the raw XML response into structured JSON
    const rawXml = soapResult.data.rawXml;
    if (!rawXml) {
      sendJson(res, 500, {
        success: false,
        error: { code: 'PARSE_ERROR', message: 'No XML in SOAP response' },
      });
      return;
    }

    const shape = await parseCIShapeXML(rawXml, 'soap');

    // Save to shapes directory
    saveCIShape(shape);
    logInfo('CI', `Saved CI shape: ${shape.ciName} (${String(shape.level0Fields.length)} level0 fields, ${String(shape.collections.length)} collections)`);

    sendJson(res, 200, { success: true, data: shape });
  } catch (error) {
    logError('CI', `Error fetching CI shape: ${error instanceof Error ? error.message : 'Unknown'}`);
    sendInternalError(res, error);
  }
}

/**
 * GET /api/ci-shapes
 *
 * List all available CI shape names.
 */
export function handleListCIShapes(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  try {
    const shapes = listCIShapes();
    sendJson(res, 200, { success: true, data: shapes });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * GET /api/ci-shapes/detail?name=CI_POSITION_DATA
 *
 * Get a specific CI shape by name.
 */
export function handleGetCIShape(
  req: IncomingMessage,
  res: ServerResponse
): void {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const name = url.searchParams.get('name');

    if (!name) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'name query parameter is required' },
      });
      return;
    }

    const shape = loadCIShape(name);
    if (!shape) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `CI shape not found: ${name}` },
      });
      return;
    }

    sendJson(res, 200, { success: true, data: shape });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * GET /api/ci-shapes/labels?name=CI_POSITION_DATA
 *
 * Get the flat field name → label map for a specific CI shape.
 * Lightweight endpoint for UI label lookups without loading the full shape.
 */
export function handleGetCIShapeLabels(
  req: IncomingMessage,
  res: ServerResponse
): void {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const name = url.searchParams.get('name');

    if (!name) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'name query parameter is required' },
      });
      return;
    }

    const shape = loadCIShape(name);
    if (!shape) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `CI shape not found: ${name}` },
      });
      return;
    }

    sendJson(res, 200, { success: true, data: shape.fieldLabels });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/* ==============================================
   Custom Template Handlers
   ============================================== */

/**
 * GET /api/ci-templates
 *
 * List all custom templates (metadata only).
 */
export function handleListTemplates(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  try {
    const templates = listCustomTemplates();
    sendJson(res, 200, { success: true, data: templates });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * GET /api/ci-templates/by-id?id=UUID
 *
 * Get a specific custom template by ID.
 */
export function handleGetTemplate(
  req: IncomingMessage,
  res: ServerResponse
): void {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const id = url.searchParams.get('id');

    if (!id) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'id query parameter is required' },
      });
      return;
    }

    const template = loadCustomTemplate(id);
    if (!template) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `Template not found: ${id}` },
      });
      return;
    }

    sendJson(res, 200, { success: true, data: template });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * POST /api/ci-templates
 *
 * Save a new custom template. Validates against CI shape if available.
 */
export async function handleSaveTemplate(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<Partial<Omit<CustomCITemplate, 'id' | 'createdAt' | 'modifiedAt'>>>(req);

    if (!body.name || !body.ciName || !body.action || !body.fields) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'name, ciName, action, and fields are required' },
      });
      return;
    }

    // After guard, construct a concrete template object with validated fields
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
        sendJson(res, 400, {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template validation failed',
            details: validation.errors.join('; '),
          },
        });
        return;
      }
    }

    const saved = saveCustomTemplate(templateData);
    logInfo('CI', `Saved custom template: ${saved.name} (${saved.id})`);
    sendJson(res, 201, { success: true, data: saved });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * POST /api/ci-templates/update
 *
 * Update an existing custom template.
 */
export async function handleUpdateTemplate(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{ id: string } & Partial<CustomCITemplate>>(req);

    if (!body.id) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'id is required' },
      });
      return;
    }

    const updated = updateCustomTemplate(body.id, body);
    if (!updated) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `Template not found: ${body.id}` },
      });
      return;
    }

    logInfo('CI', `Updated custom template: ${updated.name} (${updated.id})`);
    sendJson(res, 200, { success: true, data: updated });
  } catch (error) {
    sendInternalError(res, error);
  }
}

/**
 * POST /api/ci-templates/delete
 *
 * Delete a custom template.
 */
export async function handleDeleteTemplate(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{ id?: string }>(req);

    if (!body.id) {
      sendJson(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'id is required' },
      });
      return;
    }

    const deleted = deleteCustomTemplate(body.id);
    if (!deleted) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `Template not found: ${body.id}` },
      });
      return;
    }

    logInfo('CI', `Deleted custom template: ${body.id}`);
    sendJson(res, 200, { success: true, data: { deleted: true } });
  } catch (error) {
    sendInternalError(res, error);
  }
}
