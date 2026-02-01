/**
 * Workflow API Client
 *
 * Fetch-based client for communicating with the workflow middleware.
 * These are business-level endpoints - browser control is handled server-side.
 *
 * Authentication:
 * - All workflow endpoints require a valid session token
 * - Token is automatically included from session storage
 */

import type { RawWorkflowProgress, WorkflowStatus } from '../../server/workflows/types';
import { getSessionHeaders } from '../session/index.js';

/* ==============================================
   Types (re-export server types for convenience)
   ============================================== */

/** Re-export types from server */
export type { RawWorkflowProgress, WorkflowStatus } from '../../server/workflows/types';

/** Manager workflow state from API */
export interface ManagerWorkflowState {
  status: WorkflowStatus;
  step: string;
  progress: RawWorkflowProgress | null;
  error: string | null;
  results: {
    preparedCount?: number;
    approvedCount?: number;
    submittedCount?: number;
    transactionResults?: Record<string, 'approved' | 'error'>;
    pauseReason?: string;
  };
}

/** Generic API response wrapper */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: string } };

/* ==============================================
   Configuration
   ============================================== */

const API_BASE = '/api/workflows';

/* ==============================================
   Generic Request Helper
   ============================================== */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add session token - all workflow endpoints require authentication
    const sessionHeaders = getSessionHeaders();
    for (const [key, value] of Object.entries(sessionHeaders)) {
      headers.set(key, value);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json() as ApiResponse<T>;
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
   Manager Workflow API
   ============================================== */

/**
 * Get current Manager workflow status
 */
export async function getManagerStatus(): Promise<ApiResponse<ManagerWorkflowState>> {
  return apiRequest<ManagerWorkflowState>('/manager/status', { method: 'GET' });
}

/**
 * Start the approval workflow
 *
 * @param transactionIds - List of transaction IDs to approve
 * @param testSiteUrl - Optional test site URL for development
 */
export async function startManagerApprovals(
  transactionIds: string[],
  testSiteUrl?: string
): Promise<ApiResponse<{ message: string; transactionCount: number }>> {
  return apiRequest('/manager/approve', {
    method: 'POST',
    body: JSON.stringify({ transactionIds, testSiteUrl }),
  });
}

/**
 * Stop the current Manager workflow
 */
export async function stopManagerWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/manager/stop', { method: 'POST' });
}

/**
 * Reset the Manager workflow to initial state
 */
export async function resetManagerWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/manager/reset', { method: 'POST' });
}

/**
 * Pause the Manager workflow (pauses between transactions)
 *
 * @param reason - Optional reason for pausing (e.g., 'tab-switch')
 */
export async function pauseManagerWorkflow(reason?: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/manager/pause', {
    method: 'POST',
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

/**
 * Resume a paused Manager workflow
 */
export async function resumeManagerWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/manager/resume', { method: 'POST' });
}

/* ==============================================
   Polling Helper
   ============================================== */

/**
 * Poll Manager workflow status at regular intervals
 * Returns a cleanup function to stop polling
 */
export function pollManagerStatus(
  callback: (state: ManagerWorkflowState | null, error: string | null) => void,
  intervalMs = 250
): () => void {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Helper to check abort status - function call prevents TypeScript from
  // incorrectly caching the boolean value across await boundaries
  const isAborted = (): boolean => controller.signal.aborted;

  const doPoll = async () => {
    if (isAborted()) {
      return;
    }

    const response = await getManagerStatus();

    // Re-check after async operation - signal may have been aborted during the await
    if (isAborted()) {
      return;
    }

    if (response.success) {
      callback(response.data, null);
    } else {
      callback(null, response.error.message);
    }

    // Schedule next poll if not aborted
    if (!isAborted()) {
      timeoutId = setTimeout(() => {
        void doPoll();
      }, intervalMs);
    }
  };

  void doPoll();

  return () => {
    controller.abort();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}

/* ==============================================
   Other Workflow API
   ============================================== */

/** Other workflow state from API */
export interface OtherWorkflowApiState {
  status: WorkflowStatus;
  step: string;
  progress: RawWorkflowProgress | null;
  error: string | null;
  results: {
    approvedCount?: number;
    transactionResults?: Record<string, 'approved' | 'error'>;
    pauseReason?: string;
  };
}

/**
 * Get current Other workflow status
 */
export async function getOtherStatus(): Promise<ApiResponse<OtherWorkflowApiState>> {
  return apiRequest<OtherWorkflowApiState>('/other/status', { method: 'GET' });
}

/**
 * Start the Other approval workflow
 *
 * @param transactionIds - List of transaction IDs to approve
 * @param testSiteUrl - Optional test site URL for development
 */
export async function startOtherApprovals(
  transactionIds: string[],
  testSiteUrl?: string
): Promise<ApiResponse<{ message: string; transactionCount: number }>> {
  return apiRequest('/other/approve', {
    method: 'POST',
    body: JSON.stringify({ transactionIds, testSiteUrl }),
  });
}

/**
 * Stop the current Other workflow
 */
export async function stopOtherWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/other/stop', { method: 'POST' });
}

/**
 * Reset the Other workflow to initial state
 */
export async function resetOtherWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/other/reset', { method: 'POST' });
}

/**
 * Pause the Other workflow (pauses between transactions)
 *
 * @param reason - Optional reason for pausing (e.g., 'tab-switch')
 */
export async function pauseOtherWorkflow(reason?: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/other/pause', {
    method: 'POST',
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

/**
 * Resume a paused Other workflow
 */
export async function resumeOtherWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/other/resume', { method: 'POST' });
}

/**
 * Poll Other workflow status at regular intervals
 * Returns a cleanup function to stop polling
 */
export function pollOtherStatus(
  callback: (state: OtherWorkflowApiState | null, error: string | null) => void,
  intervalMs = 250
): () => void {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const isAborted = (): boolean => controller.signal.aborted;

  const doPoll = async () => {
    if (isAborted()) {
      return;
    }

    const response = await getOtherStatus();

    if (isAborted()) {
      return;
    }

    if (response.success) {
      callback(response.data, null);
    } else {
      callback(null, response.error.message);
    }

    if (!isAborted()) {
      timeoutId = setTimeout(() => {
        void doPoll();
      }, intervalMs);
    }
  };

  void doPoll();

  return () => {
    controller.abort();
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}

/* ==============================================
   Export as Service Object
   ============================================== */

export const workflowApi = {
  manager: {
    getStatus: getManagerStatus,
    startApprovals: startManagerApprovals,
    stop: stopManagerWorkflow,
    reset: resetManagerWorkflow,
    pause: pauseManagerWorkflow,
    resume: resumeManagerWorkflow,
    pollStatus: pollManagerStatus,
  },
  other: {
    getStatus: getOtherStatus,
    startApprovals: startOtherApprovals,
    stop: stopOtherWorkflow,
    reset: resetOtherWorkflow,
    pause: pauseOtherWorkflow,
    resume: resumeOtherWorkflow,
    pollStatus: pollOtherStatus,
  },
};
