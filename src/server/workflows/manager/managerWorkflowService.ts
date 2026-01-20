/**
 * Manager Workflow Service
 *
 * Server-side service that orchestrates the Manager approval workflow.
 * Uses Playwright internally - browser control is NOT exposed via HTTP.
 */

import { playwrightService } from '../../playwright/index.js';
import type {
  ManagerWorkflowState,
  WorkflowProgress,
} from '../types.js';
import { INITIAL_MANAGER_STATE } from '../types.js';

/* ==============================================
   Workflow State
   ============================================== */

/** Current workflow state (in-memory for now) */
let workflowState: ManagerWorkflowState = { ...INITIAL_MANAGER_STATE };

/** Abort controller for cancelling running workflows */
let abortController: AbortController | null = null;

/* ==============================================
   State Accessors
   ============================================== */

/**
 * Get the current workflow state
 */
export function getState(): ManagerWorkflowState {
  return { ...workflowState };
}

/**
 * Reset workflow to initial state
 */
export function reset(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  workflowState = { ...INITIAL_MANAGER_STATE };
}

/* ==============================================
   Internal State Updates
   ============================================== */

function updateState(updates: Partial<ManagerWorkflowState>): void {
  workflowState = { ...workflowState, ...updates };
}

function updateProgress(progress: WorkflowProgress | null): void {
  workflowState = { ...workflowState, progress };
}

function setError(message: string): void {
  workflowState = {
    ...workflowState,
    status: 'error',
    error: message,
  };
}

/* ==============================================
   Workflow Actions
   ============================================== */

/**
 * Run the approval process for all transactions.
 * Launches browser internally, processes approvals, reports progress.
 *
 * @param transactionIds - List of transaction IDs to approve
 * @param testSiteUrl - URL to the test site (optional, for development)
 */
export async function runApprovals(
  transactionIds: string[],
  testSiteUrl?: string
): Promise<{ success: boolean; approvedCount: number; error?: string }> {
  if (workflowState.status === 'running') {
    return { success: false, approvedCount: 0, error: 'Workflow already running' };
  }

  // Initialize state
  abortController = new AbortController();
  updateState({
    status: 'running',
    currentStep: 'approving',
    error: null,
    progress: { current: 0, total: transactionIds.length },
  });

  try {
    // Launch browser internally - this is NOT exposed to the frontend
    const browserResult = await playwrightService.ensureReady();

    if (!browserResult.success) {
      setError(browserResult.error.message);
      return { success: false, approvedCount: 0, error: browserResult.error.message };
    }

    const page = browserResult.page;
    let approvedCount = 0;

    for (let i = 0; i < transactionIds.length; i++) {
      // Check for cancellation
      if (abortController.signal.aborted) {
        updateState({ status: 'cancelled', currentStep: 'idle' });
        return { success: false, approvedCount, error: 'Workflow cancelled' };
      }

      const transactionId = transactionIds[i];
      updateProgress({
        current: i,
        total: transactionIds.length,
        currentItem: transactionId,
      });

      try {
        // Navigate to transaction page
        const url = testSiteUrl
          ? `${testSiteUrl}?TRANSACTION_NBR=${transactionId}`
          : `https://peoplesoft.example.com/transaction/${transactionId}`;

        await page.goto(url, { waitUntil: 'networkidle' });

        // Click approve button
        await page.click('#APPROVE_BIN');

        // Wait for and confirm modal
        await page.waitForSelector('#ptModTable_3', { state: 'visible' });
        await page.click('#ICYes');

        // Wait for success indicator
        await page.waitForSelector('text=Transaction Approved Successfully', {
          timeout: 10000,
        });

        approvedCount++;
      } catch (pageError) {
        console.error(`[Manager Workflow] Error approving ${transactionId}:`, pageError);
        // Continue with next transaction instead of failing entire workflow
      }

      updateProgress({
        current: i + 1,
        total: transactionIds.length,
        currentItem: transactionId,
      });
    }

    // Workflow completed
    updateState({
      status: 'completed',
      currentStep: 'completed',
      results: { ...workflowState.results, approvedCount },
    });

    return { success: true, approvedCount };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setError(message);
    return { success: false, approvedCount: 0, error: message };

  } finally {
    abortController = null;
  }
}

/**
 * Stop a running workflow
 */
export async function stop(): Promise<void> {
  if (abortController) {
    abortController.abort();
  }

  // Close browser if it was opened by this workflow
  await playwrightService.close();

  updateState({
    status: 'cancelled',
    currentStep: 'idle',
  });
}

/* ==============================================
   Export as Service Object
   ============================================== */

export const managerWorkflowService = {
  getState,
  reset,
  runApprovals,
  stop,
};
