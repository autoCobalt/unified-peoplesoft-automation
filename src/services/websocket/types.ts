/**
 * Client-Side WebSocket Types
 *
 * Mirrors the server-side event types but from the client's perspective.
 * The server strips sessionToken before sending — clients receive ClientMessage.
 */

import type { WorkflowStatus, RawWorkflowProgress } from '../../server/workflows/types';

/* ==============================================
   Message Types (received from server)
   ============================================== */

export interface WorkflowProgressPayload {
  workflowType: 'manager' | 'other';
  status: WorkflowStatus;
  step: string;
  progress: RawWorkflowProgress | null;
  error: string | null;
  results: {
    approvedCount?: number;
    transactionResults?: Record<string, 'approved' | 'error'>;
    pauseReason?: string;
  };
}

export interface AuthChangedPayload {
  verified: boolean;
  username: string | null;
  reason: string;
}

/** All possible message types from the server */
export type ServerMessageType =
  | 'workflow:progress'
  | 'auth:oracle-changed'
  | 'auth:soap-changed'
  | 'session:expired';

/** A message received from the server via WebSocket */
export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
}

/* ==============================================
   Connection State
   ============================================== */

export type WsConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/* ==============================================
   Event Handler Types
   ============================================== */

export type WsEventHandler<T = unknown> = (payload: T) => void;
