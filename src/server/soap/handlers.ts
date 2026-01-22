/**
 * SOAP API Route Handlers
 *
 * HTTP handlers for SOAP PeopleSoft endpoints.
 * These are called by the Vite middleware router.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { ActionType } from '../../types/soap.js';
import type { SoapCredentials } from '../../types/connection.js';
import { soapService } from './soapService.js';
import { sessionService } from '../auth/index.js';
import { parseBody, sendJson } from '../utils/index.js';

/* ==============================================
   Route Handlers
   ============================================== */

/**
 * GET /api/soap/status
 * Returns current SOAP service state
 */
export function handleGetStatus(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const state = soapService.getState();

  sendJson(res, 200, {
    success: true,
    data: {
      isConfigured: soapService.isConfigured(),
      hasCredentials: state.hasCredentials,
      lastConnectionTime: state.lastConnectionTime?.toISOString() ?? null,
      error: state.error,
    },
  });
}

/**
 * POST /api/soap/connect
 * Test SOAP connection with provided credentials and create session
 *
 * Request body:
 * {
 *   username: string,
 *   password: string
 * }
 *
 * Response on success includes sessionToken for subsequent authenticated requests.
 */
export async function handleConnect(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{
      username?: string;
      password?: string;
    }>(req);

    // Validate required fields
    if (!body.username || !body.password) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required fields: username, password',
        },
      });
      return;
    }

    const credentials: SoapCredentials = {
      username: body.username,
      password: body.password,
    };

    const result = await soapService.testConnection(credentials);

    // On successful connection, create a session and return the token
    if (result.success) {
      const sessionToken = sessionService.createSession(body.username, 'soap');

      sendJson(res, 200, {
        ...result,
        data: {
          ...result.data,
          sessionToken,
        },
      });
    } else {
      sendJson(res, 401, result);
    }
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * POST /api/soap/disconnect
 * Clear stored SOAP credentials and invalidate all SOAP sessions
 *
 * Security: Invalidates all sessions authenticated via SOAP.
 * This ensures disconnected users can't continue making API calls.
 */
export function handleDisconnect(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  // Invalidate all SOAP sessions before clearing credentials
  sessionService.invalidateByAuthSource('soap');

  soapService.clearCredentials();

  sendJson(res, 200, {
    success: true,
    data: { message: 'Disconnected from SOAP service' },
  });
}

/**
 * POST /api/soap/get-ci-shape
 * Get Component Interface structure
 *
 * Request body:
 * {
 *   ciName: string
 * }
 */
export async function handleGetCIShape(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{ ciName?: string }>(req);

    if (!body.ciName) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: ciName',
        },
      });
      return;
    }

    const result = await soapService.getCIShape(body.ciName);

    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * POST /api/soap/submit
 * Submit data to Component Interface
 *
 * Request body:
 * {
 *   ciName: string,
 *   action: 'CREATE' | 'UPDATE' | 'UPDATEDATA',
 *   data: object | object[]
 * }
 */
export async function handleSubmit(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const body = await parseBody<{
      ciName?: string;
      action?: string;
      data?: Record<string, unknown> | Record<string, unknown>[];
    }>(req);

    // Validate required fields
    if (!body.ciName) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: ciName',
        },
      });
      return;
    }

    if (!body.action) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: action',
        },
      });
      return;
    }

    // Validate action type
    const validActions: ActionType[] = ['CREATE', 'UPDATE', 'UPDATEDATA'];
    if (!validActions.includes(body.action as ActionType)) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: `Invalid action: ${body.action}. Must be one of: ${validActions.join(', ')}`,
        },
      });
      return;
    }

    if (!body.data) {
      sendJson(res, 400, {
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Missing required field: data',
        },
      });
      return;
    }

    const action = body.action as ActionType;

    // Handle single or batch submission
    let result;
    if (Array.isArray(body.data)) {
      result = await soapService.submitBatch(body.ciName, action, body.data);
    } else {
      result = await soapService.submitData(body.ciName, action, body.data);
    }

    sendJson(res, result.success ? 200 : 500, result);
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
