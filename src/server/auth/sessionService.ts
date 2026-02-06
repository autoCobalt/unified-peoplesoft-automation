/**
 * Session Service
 *
 * Manages authentication sessions with a multi-tier auth model.
 * A single session token can have independent Oracle and SOAP auth levels.
 *
 * Token Lifecycle:
 * 1. POST /api/session/create → general session (no auth levels)
 * 2. Oracle connect → session.auth.oracle.verified = true (same token)
 * 3. SOAP connect → session.auth.soap.verified = true (same token)
 * 4. Oracle disconnect → oracle level revoked (token stays alive)
 * 5. SOAP disconnect → soap level revoked (token stays alive)
 * 6. 30-min inactivity → entire session expires
 *
 * Security Features:
 * - Cryptographically secure random tokens (256-bit)
 * - Automatic expiration after inactivity
 * - Memory-only storage (no persistence - intentional for security)
 */

import { randomBytes } from 'crypto';
import { logInfo } from '../utils/index.js';
import { eventBus } from '../events/index.js';

/* ==============================================
   Configuration
   ============================================== */

/**
 * Session timeout in milliseconds (30 minutes of inactivity)
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Cleanup interval in milliseconds (5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/* ==============================================
   Types
   ============================================== */

interface AuthLevel {
  /** Whether this auth level is currently verified */
  verified: boolean;
  /** Username that authenticated this level (null if not verified) */
  username: string | null;
  /** When this level was last verified (null if never) */
  verifiedAt: Date | null;
}

export interface Session {
  /** The session token (also the map key for O(1) lookup) */
  token: string;

  /** Timestamp of session creation */
  createdAt: Date;

  /** Timestamp of last activity (updated on each valid request) */
  lastActivityAt: Date;

  /** Multi-tier authentication state */
  auth: {
    oracle: AuthLevel;
    soap: AuthLevel;
  };
}

