/**
 * useConnection Hook
 *
 * Provides access to the ConnectionContext for managing
 * Oracle and SOAP connection state.
 */

import { use } from 'react';
import { ConnectionContext, type ConnectionContextType } from './connectionContextDef';

export function useConnection(): ConnectionContextType {
  const context = use(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
