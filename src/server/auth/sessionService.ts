/**
 * Session Service
 *
 * Manages authentication sessions for the API middleware.
 * Sessions are created when users successfully authenticate via Oracle or SOAP,
 * and must be included in subsequent API requests.
 *
 * Security Features:
 * - Cryptographically secure random tokens (256-bit)
 * - Automatic expiration after inactivity
 * - Session invalidation on disconnect
 * - Memory-only storage (no persistence - intentional for security)
 */

import { randomBytes } from 'crypto';

/* ==============================================
   Configuration
   ============================================== */

/**
 * Session timeout in milliseconds (30 minutes of inactivity)
 *
 * Why 30 minutes?
 * - Long enough for normal workflow operations
 * - Short enough to limit exposure if token is compromised
 * - Standard session timeout for enterprise applications
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Cleanup interval in milliseconds (5 minutes)
 *
 * Periodically removes expired sessions to prevent memory leaks.
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/* ==============================================
   Types
   ============================================== */

interface Session {
  /** The session token (also the map key for O(1) lookup) */
  token: string;

  /** Username associated with this session */
  username: string;

  /** Which service authenticated this session */
  authSource: 'oracle' | 'soap';

  /** Timestamp of session creation */
  createdAt: Date;

  /** Timestamp of last activity (updated on each valid request) */
  lastActivityAt: Date;
}

/* ==============================================
   Session Service Class
   ============================================== */

/**
 * Singleton service for managing API sessions
 *
 * Why a singleton?
 * - Sessions must be shared across all request handlers
 * - Single source of truth for authentication state
 * - Consistent cleanup scheduling
 */
class SessionService {
  /** Active sessions indexed by token for O(1) lookup */
  private sessions = new Map<string, Session>();

  /** Cleanup interval handle (for graceful shutdown) */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanupScheduler();
  }

  /* ==============================================
     Token Generation
     ============================================== */

  /**
   * Generate a cryptographically secure session token
   *
   * Why 32 bytes (256 bits)?
   * - Same entropy as a 256-bit AES key
   * - Impossible to brute force (2^256 possibilities)
   * - URL-safe when hex-encoded (64 characters)
   *
   * Why randomBytes instead of UUID?
   * - UUIDs have predictable structure (only ~122 bits of randomness)
   * - randomBytes uses OS-level cryptographic RNG
   * - Better resistance against timing attacks
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /* ==============================================
     Session Management
     ============================================== */

  /**
   * Create a new session for an authenticated user
   *
   * @param username - The authenticated username
   * @param authSource - Which service verified the credentials
   * @returns The session token to be sent to the client
   */
  createSession(username: string, authSource: 'oracle' | 'soap'): string {
    const token = this.generateToken();
    const now = new Date();

    const session: Session = {
      token,
      username,
      authSource,
      createdAt: now,
      lastActivityAt: now,
    };

    this.sessions.set(token, session);

    console.log(
      `[Auth] Session created for ${authSource} user (active sessions: ${String(this.sessions.size)})`
    );

    return token;
  }

  /**
   * Validate a session token and update last activity
   *
   * Returns the session if valid, null if invalid or expired.
   * Updates lastActivityAt on successful validation (sliding expiration).
   *
   * Why sliding expiration?
   * - Active users stay logged in
   * - Inactive sessions auto-expire
   * - Better UX than fixed expiration
   */
  validateSession(token: string | undefined): Session | null {
    if (!token) {
      return null;
    }

    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    const lastActivity = session.lastActivityAt.getTime();
    const elapsed = now - lastActivity;

    if (elapsed > SESSION_TIMEOUT_MS) {
      // Session expired - remove it
      this.sessions.delete(token);
      console.log('[Auth] Session expired and removed');
      return null;
    }

    // Update last activity (sliding expiration)
    session.lastActivityAt = new Date();

    return session;
  }

  /**
   * Invalidate a specific session (logout/disconnect)
   *
   * @param token - The session token to invalidate
   */
  invalidateSession(token: string | undefined): void {
    if (token && this.sessions.has(token)) {
      this.sessions.delete(token);
      console.log(`[Auth] Session invalidated (remaining: ${String(this.sessions.size)})`);
    }
  }

  /**
   * Invalidate all sessions for a specific auth source
   *
   * Used when Oracle or SOAP disconnects - invalidates all sessions
   * that were authenticated through that service.
   */
  invalidateByAuthSource(authSource: 'oracle' | 'soap'): void {
    let count = 0;

    for (const [token, session] of this.sessions) {
      if (session.authSource === authSource) {
        this.sessions.delete(token);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[Auth] Invalidated ${String(count)} ${authSource} session(s)`);
    }
  }

  /* ==============================================
     Cleanup Scheduler
     ============================================== */

  /**
   * Start the periodic cleanup of expired sessions
   *
   * Why periodic cleanup?
   * - Sessions that expire without new requests won't be checked
   * - Prevents memory growth from abandoned sessions
   * - Runs every 5 minutes to balance performance and memory
   */
  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);

    // Don't prevent Node.js from exiting
    this.cleanupInterval.unref();
  }

  /**
   * Remove all expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let removed = 0;

    for (const [token, session] of this.sessions) {
      const elapsed = now - session.lastActivityAt.getTime();

      if (elapsed > SESSION_TIMEOUT_MS) {
        this.sessions.delete(token);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Auth] Cleanup removed ${String(removed)} expired session(s)`);
    }
  }

  /**
   * Stop the cleanup scheduler (for graceful shutdown)
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }

  /* ==============================================
     Debug/Status Methods
     ============================================== */

  /**
   * Get the count of active sessions (for status endpoints)
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

/**
 * Singleton instance of the session service
 */
export const sessionService = new SessionService();
