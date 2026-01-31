/**
 * Manager Workflow Service
 *
 * Server-side service that orchestrates the Manager approval workflow.
 * Uses Playwright internally - browser control is NOT exposed via HTTP.
 */

import { playwrightService } from '../../playwright/index.js';
import type {
  ManagerWorkflowState,
  RawWorkflowProgress,
} from '../types.js';
import { INITIAL_MANAGER_STATE } from '../types.js';

/* ==============================================
   Error Detection Helpers
   ============================================== */

/**
 * Check if an error message indicates the browser was disconnected.
 * These are fatal errors that should stop the entire workflow.
 */
function isBrowserDisconnectedError(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Playwright throws these when browser/page is closed
  const fatalPatterns = [
    'target closed',           // Page or browser was closed
    'browser was closed',      // Our explicit check
    'browser has been closed', // Playwright browser.close()
    'context was destroyed',   // Browser context closed
    'page was closed',         // Page explicitly closed
    'protocol error',          // CDP connection lost
    'session closed',          // CDP session ended
    'connection closed',       // WebSocket connection lost
    'target crashed',          // Browser crashed
    'browser disconnected',    // Browser process died
  ];

  return fatalPatterns.some(pattern => lowerMessage.includes(pattern));
}

/* ==============================================
   Workflow State
   ============================================== */

/** Current workflow state (in-memory for now) */
let workflowState: ManagerWorkflowState = { ...INITIAL_MANAGER_STATE };

/** Abort controller for cancelling running workflows */
let abortController: AbortController | null = null;

/** Flag to track pause state (checked between transactions) */
let isPaused = false;

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
  isPaused = false;
  workflowState = { ...INITIAL_MANAGER_STATE };
}

/* ==============================================
   Internal State Updates
   ============================================== */

function updateState(updates: Partial<ManagerWorkflowState>): void {
  workflowState = { ...workflowState, ...updates };
}

function updateProgress(progress: RawWorkflowProgress | null): void {
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

  // Initialize state (use 1-indexed for user-facing progress display)
  abortController = new AbortController();
  updateState({
    status: 'running',
    currentStep: 'approving',
    error: null,
    progress: { current: 1, total: transactionIds.length, currentItem: transactionIds[0] },
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
    const transactionResults: Record<string, 'approved' | 'error'> = {};

    for (let i = 0; i < transactionIds.length; i++) {
      // Check for cancellation (use variable to satisfy TS control flow analysis)
      let isAborted = abortController.signal.aborted;
      if (isAborted) {
        updateState({ status: 'cancelled', currentStep: 'idle', isPaused: false });
        return { success: false, approvedCount, error: 'Workflow cancelled' };
      }

      // Check for pause - wait until resumed (or aborted)
      // Re-read signal each iteration since it can change asynchronously
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
        isAborted = abortController.signal.aborted;
        if (isAborted) break;
      }

      // Re-check cancellation after potential pause wait
      if (isAborted) {
        updateState({ status: 'cancelled', currentStep: 'idle', isPaused: false });
        return { success: false, approvedCount, error: 'Workflow cancelled' };
      }

      const transactionId = transactionIds[i];
      // Use 1-indexed display for user-facing progress (transaction 1 of N, not 0 of N)
      updateProgress({
        current: i + 1,
        total: transactionIds.length,
        currentItem: transactionId,
      });

      try {
        // Check if page is still available before each operation
        if (page.isClosed()) {
          throw new Error('Browser was closed');
        }

        // Navigate to transaction page (encode ID to handle special characters)
        const encodedId = encodeURIComponent(transactionId);
        const url = testSiteUrl
          ? `${testSiteUrl}?TRANSACTION_NBR=${encodedId}`
          : `https://peoplesoft.example.com/transaction/${encodedId}`;

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
        transactionResults[transactionId] = 'approved';
      } catch (pageError) {
        const errorMessage = pageError instanceof Error ? pageError.message : String(pageError);
        console.error(`[Manager Workflow] Error approving ${transactionId}:`, errorMessage);

        // Check if this is a fatal browser disconnection error
        // These errors mean the browser is gone and we can't continue
        const isFatalError = isBrowserDisconnectedError(errorMessage);

        if (isFatalError) {
          // Re-throw to fail the entire workflow
          throw new Error(`Browser disconnected: ${errorMessage}`);
        }

        // Non-fatal error - log and continue with next transaction
        console.log(`[Manager Workflow] Continuing to next transaction after non-fatal error`);
        transactionResults[transactionId] = 'error';
      }

      // Update results in real-time for polling (spreads for immutable snapshot)
      updateState({
        results: { ...workflowState.results, approvedCount, transactionResults: { ...transactionResults } },
      });

      // Add configurable delay between transactions (skip after last item)
      if (i < transactionIds.length - 1) {
        const delayMs = parseInt(process.env['VITE_APPROVAL_DELAY_MS'] ?? '200', 10);
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
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

  isPaused = false;

  // Close browser if it was opened by this workflow
  await playwrightService.close();

  updateState({
    status: 'cancelled',
    currentStep: 'idle',
    isPaused: false,
  });
}

/**
 * Pause a running workflow (pauses between transactions)
 * Does nothing if workflow is not running
 */
export function pause(): void {
  if (workflowState.status === 'running') {
    isPaused = true;
    updateState({ status: 'paused', isPaused: true });
  }
}

/**
 * Resume a paused workflow
 * Does nothing if workflow is not paused
 */
export function resume(): void {
  if (workflowState.status === 'paused') {
    isPaused = false;
    updateState({ status: 'running', isPaused: false });
  }
}

/* ==============================================
   Export as Service Object
   ============================================== */

export const managerWorkflowService = {
  getState,
  reset,
  runApprovals,
  stop,
  pause,
  resume,
};
