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
  useRef,
  type ReactNode,
} from 'react';
import { isDevelopment, oracleConfig } from '../config';
import { setSessionToken, clearSessionToken, checkSessionStatus, hasSessionToken } from '../services/session';
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
      oracleConnect: (username: string) => void | Promise<void>;
      soapConnect: (username: string) => void | Promise<void>;
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
  const oracleConnectingRef = useRef(false);

  // SOAP state
  const [soapState, setSoapState] =
    useState<SoapConnectionState>(initialSoapState);
  const [soapCredentials, setSoapCredentialsState] =
    useState<SoapCredentials | null>(null);
  const soapConnectingRef = useRef(false);

  // UI hint state (for cross-component visual feedback)
  const [oracleHintActive, setOracleHintActive] = useState(false);
  const [soapHintActive, setSoapHintActive] = useState(false);

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
      // Prevent concurrent connection attempts
      if (oracleConnectingRef.current) {
        return false;
      }

      const credentials = creds ?? oracleCredentials;
      if (!credentials) {
        setOracleState((prev) => ({
          ...prev,
          error: 'No credentials provided',
        }));
        return false;
      }

      oracleConnectingRef.current = true;
      setOracleState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      try {
        // Clear any stale session token before attempting new connection
        // Prevents invalid token from persisting if reconnection fails
        clearSessionToken();

        // Dynamically import to avoid bundling server code in frontend
        const { oracleApi } = await import('../services/oracle/oracleApi');

        // Build connection string from config
        const connectionString = `${oracleConfig.hostname}:${oracleConfig.port}/${oracleConfig.serviceName}`;

        const result = await oracleApi.connection.connect({
          connectionString,
          username: credentials.username,
          password: credentials.password,
        });

        if (result.success) {
          setOracleState({
            isConnected: true,
            isConnecting: false,
            error: null,
          });
          setOracleCredentialsState(credentials);
          return true;
        } else {
          setOracleState({
            isConnected: false,
            isConnecting: false,
            error: result.error.message,
          });
          return false;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Oracle connection failed';
        setOracleState({
          isConnected: false,
          isConnecting: false,
          error: message,
        });
        return false;
      } finally {
        oracleConnectingRef.current = false;
      }
    },
    [oracleCredentials]
  );

  const disconnectOracle = useCallback(async () => {
    try {
      const { oracleApi } = await import('../services/oracle/oracleApi');
      await oracleApi.connection.disconnect();
    } catch (e) {
      console.warn('[Oracle] Disconnect API call failed:', e);
    }
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
      // Prevent concurrent connection attempts
      if (soapConnectingRef.current) {
        return false;
      }

      const credentials = creds ?? soapCredentials;
      if (!credentials) {
        setSoapState((prev) => ({
          ...prev,
          error: 'No credentials provided',
        }));
        return false;
      }

      soapConnectingRef.current = true;
      setSoapState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      try {
        // Clear any stale session token before attempting new connection
        // Prevents invalid token from persisting if reconnection fails
        clearSessionToken();

        // Dynamically import to avoid bundling server code in frontend
        const { soapApi } = await import('../services/soap/soapApi');

        const result = await soapApi.connection.connect({
          username: credentials.username,
          password: credentials.password,
        });

        if (result.success) {
          setSoapState({
            isConnected: true,
            isConnecting: false,
            error: null,
          });
          setSoapCredentialsState(credentials);
          return true;
        } else {
          setSoapState({
            isConnected: false,
            isConnecting: false,
            error: result.error.message,
          });
          return false;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'SOAP connection failed';
        setSoapState({
          isConnected: false,
          isConnecting: false,
          error: message,
        });
        return false;
      } finally {
        soapConnectingRef.current = false;
      }
    },
    [soapCredentials]
  );

  const disconnectSoap = useCallback(async () => {
    try {
      const { soapApi } = await import('../services/soap/soapApi');
      await soapApi.connection.disconnect();
    } catch (e) {
      console.warn('[SOAP] Disconnect API call failed:', e);
    }
    setSoapState(initialSoapState);
    setSoapCredentialsState(null);
  }, []);

  /* ============================================
     Combined Actions
     ============================================ */

  const disconnectAll = useCallback(async () => {
    await Promise.all([disconnectOracle(), disconnectSoap()]);
  }, [disconnectOracle, disconnectSoap]);

  /* ============================================
     Dev Simulation Helpers (DEVELOPMENT MODE ONLY)

     These helpers are created when VITE_APP_MODE is
     set to 'development'. They allow quick testing
     of connection states without real credentials.
     ============================================ */

  useEffect(() => {
    // Only create dev helpers when app mode is development
    if (!isDevelopment) {
      return;
    }

    // Define simulation functions only in DEV mode
    // These now call the dev session endpoint to create a real session token
    const simulateOracleConnect = async (username: string) => {
      try {
        // Call the dev-only session endpoint
        const response = await fetch('/api/dev/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, authSource: 'oracle' }),
        });
        const result = await response.json() as {
          success: boolean;
          data?: { sessionToken: string };
        };

        if (result.success && result.data?.sessionToken) {
          // Store the session token for authenticated requests
          setSessionToken(result.data.sessionToken);
        }

        // Update UI state
        setOracleCredentialsState({ username, password: '********' });
        setOracleState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        console.log(`🔌 [Dev] Oracle connected as: ${username} (session created)`);
      } catch (error) {
        console.error('[Dev] Failed to create dev session:', error);
        setOracleState({
          isConnected: false,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Dev session creation failed',
        });
      }
    };

    const simulateSoapConnect = async (username: string) => {
      try {
        // Call the dev-only session endpoint
        const response = await fetch('/api/dev/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, authSource: 'soap' }),
        });
        const result = await response.json() as {
          success: boolean;
          data?: { sessionToken: string };
        };

        if (result.success && result.data?.sessionToken) {
          // Store the session token for authenticated requests
          setSessionToken(result.data.sessionToken);
        }

        // Update UI state
        setSoapCredentialsState({ username, password: '********' });
        setSoapState({
          isConnected: true,
          isConnecting: false,
          error: null,
        });
        console.log(`🔌 [Dev] SOAP connected as: ${username} (session created)`);
      } catch (error) {
        console.error('[Dev] Failed to create dev session:', error);
        setSoapState({
          isConnected: false,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Dev session creation failed',
        });
      }
    };

    // Expose on window (wrap async functions to match void return type)
    window.devSimulate = {
      oracleConnect: simulateOracleConnect,
      soapConnect: simulateSoapConnect,
      disconnectAll: () => void disconnectAll(),
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
     Session Expiration Monitoring

     Polls the server periodically to detect session expiration.
     When session expires, resets connection UI to show disconnected state.
     ============================================ */

  /**
   * Handle session expiration - reset connection states
   *
   * This is called when we detect the session has expired server-side.
   * We need to update the UI to show disconnected without calling the
   * disconnect endpoints (which would fail with 401 anyway).
   */
  const handleSessionExpired = useCallback(() => {
    // Only reset if we think we're connected
    if (!oracleState.isConnected && !soapState.isConnected) {
      return;
    }

    console.log('🔒 [Session] Session expired - resetting connection state');

    // Clear client-side token
    clearSessionToken();

    // Reset connection states (without calling server - session is already gone)
    setOracleState(initialOracleState);
    setOracleCredentialsState(null);
    setSoapState(initialSoapState);
    setSoapCredentialsState(null);
  }, [oracleState.isConnected, soapState.isConnected]);

  useEffect(() => {
    // Only monitor when we have an active connection AND a session token
    // This check ensures:
    // 1. Polling only starts when user has connected
    // 2. Polling stops when session expires (connection states reset to false)
    const isConnected = oracleState.isConnected || soapState.isConnected;
    if (!isConnected || !hasSessionToken()) {
      return;
    }

    // Poll interval: Check every 2 minutes
    // Server session timeout is 30 minutes, so this gives us plenty of warning
    const POLL_INTERVAL_MS = 2 * 60 * 1000;

    /**
     * Check session status and handle expiration
     */
    const checkSession = async () => {
      const status = await checkSessionStatus();

      // null/undefined means network error - don't clear session, might be temporary
      if (!status) {
        return;
      }

      // Session expired or invalid
      if (!status.valid) {
        handleSessionExpired();
      }
    };

    // Initial check (delayed slightly to avoid race with connection setup)
    const initialCheckTimeout = setTimeout(() => {
      void checkSession();
    }, 1000);

    // Periodic polling
    const pollInterval = setInterval(() => {
      void checkSession();
    }, POLL_INTERVAL_MS);

    /**
     * Handle visibility change - check session when user returns to tab
     *
     * This catches the case where user leaves tab open, session expires,
     * and they return later. Better UX than waiting for next poll.
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasSessionToken()) {
        void checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup - runs when:
    // 1. Component unmounts
    // 2. Connection states change (including when session expires and states reset)
    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [oracleState.isConnected, soapState.isConnected, handleSessionExpired]);

  /* ============================================
     Derived State
     ============================================ */

  const isFullyConnected = oracleState.isConnected && soapState.isConnected;
  const hasActiveConnection = oracleState.isConnected || soapState.isConnected;

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
    hasActiveConnection,

    // UI Hints
    oracleHintActive,
    setOracleHintActive,
    soapHintActive,
    setSoapHintActive,
  };

  return (
    <ConnectionContext value={value}>
      {children}
    </ConnectionContext>
  );
}

