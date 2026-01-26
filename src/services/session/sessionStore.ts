/**
 * Session Store
 *
 * Client-side storage for the API session token.
 * The session token is obtained from successful /connect calls
 * and must be included in all authenticated API requests.
 *
 * Storage Strategy:
 * - Uses sessionStorage (cleared on tab close) for security
 * - Token is NOT persisted to localStorage (intentional)
 * - Each browser tab gets its own session
 *
 * Why sessionStorage over localStorage?
 * - sessionStorage is cleared when the tab closes
 * - Reduces risk of token theft from persistent storage
 * - Aligns with server-side session expiration model
 */

/* ==============================================
   Constants
   ============================================== */

/**
 * Storage key for the session token
 */
const SESSION_TOKEN_KEY = 'unified-peoplesoft-session-token';

/**
 * HTTP header name for the session token
 * Must match the server's expected header
 */
export const SESSION_HEADER = 'X-Session-Token';

/* ==============================================
   Session Store Functions
   ============================================== */

/**
 * Store the session token
 *
 * @param token - The session token received from /connect
 */
export function setSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // sessionStorage may be unavailable in some contexts (e.g., private browsing)
    console.warn('[Session] Unable to store session token');
  }
}

/**
 * Retrieve the stored session token
 *
 * @returns The session token, or null if not set
 */
export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear the stored session token
 *
 * Called on disconnect or when session expires.
 */
export function clearSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Ignore errors - token is already effectively cleared
  }
}

/**
 * Check if a session token exists
 */
export function hasSessionToken(): boolean {
  return getSessionToken() !== null;
}

/**
 * Get headers object with session token included
 *
 * Use this to add auth headers to fetch requests.
 *
 * @returns Headers object with session token, or empty object if no token
 */
export function getSessionHeaders(): Record<string, string> {
  const token = getSessionToken();

  if (token) {
    return { [SESSION_HEADER]: token };
  }

  return {};
}

/* ==============================================
   Session Status Checking
   ============================================== */

/**
 * Response from the session status endpoint
 */
export interface SessionStatusResponse {
  success: boolean;
  data?: {
    valid: boolean;
    expiresInMs: number;
    reason?: 'no_token' | 'expired';
  };
}

/**
 * Check session validity with the server
 *
 * This is a lightweight call used for polling to detect session expiration.
 * It does NOT extend the session (passive check only).
 *
 * @returns Session status or null if request failed
 */
export async function checkSessionStatus(): Promise<SessionStatusResponse['data'] | null> {
  try {
    const token = getSessionToken();

    // No token means no session to check
    if (!token) {
      return { valid: false, expiresInMs: 0, reason: 'no_token' };
    }

    const response = await fetch('/api/session/status', {
      method: 'GET',
      headers: {
        [SESSION_HEADER]: token,
      },
    });

    if (!response.ok) {
      // Network/server error - don't clear session, might be temporary
      console.warn('[Session] Status check failed:', response.status);
      return null;
    }

    const result = await response.json() as SessionStatusResponse;

    if (result.success && result.data) {
      return result.data;
    }

    return null;
  } catch (error) {
    // Network error - don't clear session, might be temporary
    console.warn('[Session] Status check error:', error);
    return null;
  }
}
