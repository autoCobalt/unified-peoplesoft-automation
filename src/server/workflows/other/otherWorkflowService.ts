/**
 * Other Workflow Service
 *
 * Server-side service that orchestrates the Other approval workflow.
 * Uses Playwright internally - browser control is NOT exposed via HTTP.
 *
 * Cloned from managerWorkflowService with the same in-memory state pattern,
 * pause/resume support, and browser disconnection detection.
 */

import { playwrightService } from '../../playwright/index.js';
import { eventBus } from '../../events/index.js';
import type {
  OtherWorkflowState,
  RawWorkflowProgress,
} from '../types.js';
import { INITIAL_OTHER_STATE } from '../types.js';

/* ==============================================
   Error Detection Helpers
   ============================================== */

/**
 * Check if an error message indicates the browser was disconnected.
 * These are fatal errors that should stop the entire workflow.
 */
function isBrowserDisconnectedError(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const fatalPatterns = [
    'target closed',
    'browser was closed',
    'browser has been closed',
    'context was destroyed',
    'page was closed',
    'protocol error',
    'session closed',
    'connection closed',
    'target crashed',
    'browser disconnected',
  ];

  return fatalPatterns.some(pattern => lowerMessage.includes(pattern));
}

/* ==============================================
   Workflow State
   ============================================== */

/** Current workflow state (in-memory) */
let workflowState: OtherWorkflowState = { ...INITIAL_OTHER_STATE };

/** Abort controller for cancelling running workflows */
let abortController: AbortController | null = null;

/** Flag to track pause state (checked between transactions) */
let isPaused = false;

/** Session token of the client that started this workflow (for event routing) */
let activeSessionToken: string | null = null;

/**
 * Read isPaused through a function call to prevent TypeScript control flow analysis
 * from incorrectly caching the boolean value. This is necessary because isPaused is
 * modified externally by pause()/resume() from different async contexts.
 */
function checkIsPaused(): boolean {
  return isPaused;
}

/* ==============================================
   State Accessors
   ============================================== */

/**
 * Get the current workflow state
 */
export function getState(): OtherWorkflowState {
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
  activeSessionToken = null;
  workflowState = { ...INITIAL_OTHER_STATE };
}

/* ==============================================
   Internal State Updates
   ============================================== */

