/**
 * Connection Context Definition
 *
 * Separated from ConnectionContext.tsx for fast refresh compatibility.
 */

import { createContext } from 'react';
import type {
  OracleCredentials,
  OracleConnectionState,
  SoapCredentials,
  SoapConnectionState,
} from '../types';

/* ==============================================
   Context Type Definition
   ============================================== */

export interface ConnectionContextType {
  // Oracle
  oracleState: OracleConnectionState;
  oracleCredentials: OracleCredentials | null;
  setOracleCredentials: (creds: OracleCredentials) => void;
  connectOracle: (creds?: OracleCredentials) => Promise<boolean>;
  disconnectOracle: () => Promise<void>;

  // SOAP
  soapState: SoapConnectionState;
  soapCredentials: SoapCredentials | null;
  setSoapCredentials: (creds: SoapCredentials) => void;
  connectSoap: (creds?: SoapCredentials) => Promise<boolean>;
  disconnectSoap: () => Promise<void>;

  // Combined
  disconnectAll: () => Promise<void>;

  // Utility
  isFullyConnected: boolean;
  hasActiveConnection: boolean;

  // UI Hints (for cross-component visual feedback)
  oracleHintActive: boolean;
  setOracleHintActive: (active: boolean) => void;
  soapHintActive: boolean;
  setSoapHintActive: (active: boolean) => void;
}

/* ==============================================
   Context Creation
   ============================================== */

export const ConnectionContext = createContext<ConnectionContextType | null>(null);
