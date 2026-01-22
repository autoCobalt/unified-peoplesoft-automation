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