function updateState(updates: Partial<OtherWorkflowState>): void {
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

/**
 * Emit current workflow state as a WebSocket event.
 * Called after every state mutation to push updates to the client instantly.
 */
function emitProgress(): void {
  if (!activeSessionToken) return;

  eventBus.emit({
    type: 'workflow:progress',
    sessionToken: activeSessionToken,
    payload: {
      workflowType: 'other',
      status: workflowState.status,
      step: workflowState.currentStep,
      progress: workflowState.progress,
      error: workflowState.error,
      results: {
        approvedCount: workflowState.results.approvedCount,
        transactionResults: workflowState.results.transactionResults,
        pauseReason: workflowState.results.pauseReason,
      },
    },
  });
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
 * @param sessionToken - Session token for WebSocket event routing
 */
export async function runApprovals(
  transactionIds: string[],
  testSiteUrl?: string,
  sessionToken?: string,
): Promise<{ success: boolean; approvedCount: number; error?: string }> {
  if (workflowState.status === 'running') {
    return { success: false, approvedCount: 0, error: 'Workflow already running' };
  }

  // Store session token for event routing
  activeSessionToken = sessionToken ?? null;

  // Initialize state (use 1-indexed for user-facing progress display)
  // Clear results to prevent stale transactionResults from a previous run
  // bleeding through on the first poll (before the loop overwrites them).
  abortController = new AbortController();
  updateState({
    status: 'running',
    currentStep: 'approving',
    error: null,
    progress: { current: 1, total: transactionIds.length, currentItem: transactionIds[0] },
    results: {},
  });
  emitProgress();

  try {
    // Launch browser internally - this is NOT exposed to the frontend
    const browserResult = await playwrightService.ensureReady();

    if (!browserResult.success) {
      setError(browserResult.error.message);
      emitProgress();
      return { success: false, approvedCount: 0, error: browserResult.error.message };
    }

    let page = browserResult.page;
    let approvedCount = 0;
    const transactionResults: Record<string, 'approved' | 'error'> = {};

    for (let i = 0; i < transactionIds.length; i++) {
      // Check for cancellation — variable prevents TS from narrowing
      // abortController.signal.aborted (it can change across await boundaries)
      let isAborted = abortController.signal.aborted;
      if (isAborted) {
        updateState({ status: 'cancelled', currentStep: 'idle', isPaused: false });
        emitProgress();
        return { success: false, approvedCount, error: 'Workflow cancelled' };
      }

      // Check for pause - wait until resumed (or aborted)
      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        isAborted = abortController.signal.aborted;
        if (isAborted) break;
      }

      // Re-check cancellation after potential pause wait
      if (isAborted) {
        updateState({ status: 'cancelled', currentStep: 'idle', isPaused: false });
        emitProgress();
        return { success: false, approvedCount, error: 'Workflow cancelled' };
      }

      // Browser health check after pause resume — browser may have died while paused
      if (!playwrightService.isConnected()) {
        console.log('[Other Workflow] Browser died while paused — re-launching');
        const recoveryResult = await playwrightService.ensureReady();
        if (!recoveryResult.success) {
          throw new Error(`Browser recovery failed: ${recoveryResult.error.message}`);
        }
        page = recoveryResult.page;
      }

      const transactionId = transactionIds[i];
      // Use 1-indexed display for user-facing progress
      updateProgress({
        current: i + 1,
        total: transactionIds.length,
        currentItem: transactionId,
      });
      emitProgress();

      try {
        // Check if page is still available before each operation
        if (page.isClosed()) {
          throw new Error('Browser was closed');
        }

        // Navigate to transaction page
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
        console.error(`[Other Workflow] Error approving ${transactionId}:`, errorMessage);

        // Check if this is a browser disconnection error
        // Instead of crashing, auto-pause so the user can choose when to resume
        if (isBrowserDisconnectedError(errorMessage)) {
          isPaused = true;
          updateState({
            status: 'paused',
            isPaused: true,
            results: {
              ...workflowState.results,
              approvedCount,
              transactionResults: { ...transactionResults },
              pauseReason: 'browser-closed',
            },
          });
          emitProgress();
          console.log(`[Other Workflow] Browser closed — auto-paused at transaction ${transactionId}`);

          // Wait for resume (same pattern as manual pause)
          // Uses checkIsPaused() to prevent TS control flow from caching the true assignment above
          while (checkIsPaused()) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (abortController.signal.aborted) break;
          }
          if (abortController.signal.aborted) {
            updateState({ status: 'cancelled', currentStep: 'idle', isPaused: false });
            return { success: false, approvedCount, error: 'Workflow cancelled' };
          }

          // User resumed — re-launch browser
          const recoveryResult = await playwrightService.ensureReady();
          if (!recoveryResult.success) {
            throw new Error(`Browser recovery failed: ${recoveryResult.error.message}`);
          }
          page = recoveryResult.page;

          // Clear pause reason now that we've recovered
          updateState({
            status: 'running',
            results: { ...workflowState.results, pauseReason: undefined },
          });
          emitProgress();

          // Retry this transaction (decrement i to re-process current index)
          i--;
          continue;
        }

        // Non-fatal error - log and continue with next transaction
        console.log(`[Other Workflow] Continuing to next transaction after non-fatal error`);
        transactionResults[transactionId] = 'error';
      }

      // Update results in real-time for polling + WebSocket push
      updateState({
        results: { ...workflowState.results, approvedCount, transactionResults: { ...transactionResults } },
      });
      emitProgress();

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
    emitProgress();

    return { success: true, approvedCount };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setError(message);
    emitProgress();
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
  emitProgress();
}

/**
 * Pause a running workflow.
 *
 * Takes effect BETWEEN transactions — if called mid-transaction, the current
 * transaction completes before the workflow pauses (up to ~10s for page operations).
 * Does nothing if workflow is not running.
 *
 * @param reason - Optional reason for pausing (e.g., 'tab-switch', 'browser-closed')
 */
export function pause(reason?: string): void {
  if (workflowState.status === 'running') {
    isPaused = true;
    updateState({
      status: 'paused',
      isPaused: true,
      results: { ...workflowState.results, pauseReason: reason },
    });
    emitProgress();
  }
}

/**
 * Resume a paused workflow
 */
export function resume(): void {
  if (workflowState.status === 'paused') {
    isPaused = false;
    updateState({
      status: 'running',
      isPaused: false,
      results: { ...workflowState.results, pauseReason: undefined },
    });
    emitProgress();
  }
}

/* ==============================================
   Export as Service Object
   ============================================== */

export const otherWorkflowService = {
  getState,
  reset,
  runApprovals,
  stop,
  pause,
  resume,
};
