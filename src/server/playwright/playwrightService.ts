/**
 * Playwright Service
 *
 * Singleton service for browser lifecycle management via Chrome DevTools Protocol.
 * Connects to the user's existing Edge browser to inherit SSO/authentication state,
 * or launches Edge with a debug port if none is running.
 *
 * This runs in the Fastify server's Node.js context, NOT in the browser.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { CDP_CONFIG, getEdgeExecutablePath } from './config.js';

/* ==============================================
   Types
   ============================================== */

export interface BrowserStatus {
  browserConnected: boolean;
  isProcessing: boolean;
  currentTransaction: string | null;
  lastError: string | null;
}

export type PlaywrightErrorCode =
  | 'BROWSER_NOT_LAUNCHED'
  | 'BROWSER_DISCONNECTED'
  | 'EDGE_ALREADY_RUNNING'
  | 'TIMEOUT'
  | 'ELEMENT_NOT_FOUND'
  | 'NAVIGATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface PlaywrightError {
  code: PlaywrightErrorCode;
  message: string;
  details?: string;
}

/* ==============================================
   CDP Helpers
   ============================================== */

/**
 * Poll the CDP /json/version endpoint until Edge is accepting connections.
 * Throws if the debug port isn't ready within the timeout.
 */
async function waitForDebugPort(port: number, timeout: number, interval: number): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${String(port)}/json/version`);
      if (response.ok) return;
    } catch {
      // Not ready yet — keep polling
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Edge debug port ${String(port)} not ready after ${String(timeout)}ms`);
}

/* ==============================================
   Playwright Service Singleton
   ============================================== */

