/**
 * Playwright Service
 *
 * Singleton service for browser lifecycle management.
 * Handles browser launch, close, and status tracking.
 *
 * This runs in Vite's Node.js server context, NOT in the browser.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { BROWSER_OPTIONS, TIMEOUTS } from './config.js';

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
   * Launch browser with configured options
   * Returns success/failure with error details
   */
  async launch(): Promise<{ success: true } | { success: false; error: PlaywrightError }> {
    console.log('[Playwright] ▶ launch() called');

    // Already connected
    if (this.browser?.isConnected()) {
      console.log('[Playwright]   ↳ Browser already connected, skipping launch');
      return { success: true };
    }

    try {
      this.lastError = null;
      console.log('[Playwright]   ↳ Launching new browser instance...');

      // Launch browser
      this.browser = await chromium.launch({
        ...BROWSER_OPTIONS,
        timeout: TIMEOUTS.LAUNCH,
      });
      console.log('[Playwright]   ↳ Browser process started');

      // Create context with viewport settings
      this.context = await this.browser.newContext({
        viewport: null, // Use full window size
      });
      console.log('[Playwright]   ↳ Browser context created');

      // Create initial page
      this.page = await this.context.newPage();
      console.log('[Playwright]   ↳ Browser page created');

      // Set up disconnect handler for browser process termination
      this.browser.on('disconnected', () => {
        this.handleDisconnect();
      });

      // Set up page close handler - fires when user closes the window
      this.page.on('close', () => {
        this.handlePageClose();
      });
      console.log('[Playwright]   ↳ Event listeners attached (disconnected, page close)');

      console.log('[Playwright] ✓ Browser launched successfully');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastError = errorMessage;

      console.error('[Playwright] ✗ Failed to launch browser:', errorMessage);

      return {
        success: false,
        error: this.categorizeError(error),
      };
    }
  }

  /**
   * Close browser and clean up resources
   */
  async close(): Promise<{ success: true } | { success: false; error: PlaywrightError }> {
    console.log('[Playwright] ▶ close() called');

    try {
      if (this.browser) {
        console.log('[Playwright]   ↳ Closing browser process...');
        await this.browser.close();
        console.log('[Playwright]   ↳ Browser process closed');
      } else {
        console.log('[Playwright]   ↳ No browser instance to close');
      }

      this.cleanup();
      console.log('[Playwright] ✓ Browser closed and cleaned up');
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
          message: 'Failed to close browser cleanly',
          details: errorMessage,
        },
      };
    }
  }

  /**
   * Ensure browser is ready for operations
   * Launches if not connected, returns existing if connected
   */
  async ensureReady(): Promise<{ success: true; page: Page } | { success: false; error: PlaywrightError }> {
    console.log('[Playwright] ▶ ensureReady() called');
    console.log('[Playwright]   ↳ Current state: browser=%s, page=%s',
      this.browser ? (this.browser.isConnected() ? 'connected' : 'disconnected') : 'null',
      this.page ? (this.page.isClosed() ? 'closed' : 'open') : 'null'
    );

    // Check if page is closed (user closed the window)
    // This can happen even if browser.isConnected() is still true
    if (this.page?.isClosed()) {
      console.log('[Playwright]   ↳ Detected closed page, cleaning up stale references...');
      await this.close();
    }

    // Try to launch if not connected
    if (!this.browser?.isConnected()) {
      console.log('[Playwright]   ↳ Browser not connected, launching...');
      const result = await this.launch();
      if (!result.success) {
        console.log('[Playwright] ✗ ensureReady() failed: could not launch browser');
        return result;
      }
    } else {
      console.log('[Playwright]   ↳ Browser already connected, reusing existing instance');
    }

    // Verify page exists and is not closed
    if (!this.page || this.page.isClosed()) {
      console.log('[Playwright] ✗ ensureReady() failed: page not available');
      return {
        success: false,
        error: {
          code: 'BROWSER_DISCONNECTED',
          message: 'Browser page not available',
        },
      };
    }

    console.log('[Playwright] ✓ ensureReady() successful - browser ready');
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
    // Both browser must be connected AND page must not be closed
    return (this.browser?.isConnected() ?? false) && !(this.page?.isClosed() ?? true);
  }

  /* ==============================================
     Processing State (for future use)
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
   * Handle unexpected browser disconnect
   */
  private handleDisconnect(): void {
    console.warn('[Playwright] ⚡ EVENT: Browser disconnected (process terminated)');
    this.lastError = 'Browser disconnected unexpectedly';
    this.cleanup();
  }

  /**
   * Handle page close (user closed the browser window)
   * Close the entire browser to ensure clean state on next launch
   */
  private handlePageClose(): void {
    console.warn('[Playwright] ⚡ EVENT: Page closed (user closed browser window)');
    this.lastError = 'Browser window was closed';
    // Close browser entirely to ensure clean state
    // Use void to handle the promise without blocking
    console.log('[Playwright]   ↳ Initiating full browser cleanup...');
    void this.close();
  }

  /**
   * Clean up all references
   */
  private cleanup(): void {
    console.log('[Playwright]   ↳ cleanup() - Resetting all references to null');
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

    // Browser executable not found (common during setup)
    if (lowerMessage.includes('executable') || lowerMessage.includes('msedge')) {
      return {
        code: 'BROWSER_NOT_LAUNCHED',
        message: 'Browser executable not found. Run: npx playwright install msedge',
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
