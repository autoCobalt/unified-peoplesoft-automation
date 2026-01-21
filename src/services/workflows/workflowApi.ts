/**
 * Workflow API Client
 *
 * Fetch-based client for communicating with the workflow middleware.
 * These are business-level endpoints - browser control is handled server-side.
 */

/* ==============================================
   Types
   ============================================== */

/** Workflow progress information */
export interface WorkflowProgress {
  current: number;
  total: number;
  currentItem?: string;
}

/** Workflow status values */
export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';

/** Manager workflow state from API */
export interface ManagerWorkflowState {
  status: WorkflowStatus;
  step: string;
  progress: WorkflowProgress | null;
  error: string | null;
  results: {
    preparedCount?: number;
    approvedCount?: number;
    submittedCount?: number;
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
 */
export async function pauseManagerWorkflow(): Promise<ApiResponse<{ message: string }>> {
  return apiRequest('/manager/pause', { method: 'POST' });
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

  const doPoll = async () => {
    if (controller.signal.aborted) return;

    const response = await getManagerStatus();

    const aborted = controller.signal.aborted as boolean;
    if (aborted) return;

    if (response.success) {
      callback(response.data, null);
    } else {
      callback(null, response.error.message);
    }

    const stillAborted = controller.signal.aborted as boolean;
    if (!stillAborted) {
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
  // other: { ... } will be added later
};
