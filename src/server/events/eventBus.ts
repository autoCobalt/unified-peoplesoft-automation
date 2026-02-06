/**
 * Event Bus
 *
 * Typed event emitter singleton that decouples services from WebSocket transport.
 * Services emit events here; the WebSocket manager subscribes and routes them.
 *
 * Uses Node's EventEmitter internally but exposes a strongly-typed API
 * so consumers only deal with ServerEvent objects.
 */

import { EventEmitter } from 'events';
import type { ServerEvent, ServerEventType } from './types.js';

/* ==============================================
   Typed Event Bus
   ============================================== */

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    // One listener per WebSocket connection (via onAll) + internal subscribers.
    // 500 handles ~100 users × 5 tabs without triggering Node.js warnings.
    this.emitter.setMaxListeners(500);
  }

  /**
   * Emit a server event.
   * Called by services (workflow, session, etc.) whenever state changes.
   */
  emit(event: ServerEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  /**
   * Subscribe to a specific event type.
   * Returns an unsubscribe function.
   */
  on<T extends ServerEventType>(
    type: T,
    handler: (event: Extract<ServerEvent, { type: T }>) => void,
  ): () => void {
    this.emitter.on(type, handler);
    return () => {
      this.emitter.off(type, handler);
    };
  }

  /**
   * Subscribe to ALL events (wildcard).
   * Used by the WebSocket manager to route every event.
   * Returns an unsubscribe function.
   */
  onAll(handler: (event: ServerEvent) => void): () => void {
    this.emitter.on('*', handler);
    return () => {
      this.emitter.off('*', handler);
    };
  }

  /**
   * Remove all listeners (for graceful shutdown).
   */
  shutdown(): void {
    this.emitter.removeAllListeners();
  }
}

/* ==============================================
   Singleton Export
   ============================================== */

export const eventBus = new EventBus();
