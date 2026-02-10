/**
 * Server Event Types
 *
 * Discriminated union of all events the server can emit.
 * Services emit these events via the event bus without knowing about WebSocket transport.
 * The WebSocket manager subscribes to the bus and routes events to the correct client(s).
 *
 * All events carry a sessionToken so the WebSocket manager can route them
 * to the correct client connection(s).
 */

import type { RawWorkflowProgress, WorkflowStatus } from '../workflows/types.js';

/* ==============================================
   Event Payloads
   ============================================== */

export interface WorkflowProgressPayload {
  workflowType: 'manager' | 'other';
  status: WorkflowStatus;
  step: string;
  progress: RawWorkflowProgress | null;
  error: string | null;
  results: {
    approvedCount?: number;
    skippedCount?: number;
    transactionResults?: Record<string, 'approved' | 'skipped' | 'error'>;
    pauseReason?: string;
  };
}

export interface AuthChangedPayload {
  verified: boolean;
  username: string | null;
  reason: string;
}

/* ==============================================
   Server Event Discriminated Union
   ============================================== */

export type ServerEvent =
  | {
      type: 'workflow:progress';
      sessionToken: string;
      payload: WorkflowProgressPayload;
    }
  | {
      type: 'auth:oracle-changed';
      sessionToken: string;
      payload: AuthChangedPayload;
    }
  | {
      type: 'auth:soap-changed';
      sessionToken: string;
      payload: AuthChangedPayload;
    }
  | {
      type: 'session:expired';
      sessionToken: string;
      payload: Record<string, never>;
    };

/* ==============================================
   Event Type Helpers
   ============================================== */

/** All possible event type strings */
export type ServerEventType = ServerEvent['type'];

/** Extract the payload type for a given event type */
export type EventPayload<T extends ServerEventType> = Extract<ServerEvent, { type: T }>['payload'];

/**
 * Client-bound message format (sent over WebSocket).
 * Strips sessionToken — client doesn't need it.
 */
export interface ClientMessage {
  type: ServerEventType;
  payload: ServerEvent['payload'];
}
