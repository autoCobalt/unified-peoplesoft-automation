/**
 * PeopleSoft Transaction Approval
 *
 * Shared Playwright interaction logic for approving a single transaction
 * on a PeopleSoft Fluid approval page (PSW_SF_APPR_FL).
 *
 * Handles the multi-modal confirmation chain:
 * 1. submitAction_win0(document.win0, 'APPROVE_BTN') - Initiate approval
 * 2. Confirmation: "Are you sure you want to proceed?" -> '#ICYes'
 * 3. Optional warning: "More than one active record" -> '#ICYes'
 * 4. Possible hard stop: "No fields adjusted / all fields match" -> skip
 *
 * Uses PeopleSoft's native form submission (submitAction_win0) instead of
 * DOM element clicks for reliability. Each call sets ICAction on the win0
 * form and triggers a POST — the server responds with either another modal,
 * a success message, or a hard stop.
 */

import type { Page } from 'playwright';

/* ==============================================
   Types
   ============================================== */

/** Result of a single transaction approval attempt */
export type ApprovalResult = 'approved' | 'skipped' | 'error';

export interface ApprovalOutcome {
  result: ApprovalResult;
  /** Human-readable detail about what happened */
  detail?: string;
}

/* ==============================================
   Constants
   ============================================== */

/**
 * Maximum number of confirmation modals to handle before bailing out.
 * Real PeopleSoft chains are typically 1-3 deep. If we hit 5, something
 * unexpected is happening on the page.
 */
const MAX_CONFIRMATIONS = 5;

/**
 * Time (ms) to wait for the page to settle after a form submission.
 * PeopleSoft Fluid pages use AJAX partial updates — networkidle alone
 * may resolve before the modal DOM is fully rendered.
 */
const POST_SUBMIT_SETTLE_MS = 500;

/**
 * Timeout (ms) for waiting for a recognizable page state after submission.
 * If neither a Yes button, success text, nor hard stop appears within this
 * window, we treat the transaction as an error.
 */
const STATE_DETECTION_TIMEOUT_MS = 15000;

/* ==============================================
   PeopleSoft Selectors & JS Expressions
   ============================================== */

/**
 * PeopleSoft element selectors for the approval flow.
 *
 * Note: The Yes button's `id` attribute is literally "#ICYES" (with the #).
 * In CSS selector syntax, the # must be escaped: #\\#ICYES.
 */
const PS_SELECTORS = {
  /** Yes/confirm button on modals (id="#ICYES") */
  YES_BUTTON: '#\\#ICYES',
  /** Success message text after approval completes */
  SUCCESS_TEXT: 'Transaction Approved Successfully',
} as const;

/**
 * JavaScript expressions evaluated in the browser page context via page.evaluate().
 * These are strings (not functions) so TypeScript's server-side type checker
 * doesn't complain about missing DOM globals (window, document).
 * At runtime, they execute in the PeopleSoft page where these globals exist.
 */
const PS_EVAL = {
  /** Initiate approval — sets ICAction='APPROVE_BTN' and submits the form */
  APPROVE: "submitAction_win0(document.win0, 'APPROVE_BTN')",
  /** Confirm a modal — sets ICAction='#ICYes' and submits */
  CONFIRM_YES: "submitAction_win0(document.win0, '#ICYes')",
} as const;

/* ==============================================
   Core Approval Function
   ============================================== */

/**
 * Approve a single transaction on the current PeopleSoft page.
 *
 * Assumes the page has already navigated to the transaction URL
 * and the page has finished loading (networkidle).
 *
 * @param page - Playwright Page instance pointed at the transaction
 * @returns Outcome with result type and optional detail message
 */