class PlaywrightService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private isProcessing = false;
  private currentTransaction: string | null = null;
  private lastError: string | null = null;

  /* ==============================================
     Browser Lifecycle
     ============================================== */

  /**
   * Connect to Edge via CDP.
   *
   * Flow:
   * 1. Try connecting to an existing Edge debug port
   * 2. If that fails, launch Edge with --remote-debugging-port
   * 3. Wait for the debug port to become ready
   * 4. Connect via CDP
   * 5. Use the default browser context (has user's cookies/SSO)
   * 6. Open a new tab for automation
   */
  async launch(): Promise<{ success: true } | { success: false; error: PlaywrightError }> {
    console.log('[Playwright] ▶ launch() called (CDP mode)');

    // Already connected
    if (this.browser?.isConnected()) {
      console.log('[Playwright]   ↳ Browser already connected via CDP, skipping');
      return { success: true };
    }

    const { port, connectTimeout, connectRetryInterval } = CDP_CONFIG;
    const endpointURL = `http://localhost:${String(port)}`;

    try {
      this.lastError = null;

      // --- Step 1: Try connecting to existing Edge with debug port ---
      let connected = false;
      try {
        console.log('[Playwright]   ↳ Attempting CDP connection to %s...', endpointURL);
        this.browser = await chromium.connectOverCDP(endpointURL, { timeout: 5000 });
        connected = true;
        console.log('[Playwright]   ↳ Connected to existing Edge instance');
      } catch {
        console.log('[Playwright]   ↳ No existing Edge debug port found, will launch Edge');
      }

      // --- Step 2: Launch Edge if not already listening ---
      if (!connected) {
        const launched = this.launchEdgeProcess(port);
        if (!launched) {
          return {
            success: false,
            error: {
              code: 'BROWSER_NOT_LAUNCHED',
              message: 'Failed to launch Edge. Is Microsoft Edge installed?',
              details: `Tried: ${getEdgeExecutablePath()}`,
            },
          };
        }

        // --- Step 3: Wait for debug port ---
        console.log('[Playwright]   ↳ Waiting for Edge debug port %d...', port);
        try {
          await waitForDebugPort(port, connectTimeout, connectRetryInterval);
        } catch (waitError) {
          const msg = waitError instanceof Error ? waitError.message : 'Timeout';
          this.lastError = msg;
          return {
            success: false,
            error: {
              code: 'TIMEOUT',
              message: 'Edge launched but debug port did not become ready in time',
              details: msg,
            },
          };
        }

        // --- Step 4: Connect via CDP ---
        console.log('[Playwright]   ↳ Connecting to freshly-launched Edge via CDP...');
        try {
          this.browser = await chromium.connectOverCDP(endpointURL, { timeout: 10_000 });
          console.log('[Playwright]   ↳ CDP connection established');
        } catch (cdpError) {
          const msg = cdpError instanceof Error ? cdpError.message : 'Unknown error';
          this.lastError = msg;
          return {
            success: false,
            error: {
              code: 'BROWSER_NOT_LAUNCHED',
              message: 'Edge is running but CDP connection failed. The profile may be locked by another Edge process.',
              details: msg,
            },
          };
        }
      }

      // At this point this.browser is guaranteed set by one of the paths above.
      // Capture in a local const so TypeScript can narrow it past awaits.
      const browser = this.browser;
      if (!browser) {
        return {
          success: false,
          error: { code: 'BROWSER_NOT_LAUNCHED', message: 'CDP connection was not established' },
        };
      }

      // --- Step 5: Get default context (has user's cookies/SSO) ---
      const contexts = browser.contexts();
      this.context = contexts[0] ?? await browser.newContext({ viewport: null });
      console.log('[Playwright]   ↳ Using browser context (%d existing contexts)', contexts.length);

      // --- Step 6: Create a new tab ---
      this.page = await this.context.newPage();
      console.log('[Playwright]   ↳ New tab created for automation');

      // Set up event listeners
      browser.on('disconnected', () => {
        this.handleDisconnect();
      });

      this.page.on('close', () => {
        this.handlePageClose();
      });
      console.log('[Playwright]   ↳ Event listeners attached (disconnected, page close)');

      console.log('[Playwright] ✓ Browser ready via CDP');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = errorMessage;
      console.error('[Playwright] ✗ Failed to connect via CDP:', errorMessage);

      return {
        success: false,
        error: this.categorizeError(error),
      };
    }
  }

  /**
   * Close our automation tab and disconnect CDP.
   * Edge stays running — only our tab is closed.
   */
  async close(): Promise<{ success: true } | { success: false; error: PlaywrightError }> {
    console.log('[Playwright] ▶ close() called');

    try {
      // Close our automation tab (if it's still open)
      if (this.page && !this.page.isClosed()) {
        console.log('[Playwright]   ↳ Closing automation tab...');
        await this.page.close();
        console.log('[Playwright]   ↳ Automation tab closed');
      }

      // Disconnect CDP (does NOT kill Edge — it stays running for the user)
      if (this.browser) {
        console.log('[Playwright]   ↳ Disconnecting CDP...');
        await this.browser.close();
        console.log('[Playwright]   ↳ CDP disconnected (Edge still running)');
      } else {
        console.log('[Playwright]   ↳ No browser connection to close');
      }

      this.cleanup();
      console.log('[Playwright] ✓ Cleanup complete');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = errorMessage;
      console.error('[Playwright] ✗ Error during close:', errorMessage);

      // Clean up even on error
      this.cleanup();
      console.log('[Playwright]   ↳ Cleanup completed despite error');

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to close cleanly',
          details: errorMessage,
        },
      };
    }
  }

  /**
   * Ensure browser is ready for operations.
   *
   * Three recovery paths:
   * 1. Page exists and is open → return it
   * 2. Browser connected but page closed → create new tab (fast)
   * 3. Browser disconnected → full CDP reconnect via launch()
   */
  async ensureReady(): Promise<{ success: true; page: Page } | { success: false; error: PlaywrightError }> {
    console.log('[Playwright] ▶ ensureReady() called');
    console.log('[Playwright]   ↳ Current state: browser=%s, page=%s',
      this.browser ? (this.browser.isConnected() ? 'connected' : 'disconnected') : 'null',
      this.page ? (this.page.isClosed() ? 'closed' : 'open') : 'null'
    );

    // Fast path: page is ready
    if (this.page && !this.page.isClosed() && this.browser?.isConnected()) {
      console.log('[Playwright] ✓ ensureReady() — page already available');
      return { success: true, page: this.page };
    }

    // Recovery path A: browser connected but page was closed → open new tab
    if (this.browser?.isConnected() && (!this.page || this.page.isClosed())) {
      console.log('[Playwright]   ↳ Browser connected but page closed — creating new tab...');
      try {
        const contexts = this.browser.contexts();
        this.context = contexts[0] ?? await this.browser.newContext({ viewport: null });
        this.page = await this.context.newPage();
        this.page.on('close', () => { this.handlePageClose(); });
        this.lastError = null;
        console.log('[Playwright] ✓ ensureReady() — new tab created in existing browser');
        return { success: true, page: this.page };
      } catch {
        console.warn('[Playwright]   ↳ Failed to create new tab, falling through to full reconnect');
        this.cleanup();
      }
    }

    // Recovery path B: browser disconnected → full CDP reconnect
    if (!this.browser?.isConnected()) {
      console.log('[Playwright]   ↳ Browser not connected, launching via CDP...');
      this.cleanup();
      const result = await this.launch();
      if (!result.success) {
        console.log('[Playwright] ✗ ensureReady() failed: could not connect via CDP');
        return result;
      }
    }

    // Verify page is available after reconnect
    if (!this.page || this.page.isClosed()) {
      console.log('[Playwright] ✗ ensureReady() failed: page not available after reconnect');
      return {
        success: false,
        error: {
          code: 'BROWSER_DISCONNECTED',
          message: 'Browser page not available after CDP reconnect',
        },
      };
    }

    console.log('[Playwright] ✓ ensureReady() successful — browser ready');
    return { success: true, page: this.page };
  }

  /* ==============================================
     Status
     ============================================== */

  /**
   * Get current browser status
   */
  getStatus(): BrowserStatus {
    return {
      browserConnected: this.isConnected(),
      isProcessing: this.isProcessing,
      currentTransaction: this.currentTransaction,
      lastError: this.lastError,
    };
  }

  /**
   * Check if browser is connected and page is usable
   */
  isConnected(): boolean {
    return (this.browser?.isConnected() ?? false) && !(this.page?.isClosed() ?? true);
  }

  /* ==============================================
     Processing State
     ============================================== */

  /**
   * Set processing state for UI feedback
   */
  setProcessing(processing: boolean, transactionId?: string): void {
    this.isProcessing = processing;
    this.currentTransaction = processing ? (transactionId ?? null) : null;
  }

  /**
   * Clear last error
   */
  clearError(): void {
    this.lastError = null;
  }

  /* ==============================================
     Internal Helpers
     ============================================== */

  /**
   * Launch Edge as a detached process with --remote-debugging-port.
   * The process is unref'd so Edge survives if Node exits.
   */
  private launchEdgeProcess(port: number): boolean {
    const edgePath = getEdgeExecutablePath();
    const { userDataDir } = CDP_CONFIG;

    const args = [
      `--remote-debugging-port=${String(port)}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ];

    console.log('[Playwright]   ↳ Launching Edge: %s', edgePath);
    console.log('[Playwright]   ↳ Args: %s', args.join(' '));

    try {
      const child: ChildProcess = spawn(edgePath, args, {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      console.log('[Playwright]   ↳ Edge process spawned (detached, pid=%s)', String(child.pid ?? 'unknown'));
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Playwright] ✗ Failed to spawn Edge:', msg);
      this.lastError = msg;
      return false;
    }
  }

  /**
   * Handle unexpected browser disconnect (Edge was closed entirely).
   * In CDP mode this means the user closed all Edge windows or Edge crashed.
   */
  private handleDisconnect(): void {
    console.warn('[Playwright] ⚡ EVENT: CDP disconnected (Edge closed or crashed)');
    this.lastError = 'Edge browser was closed';
    this.cleanup();
  }

  /**
   * Handle automation tab close.
   * In CDP mode we don't kill the browser — just note the tab is gone.
   * ensureReady() will create a new tab on the next transaction.
   */
  private handlePageClose(): void {
    console.warn('[Playwright] ⚡ EVENT: Automation tab closed');
    this.lastError = 'Automation tab was closed';
    this.page = null;
  }

  /**
   * Clean up all references
   */
  private cleanup(): void {
    console.log('[Playwright]   ↳ cleanup() — Resetting all references to null');
    this.page = null;
    this.context = null;
    this.browser = null;
    this.isProcessing = false;
    this.currentTransaction = null;
  }

  /**
   * Categorize error into PlaywrightError
   */
  private categorizeError(error: unknown): PlaywrightError {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const lowerMessage = message.toLowerCase();

    // Timeout errors
    if (lowerMessage.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Operation timed out',
        details: message,
      };
    }

    // Navigation errors
    if (lowerMessage.includes('navigation') || lowerMessage.includes('net::')) {
      return {
        code: 'NAVIGATION_ERROR',
        message: 'Navigation failed',
        details: message,
      };
    }

    // Element not found
    if (lowerMessage.includes('element') || lowerMessage.includes('selector')) {
      return {
        code: 'ELEMENT_NOT_FOUND',
        message: 'Element not found on page',
        details: message,
      };
    }

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        details: message,
      };
    }

    // Browser executable not found
    if (lowerMessage.includes('executable') || lowerMessage.includes('msedge') || lowerMessage.includes('spawn')) {
      return {
        code: 'BROWSER_NOT_LAUNCHED',
        message: 'Edge not found. Is Microsoft Edge installed?',
        details: message,
      };
    }

    // Profile locked / already running
    if (lowerMessage.includes('lock') || lowerMessage.includes('profile')) {
      return {
        code: 'EDGE_ALREADY_RUNNING',
        message: 'Edge profile appears to be locked. Close Edge and retry, or restart Edge with the debug port.',
        details: message,
      };
    }

    // Default
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: message,
    };
  }

  /* ==============================================
     Getters for Advanced Usage
     ============================================== */

  /**
   * Get current page (for direct Playwright operations)
   * Returns null if browser not connected
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Get browser context
   */
  getContext(): BrowserContext | null {
    return this.context;
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

export const playwrightService = new PlaywrightService();