/* ==============================================
   Session Service Class
   ============================================== */

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

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /* ==============================================
     Session Management
     ============================================== */

  /**
   * Create a new general session (no auth levels verified yet)
   *
   * Returns an existing session token if one is provided and still valid,
   * otherwise creates a new one.
   */
  createSession(existingToken?: string): string {
    // If an existing valid token is provided, return it
    if (existingToken) {
      const existing = this.sessions.get(existingToken);
      if (existing && !this.isExpired(existing)) {
        existing.lastActivityAt = new Date();
        return existingToken;
      }
    }

    const token = this.generateToken();
    const now = new Date();

    const session: Session = {
      token,
      createdAt: now,
      lastActivityAt: now,
      auth: {
        oracle: { verified: false, username: null, verifiedAt: null },
        soap: { verified: false, username: null, verifiedAt: null },
      },
    };

    this.sessions.set(token, session);

    logInfo('Auth', `Session created (active sessions: ${String(this.sessions.size)})`);

    return token;
  }

  /**
   * Upgrade a session's auth level after successful connection.
   *
   * If no token is provided, creates a new session first.
   * Returns the token (existing or newly created).
   */
  upgradeAuth(
    authSource: 'oracle' | 'soap',
    username: string,
    existingToken?: string,
  ): string {
    // Ensure we have a valid session
    const token = this.createSession(existingToken);
    const session = this.sessions.get(token);

    if (session) {
      session.auth[authSource] = {
        verified: true,
        username,
        verifiedAt: new Date(),
      };
      session.lastActivityAt = new Date();

      logInfo('Auth', `Session upgraded: ${authSource} verified for ${username}`);

      // Notify WebSocket clients of auth change
      const eventType = authSource === 'oracle' ? 'auth:oracle-changed' : 'auth:soap-changed';
      eventBus.emit({
        type: eventType,
        sessionToken: token,
        payload: { verified: true, username, reason: 'connected' },
      });
    }

    return token;
  }

  /**
   * Downgrade a session's auth level (disconnect without invalidating session).
   */
  downgradeAuth(token: string | undefined, authSource: 'oracle' | 'soap'): void {
    if (!token) return;

    const session = this.sessions.get(token);
    if (session) {
      const wasVerified = session.auth[authSource].verified;
      session.auth[authSource] = {
        verified: false,
        username: null,
        verifiedAt: null,
      };

      logInfo('Auth', `Session downgraded: ${authSource} auth revoked`);

      // Notify WebSocket clients if auth level actually changed
      if (wasVerified) {
        const eventType = authSource === 'oracle' ? 'auth:oracle-changed' : 'auth:soap-changed';
        eventBus.emit({
          type: eventType,
          sessionToken: token,
          payload: { verified: false, username: null, reason: 'disconnected' },
        });
      }
    }
  }

  /**
   * Downgrade all sessions' auth level for a source.
   * Used when a service disconnects affecting all users.
   */
  downgradeAllByAuthSource(authSource: 'oracle' | 'soap'): void {
    let count = 0;
    const eventType = authSource === 'oracle' ? 'auth:oracle-changed' : 'auth:soap-changed';

    for (const session of this.sessions.values()) {
      if (session.auth[authSource].verified) {
        session.auth[authSource] = {
          verified: false,
          username: null,
          verifiedAt: null,
        };
        count++;

        // Notify each affected session's WebSocket clients
        eventBus.emit({
          type: eventType,
          sessionToken: session.token,
          payload: { verified: false, username: null, reason: 'service-disconnected' },
        });
      }
    }

    if (count > 0) {
      logInfo('Auth', `Downgraded ${String(count)} session(s): ${authSource} auth revoked`);
    }
  }

  /**
   * Validate a session token and update last activity (sliding expiration).
   */
  validateSession(token: string | undefined): Session | null {
    if (!token) return null;

    const session = this.sessions.get(token);
    if (!session) return null;

    if (this.isExpired(session)) {
      this.sessions.delete(token);
      logInfo('Auth', 'Session expired and removed');
      eventBus.emit({ type: 'session:expired', sessionToken: token, payload: {} });
      return null;
    }

    // Update last activity (sliding expiration)
    session.lastActivityAt = new Date();
    return session;
  }

  /**
   * Invalidate a specific session entirely (full logout).
   */
  invalidateSession(token: string | undefined): void {
    if (token && this.sessions.has(token)) {
      this.sessions.delete(token);
      logInfo('Auth', `Session invalidated (remaining: ${String(this.sessions.size)})`);
    }
  }

  /* ==============================================
     Cleanup Scheduler
     ============================================== */

  private isExpired(session: Session): boolean {
    const elapsed = Date.now() - session.lastActivityAt.getTime();
    return elapsed > SESSION_TIMEOUT_MS;
  }

  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);

    this.cleanupInterval.unref();
  }

  private cleanupExpiredSessions(): void {
    const tokensToRemove: string[] = [];

    for (const [token, session] of this.sessions) {
      if (this.isExpired(session)) {
        tokensToRemove.push(token);
      }
    }

    for (const token of tokensToRemove) {
      this.sessions.delete(token);

      // Notify WebSocket clients that their session has expired
      eventBus.emit({
        type: 'session:expired',
        sessionToken: token,
        payload: {},
      });
    }

    if (tokensToRemove.length > 0) {
      logInfo('Auth', `Cleanup removed ${String(tokensToRemove.length)} expired session(s)`);
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
     Status Methods
     ============================================== */

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session info without updating last activity (read-only check).
   * Used by session status endpoint — passive polling shouldn't extend sessions.
   */
  getSessionInfo(token: string | undefined): {
    valid: boolean;
    expiresInMs: number;
    oracleVerified: boolean;
    soapVerified: boolean;
  } | null {
    if (!token) return null;

    const session = this.sessions.get(token);

    if (!session) {
      return { valid: false, expiresInMs: 0, oracleVerified: false, soapVerified: false };
    }

    const elapsed = Date.now() - session.lastActivityAt.getTime();
    const expiresInMs = SESSION_TIMEOUT_MS - elapsed;

    if (expiresInMs <= 0) {
      return { valid: false, expiresInMs: 0, oracleVerified: false, soapVerified: false };
    }

    return {
      valid: true,
      expiresInMs,
      oracleVerified: session.auth.oracle.verified,
      soapVerified: session.auth.soap.verified,
    };
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

export const sessionService = new SessionService();
