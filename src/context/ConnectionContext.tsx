/**
 * Connection Context Provider
 *
 * Manages Oracle and SOAP connection state shared across all features.
 * Each feature (SmartForm, EDW Transfers, etc.) consumes this context
 * to access database and API connections.
 *
 * Responsibilities (and ONLY these):
 * - Oracle credentials and connection state
 * - SOAP credentials and connection state
 * - Connect/disconnect actions
 * - Dev simulation helpers (development mode only)
 *
 * Note: Context definition is in connectionContextDef.ts for fast refresh compatibility.
 */

import {
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  OracleCredentials,
  OracleConnectionState,
  SoapCredentials,
  SoapConnectionState,
} from '../types';
import { ConnectionContext, type ConnectionContextType } from './connectionContextDef';

/* ==============================================
   Window Type Extension (Dev Helpers)
   ============================================== */

declare global {
  interface Window {
    devSimulate?: {
      oracleConnect: (username: string) => void;
      soapConnect: (username: string) => void;
      disconnectAll: () => void;
    };
  }
}

/* ==============================================
   Initial States
   ============================================== */

const initialOracleState: OracleConnectionState = {
  isConnected: false,
  isConnecting: false,
  error: null,
};

const initialSoapState: SoapConnectionState = {
  isConnected: false,
  isConnecting: false,
  error: null,
};

/* ==============================================
   Provider Component
   ============================================== */

interface ConnectionProviderProps {
  children: ReactNode;
}

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  // Oracle state
  const [oracleState, setOracleState] =
    useState<OracleConnectionState>(initialOracleState);
  const [oracleCredentials, setOracleCredentialsState] =
    useState<OracleCredentials | null>(null);

  // SOAP state
  const [soapState, setSoapState] =
    useState<SoapConnectionState>(initialSoapState);
  const [soapCredentials, setSoapCredentialsState] =
    useState<SoapCredentials | null>(null);

  /* ============================================
     Oracle Actions
     ============================================ */

  const setOracleCredentials = useCallback((creds: OracleCredentials) => {
    setOracleCredentialsState(creds);
    // Clear any previous error when credentials change
    setOracleState((prev) => ({ ...prev, error: null }));
  }, []);

  const connectOracle = useCallback(
    async (creds?: OracleCredentials): Promise<boolean> => {
      const credentials = creds ?? oracleCredentials;
      if (!credentials) {
        setOracleState((prev) => ({
          ...prev,
          error: 'No credentials provided',
        }));
        return false;
      }

      setOracleState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      try {
        // TODO: Replace with actual API call to test Oracle connection
        // const result = await api.testOracleConnection(credentials);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay

        // Simulated success for now
        setOracleState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        setOracleCredentialsState(credentials);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Oracle connection failed';
        setOracleState({
          isConnected: false,
          isConnecting: false,
          error: message,
        });
        return false;
      }
    },
    [oracleCredentials]
  );

  const disconnectOracle = useCallback(() => {
    setOracleState(initialOracleState);
    setOracleCredentialsState(null);
  }, []);

  /* ============================================
     SOAP Actions
     ============================================ */

  const setSoapCredentials = useCallback((creds: SoapCredentials) => {
    setSoapCredentialsState(creds);
    setSoapState((prev) => ({ ...prev, error: null }));
  }, []);

  const connectSoap = useCallback(
    async (creds?: SoapCredentials): Promise<boolean> => {
      const credentials = creds ?? soapCredentials;
      if (!credentials) {
        setSoapState((prev) => ({
          ...prev,
          error: 'No credentials provided',
        }));
        return false;
      }

      setSoapState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      try {
        // TODO: Replace with actual API call to test SOAP connection
        // const result = await api.testSoapConnection(credentials);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay

        // Simulated success for now
        setSoapState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        setSoapCredentialsState(credentials);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'SOAP connection failed';
        setSoapState({
          isConnected: false,
          isConnecting: false,
          error: message,
        });
        return false;
      }
    },
    [soapCredentials]
  );

  const disconnectSoap = useCallback(() => {
    setSoapState(initialSoapState);
    setSoapCredentialsState(null);
  }, []);

  /* ============================================
     Combined Actions
     ============================================ */

  const disconnectAll = useCallback(() => {
    disconnectOracle();
    disconnectSoap();
  }, [disconnectOracle, disconnectSoap]);

  /* ============================================
     Dev Simulation Helpers (DEV MODE ONLY)

     These helpers are ONLY created and exposed in
     development mode. In production builds, this
     entire block is eliminated by the bundler.
     ============================================ */

  useEffect(() => {
    // Early return in production - no dev helpers exist
    if (!import.meta.env.DEV) {
      return;
    }

    // Define simulation functions only in DEV mode
    const simulateOracleConnect = (username: string) => {
      setOracleCredentialsState({ username, password: '********' });
      setOracleState({
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      console.log(`🔌 [Dev] Oracle connected as: ${username}`);
    };

    const simulateSoapConnect = (username: string) => {
      setSoapCredentialsState({ username, password: '********' });
      setSoapState({
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      console.log(`🔌 [Dev] SOAP connected as: ${username}`);
    };

    // Expose on window
    window.devSimulate = {
      oracleConnect: simulateOracleConnect,
      soapConnect: simulateSoapConnect,
      disconnectAll,
    };

    console.log(
      '🔧 Dev helpers available:\n' +
        '   window.devSimulate.oracleConnect("username")\n' +
        '   window.devSimulate.soapConnect("username")\n' +
        '   window.devSimulate.disconnectAll()'
    );

    // Cleanup on unmount
    return () => {
      delete window.devSimulate;
    };
  }, [disconnectAll]);

  /* ============================================
     Derived State
     ============================================ */

  const isFullyConnected = oracleState.isConnected && soapState.isConnected;

  /* ============================================
     Context Value
     ============================================ */

  const value: ConnectionContextType = {
    // Oracle
    oracleState,
    oracleCredentials,
    setOracleCredentials,
    connectOracle,
    disconnectOracle,

    // SOAP
    soapState,
    soapCredentials,
    setSoapCredentials,
    connectSoap,
    disconnectSoap,

    // Combined
    disconnectAll,

    // Utility
    isFullyConnected,
  };

  return (
    <ConnectionContext value={value}>
      {children}
    </ConnectionContext>
  );
}

