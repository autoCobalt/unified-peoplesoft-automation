/**
 * WebSocket Connection Manager
 *
 * Tracks active WebSocket connections indexed by session token.
 * Subscribes to the event bus and routes events to the correct client(s).
 *
 * Architecture:
 * - Each browser tab opens one WebSocket connection (one session token per tab)
 * - Multiple tabs = multiple connections, possibly same token if shared
 * - Events are routed by sessionToken field in the ServerEvent
 *
 * Heartbeat:
 * - Server pings every 30s
 * - Client must respond with pong within 10s
 * - Unresponsive connections are terminated
 */

import type { WebSocket } from 'ws';
import { eventBus } from '../events/index.js';
import type { ServerEvent, ClientMessage } from '../events/index.js';
import { logInfo, logDebug } from '../utils/index.js';

/* ==============================================
   Configuration
   ============================================== */

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;

/* ==============================================
   Connection Metadata
   ============================================== */

interface ConnectionMeta {
  ws: WebSocket;
  token: string;
  /** Heartbeat ping timer */
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  /** Pong response timeout */
  pongTimeout: ReturnType<typeof setTimeout> | null;
  /** Whether the client has responded to the last ping */
  alive: boolean;
}

/* ==============================================
   WebSocket Manager
   ============================================== */

class WebSocketManager {
  /** Connections indexed by session token (one token can have multiple connections) */
  private connections = new Map<string, Set<ConnectionMeta>>();

  /** Event bus subscription cleanup */
  private unsubscribeEventBus: (() => void) | null = null;

  constructor() {
    this.startListening();
  }

  /* ==============================================
     Connection Lifecycle
     ============================================== */

  /**
   * Register a new WebSocket client.
   * Starts heartbeat monitoring for the connection.
   */
  addClient(token: string, ws: WebSocket): void {
    const meta: ConnectionMeta = {
      ws,
      token,
      heartbeatTimer: null,
      pongTimeout: null,
      alive: true,
    };

    // Add to connections map
    let tokenSet = this.connections.get(token);
    if (!tokenSet) {
      tokenSet = new Set();
      this.connections.set(token, tokenSet);
    }
    tokenSet.add(meta);

    // Start heartbeat
    this.startHeartbeat(meta);

    // Handle pong responses
    ws.on('pong', () => {
      meta.alive = true;
      if (meta.pongTimeout) {
        clearTimeout(meta.pongTimeout);
        meta.pongTimeout = null;
      }
    });

    // Handle close
    ws.on('close', () => {
      this.removeConnection(meta);
    });

    logDebug('WebSocket', `Client connected (token: ...${token.slice(-8)}, total: ${String(this.totalConnections())})`);
  }

  /**
   * Remove a specific connection (on close or heartbeat timeout).
   */
  private removeConnection(meta: ConnectionMeta): void {
    // Clear pong timeout FIRST — prevents a last-tick interval from
    // setting a new timeout between the two cleanup steps.
    if (meta.pongTimeout) {
      clearTimeout(meta.pongTimeout);
      meta.pongTimeout = null;
    }
    // Then stop the heartbeat interval
    if (meta.heartbeatTimer) {
      clearInterval(meta.heartbeatTimer);
      meta.heartbeatTimer = null;
    }

    // Remove from connections map
    const tokenSet = this.connections.get(meta.token);
    if (tokenSet) {
      tokenSet.delete(meta);
      if (tokenSet.size === 0) {
        this.connections.delete(meta.token);
      }
    }

    logDebug('WebSocket', `Client disconnected (token: ...${meta.token.slice(-8)}, total: ${String(this.totalConnections())})`);
  }

  /**
   * Remove ALL connections for a session token (e.g., on session expiry).
   */
  removeAllForToken(token: string): void {
    const tokenSet = this.connections.get(token);
    if (!tokenSet) return;

    for (const meta of tokenSet) {
      if (meta.heartbeatTimer) clearInterval(meta.heartbeatTimer);
      if (meta.pongTimeout) clearTimeout(meta.pongTimeout);

      // Close with 4002 = session expired
      if (meta.ws.readyState === meta.ws.OPEN) {
        meta.ws.close(4002, 'Session expired');
      }
    }

    this.connections.delete(token);
  }

  /* ==============================================
     Heartbeat
     ============================================== */

  private startHeartbeat(meta: ConnectionMeta): void {
    meta.heartbeatTimer = setInterval(() => {
      if (!meta.alive) {
        // Client didn't respond to last ping — terminate
        logDebug('WebSocket', `Heartbeat timeout (token: ...${meta.token.slice(-8)})`);
        meta.ws.terminate();
        this.removeConnection(meta);
        return;
      }

      meta.alive = false;
      meta.ws.ping();

      // Set pong timeout
      meta.pongTimeout = setTimeout(() => {
        if (!meta.alive) {
          logDebug('WebSocket', `Pong timeout (token: ...${meta.token.slice(-8)})`);
          meta.ws.terminate();
          this.removeConnection(meta);
        }
      }, HEARTBEAT_TIMEOUT_MS);
    }, HEARTBEAT_INTERVAL_MS);
  }

  /* ==============================================
     Event Routing
     ============================================== */

  /**
   * Subscribe to the event bus and route events to WebSocket clients.
   */
  private startListening(): void {
    this.unsubscribeEventBus = eventBus.onAll((event: ServerEvent) => {
      this.sendToSession(event.sessionToken, event);
    });
  }

  /**
   * Send an event to all connections for a given session token.
   */
  sendToSession(token: string, event: ServerEvent): void {
    const tokenSet = this.connections.get(token);
    if (!tokenSet || tokenSet.size === 0) return;

    // Strip sessionToken before sending to client
    const message: ClientMessage = {
      type: event.type,
      payload: event.payload,
    };

    const data = JSON.stringify(message);

    for (const meta of tokenSet) {
      if (meta.ws.readyState === meta.ws.OPEN) {
        meta.ws.send(data);
      }
    }
  }

  /* ==============================================
     Status
     ============================================== */

  totalConnections(): number {
    let count = 0;
    for (const set of this.connections.values()) {
      count += set.size;
    }
    return count;
  }

  totalSessions(): number {
    return this.connections.size;
  }

  /* ==============================================
     Shutdown
     ============================================== */

  shutdown(): void {
    if (this.unsubscribeEventBus) {
      this.unsubscribeEventBus();
      this.unsubscribeEventBus = null;
    }

    // Close all connections
    for (const [, tokenSet] of this.connections) {
      for (const meta of tokenSet) {
        if (meta.heartbeatTimer) clearInterval(meta.heartbeatTimer);
        if (meta.pongTimeout) clearTimeout(meta.pongTimeout);
        if (meta.ws.readyState === meta.ws.OPEN) {
          meta.ws.close(1001, 'Server shutting down');
        }
      }
    }

    this.connections.clear();
    logInfo('WebSocket', 'Manager shut down');
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

export const wsManager = new WebSocketManager();