export async function approveTransaction(page: Page): Promise<ApprovalOutcome> {
  // Step 1: Initiate approval via PeopleSoft form submission.
  // submitAction_win0 sets ICAction='APPROVE_BTN' and submits the win0 form.
  // Wrap in try/catch because a full page reload (rare in Fluid) can reject the evaluate.
  try {
    await page.evaluate(PS_EVAL.APPROVE);
  } catch {
    // If evaluate rejects due to navigation, that's expected — the action worked
  }

  // Wait for the form submission response
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(POST_SUBMIT_SETTLE_MS);

  // Step 2: Handle the confirmation modal chain
  let confirmations = 0;

  while (confirmations < MAX_CONFIRMATIONS) {
    // Detect current page state: success, another confirmation, or hard stop
    const state = await detectPageState(page);

    switch (state) {
      case 'success':
        return { result: 'approved' };

      case 'confirmation': {
        // Click Yes via submitAction_win0 (more reliable than DOM click)
        try {
          await page.evaluate(PS_EVAL.CONFIRM_YES);
        } catch {
          // Navigation during evaluate is expected
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(POST_SUBMIT_SETTLE_MS);
        confirmations++;
        continue;
      }

      case 'hard-stop':
        // Dismiss the hard stop modal if possible, then skip
        await dismissHardStop(page);
        return {
          result: 'skipped',
          detail: 'No changes needed - all fields already match',
        };

      case 'unknown':
        return {
          result: 'error',
          detail: `Unrecognized page state after ${String(confirmations)} confirmation(s)`,
        };
    }
  }

  return {
    result: 'error',
    detail: `Exceeded maximum confirmations (${String(MAX_CONFIRMATIONS)})`,
  };
}

/* ==============================================
   Page State Detection
   ============================================== */

type PageState = 'success' | 'confirmation' | 'hard-stop' | 'unknown';

/**
 * Detect the current state of the PeopleSoft page after a form submission.
 *
 * Uses Promise.race with two concurrent checks:
 * 1. Success text appeared -> 'success'
 * 2. Yes button appeared -> 'confirmation' (another modal to confirm)
 * 3. Neither within timeout -> check for hard stop text, else 'unknown'
 */
async function detectPageState(page: Page): Promise<PageState> {
  // Race: wait for either success text or Yes button
  const result = await Promise.race([
    page.waitForSelector(`text=${PS_SELECTORS.SUCCESS_TEXT}`, { timeout: STATE_DETECTION_TIMEOUT_MS })
      .then(() => 'success' as const)
      .catch(() => null),
    page.waitForSelector(PS_SELECTORS.YES_BUTTON, { state: 'visible', timeout: STATE_DETECTION_TIMEOUT_MS })
      .then(() => 'confirmation' as const)
      .catch(() => null),
  ]);

  if (result) return result;

  // Neither appeared — check for hard stop indicators in the page text
  const bodyText = await page.textContent('body').catch(() => '');
  if (bodyText && isHardStopText(bodyText)) {
    return 'hard-stop';
  }

  return 'unknown';
}

/**
 * Check if the page body text contains hard stop indicators.
 * These are server-side messages indicating the transaction cannot proceed
 * because no field changes were detected.
 */
function isHardStopText(bodyText: string): boolean {
  const lowerText = bodyText.toLowerCase();
  const hardStopPatterns = [
    'no changes were made',
    'all fields already match',
    'no fields were adjusted',
    'nothing has changed',
  ];
  return hardStopPatterns.some(pattern => lowerText.includes(pattern));
}

/**
 * Attempt to dismiss a hard stop modal.
 * Hard stops typically have an OK or Close button instead of Yes/No.
 * Try common PeopleSoft modal dismiss actions via submitAction_win0,
 * then fall back to direct button clicks.
 */
async function dismissHardStop(page: Page): Promise<void> {
  // Try common PeopleSoft modal dismiss ICAction values
  const dismissActions = ['#ICOk', '#ICOK', '#ICCancel'];

  for (const action of dismissActions) {
    try {
      // Check if the corresponding button exists on the page
      const exists = await page.$(`#\\${action}`);
      if (exists) {
        await page.evaluate(`submitAction_win0(document.win0, '${action}')`);
        await page.waitForLoadState('networkidle').catch(() => {});
        return;
      }
    } catch {
      // Continue trying other actions
    }
  }

  // Fallback: try clicking any visible button with OK/Close text
  try {
    const okButton = await page.$('button:has-text("OK"), a:has-text("OK"), button:has-text("Close"), a:has-text("Close")');
    if (okButton) {
      await okButton.click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
  } catch {
    // Best effort — the modal may have already been dismissed
  }
}
