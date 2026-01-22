/**
 * SOAP API Client
 *
 * Fetch-based client for communicating with the SOAP PeopleSoft middleware.
 * Follows the same patterns as oracleApi for consistency.
 */

import type {
  SOAPResponse,
  SOAPApiResponse,
  ActionType,
} from '../../types/soap.js';

/* ==============================================
   Types
   ============================================== */

/** SOAP service status from API */
export interface SOAPConnectionStatus {
  isConfigured: boolean;
  hasCredentials: boolean;
  lastConnectionTime: string | null;
  error: string | null;
}

/** Connection parameters for SOAP */
export interface SOAPConnectParams {
  username: string;
  password: string;
}

/* ==============================================
   Configuration
   ============================================== */

const API_BASE = '/api/soap';

/* ==============================================
   Generic Request Helper
   ============================================== */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<SOAPApiResponse<T>> {
  try {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json() as SOAPApiResponse<T>;
    return data;

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/* ==============================================
   Connection API
   ============================================== */

/**
 * Get current SOAP service status
 */
export async function getStatus(): Promise<SOAPApiResponse<SOAPConnectionStatus>> {
  return apiRequest<SOAPConnectionStatus>('/status', { method: 'GET' });
}

/**
 * Test SOAP connection with credentials
 *
 * @param params - Connection credentials
 */
export async function connect(
  params: SOAPConnectParams
): Promise<SOAPApiResponse<{ message: string; server?: string }>> {
  return apiRequest('/connect', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Clear stored SOAP credentials
 */
export async function disconnect(): Promise<SOAPApiResponse<{ message: string }>> {
  return apiRequest('/disconnect', { method: 'POST' });
}

/* ==============================================
   CI Operations API
   ============================================== */

/**
 * Get Component Interface structure
 *
 * @param ciName - Name of the Component Interface
 */
export async function getCIShape(
  ciName: string
): Promise<SOAPApiResponse<SOAPResponse>> {
  return apiRequest<SOAPResponse>('/get-ci-shape', {
    method: 'POST',
    body: JSON.stringify({ ciName }),
  });
}

/**
 * Submit data to a Component Interface
 *
 * @param ciName - Component Interface name
 * @param action - Action type (CREATE, UPDATE, UPDATEDATA)
 * @param data - Data object or array of objects
 */
export async function submitData(
  ciName: string,
  action: ActionType,
  data: Record<string, unknown> | Record<string, unknown>[]
): Promise<SOAPApiResponse<SOAPResponse>> {
  return apiRequest<SOAPResponse>('/submit', {
    method: 'POST',
    body: JSON.stringify({ ciName, action, data }),
  });
}

/* ==============================================
   Export as Service Object
   ============================================== */

/**
 * SOAP API service object
 * Organized by functionality for easy discovery
 */
export const soapApi = {
  // Connection management
  connection: {
    getStatus,
    connect,
    disconnect,
  },

  // CI operations
  ci: {
    getShape: getCIShape,
    submit: submitData,
  },
};
