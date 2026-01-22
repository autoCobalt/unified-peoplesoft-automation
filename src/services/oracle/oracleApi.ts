/**
 * Oracle API Client
 *
 * Fetch-based client for communicating with the Oracle query middleware.
 * Follows the same patterns as workflowApi for consistency.
 *
 * Authentication:
 * - On successful connect(), stores the session token
 * - All authenticated requests include the token in X-Session-Token header
 * - On disconnect(), clears the stored token
 */

import type {
  OracleQueryId,
  OracleQueryResult,
  OracleApiResponse,
  QueryParameters,
  QueryResultRow,
} from '../../types/oracle.js';
import {
  setSessionToken,
  clearSessionToken,
  getSessionHeaders,
} from '../session/index.js';

/* ==============================================
   Types
   ============================================== */

/** Oracle connection status from API */
export interface OracleConnectionStatus {
  isConnected: boolean;
  connectionTime: string | null;
  lastQueryTime: string | null;
  error: string | null;
}

/** Connection credentials for Oracle */
export interface OracleConnectParams {
  connectionString: string;
  username: string;
  password: string;
}

/* ==============================================
   Configuration
   ============================================== */

const API_BASE = '/api/oracle';

/* ==============================================
   Generic Request Helper
   ============================================== */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<OracleApiResponse<T>> {
  try {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add session token to authenticated requests
    // (public endpoints like /status and /connect don't need it, but it's harmless)
    const sessionHeaders = getSessionHeaders();
    for (const [key, value] of Object.entries(sessionHeaders)) {
      headers.set(key, value);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json() as OracleApiResponse<T>;
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
 * Get current Oracle connection status
 */
export async function getStatus(): Promise<OracleApiResponse<OracleConnectionStatus>> {
  return apiRequest<OracleConnectionStatus>('/status', { method: 'GET' });
}

/**
 * Get list of available query IDs
 */
export async function getAvailableQueries(): Promise<OracleApiResponse<{ queries: OracleQueryId[] }>> {
  return apiRequest<{ queries: OracleQueryId[] }>('/queries', { method: 'GET' });
}

/** Response type for connect including session token */
interface OracleConnectResponse {
  message: string;
  sessionToken?: string;
}

/**
 * Connect to Oracle database
 *
 * On success, stores the session token for subsequent authenticated requests.
 *
 * @param params - Connection parameters
 */
export async function connect(
  params: OracleConnectParams
): Promise<OracleApiResponse<OracleConnectResponse>> {
  const result = await apiRequest<OracleConnectResponse>('/connect', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  // Store the session token on successful connection
  if (result.success && result.data.sessionToken) {
    setSessionToken(result.data.sessionToken);
  }

  return result;
}

/**
 * Disconnect from Oracle database
 *
 * Clears the stored session token regardless of API result.
 */
export async function disconnect(): Promise<OracleApiResponse<{ message: string }>> {
  const result = await apiRequest<{ message: string }>('/disconnect', { method: 'POST' });

  // Always clear the session token on disconnect attempt
  // Even if the API call fails, we should not keep the token
  clearSessionToken();

  return result;
}

/* ==============================================
   Query API
   ============================================== */

/**
 * Execute a registered query by ID
 *
 * @param queryId - The query identifier
 * @param parameters - Optional query parameters
 */
export async function executeQuery<TRow = QueryResultRow>(
  queryId: OracleQueryId,
  parameters?: QueryParameters
): Promise<OracleApiResponse<OracleQueryResult<TRow>>> {
  return apiRequest<OracleQueryResult<TRow>>('/query', {
    method: 'POST',
    body: JSON.stringify({ queryId, parameters }),
  });
}

/* ==============================================
   SmartForm-Specific Query
   ============================================== */

/**
 * Execute the SmartForm pending transactions query
 * This is a convenience wrapper for the most common query
 */
export async function querySmartFormTransactions(): Promise<
  OracleApiResponse<OracleQueryResult>
> {
  return executeQuery('smartform-pending-transactions');
}

/* ==============================================
   Export as Service Object
   ============================================== */

/**
 * Oracle API service object
 * Organized by functionality for easy discovery
 */
export const oracleApi = {
  // Connection management
  connection: {
    getStatus,
    connect,
    disconnect,
  },

  // Query execution
  query: {
    getAvailable: getAvailableQueries,
    execute: executeQuery,
    smartFormTransactions: querySmartFormTransactions,
  },
};
