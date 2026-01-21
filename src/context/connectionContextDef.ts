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
  disconnectOracle: () => void;

  // SOAP
  soapState: SoapConnectionState;
  soapCredentials: SoapCredentials | null;
  setSoapCredentials: (creds: SoapCredentials) => void;
  connectSoap: (creds?: SoapCredentials) => Promise<boolean>;
  disconnectSoap: () => void;

  // Combined
  disconnectAll: () => void;

  // Utility
  isFullyConnected: boolean;
  hasActiveConnection: boolean;
}

/* ==============================================
   Context Creation
   ============================================== */

export const ConnectionContext = createContext<ConnectionContextType | null>(null);
