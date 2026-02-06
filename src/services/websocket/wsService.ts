/**
 * Client-Side WebSocket Service
 *
 * Singleton that manages the WebSocket connection to the Fastify server.
 * Provides a typed event subscription API for Zustand stores.
 *
 * Features:
 * - Auto-connect with session token
 * - Exponential backoff reconnection (1s → 2s → 4s → ... → 60s cap)
 * - Tab visibility reconnect (immediate reconnect when tab becomes visible)
 * - Graceful degradation (fires 'fallback' event after MAX_RECONNECT_ATTEMPTS)
 * - Zero npm dependencies — native browser WebSocket API only
 *
 * Usage from Zustand stores:
 *   wsService.on('workflow:progress', (payload) => { ... });
 *   wsService.connect(token);
 */

import type {
  ServerMessage,
  ServerMessageType,
  WsConnectionState,
  WsEventHandler,
} from './types';

/* ==============================================
   Configuration
   ============================================== */

const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

/* ==============================================
   WebSocket Service
   ============================================== */

class WsService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private state: WsConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  /** Event handlers indexed by message type (supports multiple handlers per type) */
  private handlers = new Map<string, Set<WsEventHandler>>();

  /** State change listeners */
  private stateListeners = new Set<(state: WsConnectionState) => void>();

  /** Whether we've fallen back to polling mode */
  private _isFallback = false;

  /** Visibility change handler reference (for cleanup) */
  private visibilityHandler: (() => void) | null = null;

  /* ==============================================
     Public API
     ============================================== */

  /**
   * Connect to the WebSocket server.
   * If already connected with the same token, no-ops.
   */
  connect(token: string): void {
    if (this.ws && this.token === token && this.state === 'connected') {
      return;
    }

    this.token = token;
    this._isFallback = false;
    this.reconnectAttempts = 0;
    this.intentionalClose = false;
    this.doConnect();
    this.setupVisibilityHandler();
  }

  /**
   * Intentionally disconnect (e.g., on logout).
   * Will NOT attempt reconnection.
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this.token = null;
    this.setState('disconnected');
  }

  /**
   * Subscribe to a specific event type.
   * Returns an unsubscribe function.
   */
  on<T = unknown>(type: ServerMessageType | 'state-change' | 'fallback', handler: WsEventHandler<T>): () => void {
    if (type === 'state-change') {
      const listener = handler as unknown as (state: WsConnectionState) => void;
      this.stateListeners.add(listener);
      return () => { this.stateListeners.delete(listener); };
    }

    let handlers = this.handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(type, handlers);
    }
    const typedHandler = handler as WsEventHandler;
    handlers.add(typedHandler);

    return () => {
      handlers.delete(typedHandler);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  /** Current connection state */
  get connectionState(): WsConnectionState {
    return this.state;
  }

  /** Whether we've given up on WebSocket and fallen back to polling */
  get isFallback(): boolean {
    return this._isFallback;
  }

  /* ==============================================
     Connection Management
     ============================================== */

  private doConnect(): void {
    if (!this.token) return;

    this.cleanup(false);
    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    // Build WebSocket URL relative to current page (Vite proxies /ws → Fastify)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(this.token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.handleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._isFallback = false;
      this.setState('connected');
      console.log('[WS] Connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as ServerMessage;
        this.dispatch(message);
      } catch {
        console.warn('[WS] Failed to parse message:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WS] Closed (code: ${String(event.code)}, reason: ${event.reason})`);
      this.ws = null;

      if (this.intentionalClose) {
        this.setState('disconnected');
        return;
      }

      // 4001 = invalid token, 4002 = session expired — don't reconnect
      if (event.code === 4001 || event.code === 4002) {
        this.setState('disconnected');
        if (event.code === 4002) {
          this.dispatch({ type: 'session:expired', payload: {} });
        }
        return;
      }

      this.handleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, which triggers reconnect
      console.warn('[WS] Connection error');
    };
  }

  /* ==============================================
     Reconnection
     ============================================== */

  private handleReconnect(): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      console.log(`[WS] Max reconnect attempts (${String(MAX_RECONNECT_ATTEMPTS)}) reached — falling back to polling`);
      this._isFallback = true;
      this.setState('disconnected');
      // Notify stores to fall back to polling
      const fallbackHandlers = this.handlers.get('fallback');
      if (fallbackHandlers) {
        for (const handler of fallbackHandlers) {
          handler(undefined);
        }
      }
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS,
    );
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = baseDelay + jitter;

    console.log(`[WS] Reconnecting in ${String(Math.round(delay))}ms (attempt ${String(this.reconnectAttempts)}/${String(MAX_RECONNECT_ATTEMPTS)})`);
    this.setState('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, delay);
  }

  /* ==============================================
     Tab Visibility
     ============================================== */

  private setupVisibilityHandler(): void {
    if (this.visibilityHandler) return;

    this.visibilityHandler = () => {
      if (
        document.visibilityState === 'visible' &&
        this.token &&
        this.state !== 'connected' &&
        this.state !== 'connecting' &&
        !this.intentionalClose &&
        !this._isFallback
      ) {
        console.log('[WS] Tab visible — reconnecting');
        this.reconnectAttempts = 0;
        this.doConnect();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /* ==============================================
     Event Dispatch
     ============================================== */

  private dispatch(message: ServerMessage): void {
    const handlers = this.handlers.get(message.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(message.payload);
      } catch (error) {
        console.error(`[WS] Handler error for ${message.type}:`, error);
      }
    }
  }

  /* ==============================================
     State Management
     ============================================== */

  private setState(state: WsConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  /* ==============================================
     Cleanup
     ============================================== */

  private cleanup(removeVisibility = true): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Remove handlers before closing to prevent triggering reconnect
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    if (removeVisibility && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

export const wsService = new WsService();
