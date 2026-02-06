/**
 * Connection Store (Zustand)
 *
 * Manages Oracle and SOAP connection state shared across all features.
 * Replaces ConnectionContext + ConnectionProvider + useConnection.
 *
 * Key improvements over Context:
 * - No useRef needed for concurrent-connect guards (get() reads fresh state)
 * - Session polling is module-level (no useEffect lifecycle)
 * - Dev simulation helpers are set once at module init
 * - Selective subscriptions prevent unnecessary re-renders
 */

import { create } from 'zustand';
import { isDevelopment, oracleConfig } from '../config';
import {
  setSessionToken,
  clearSessionToken,
  getSessionToken,
  checkSessionStatus,
  hasSessionToken,
} from '../services/session/sessionStore';
import { wsService } from '../services/websocket';
import type { AuthChangedPayload } from '../services/websocket';
import type {
  OracleCredentials,
  OracleConnectionState,
  SoapCredentials,
  SoapConnectionState,
} from '../types';

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
   Store Type
   ============================================== */

interface ConnectionState {
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

  // Derived (computed on read via selectors, but stored for simplicity)
  isFullyConnected: boolean;
  hasActiveConnection: boolean;

  // UI Hints (for cross-component visual feedback)
  oracleHintActive: boolean;
  setOracleHintActive: (active: boolean) => void;
  soapHintActive: boolean;
  setSoapHintActive: (active: boolean) => void;

  // Internal: session expiration handler
  handleSessionExpired: () => void;
}

/* ==============================================
   Helper: Update derived flags
   ============================================== */

function derivedFlags(oracle: OracleConnectionState, soap: SoapConnectionState) {
  return {
    isFullyConnected: oracle.isConnected && soap.isConnected,
    hasActiveConnection: oracle.isConnected || soap.isConnected,
  };
}

/* ==============================================
   Store Definition
   ============================================== */

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // Oracle
  oracleState: initialOracleState,
  oracleCredentials: null,

  setOracleCredentials: (creds: OracleCredentials) => {
    set({
      oracleCredentials: creds,
      oracleState: { ...get().oracleState, error: null },
    });
  },

  connectOracle: async (creds?: OracleCredentials): Promise<boolean> => {
    // Prevent concurrent connection attempts — reads fresh state via get()
    if (get().oracleState.isConnecting) {
      return false;
    }

    const credentials = creds ?? get().oracleCredentials;
    if (!credentials) {
      set({
        oracleState: { ...get().oracleState, error: 'No credentials provided' },
      });
      return false;
    }

    set({
      oracleState: { ...get().oracleState, isConnecting: true, error: null },
    });

    try {
      // Clear any stale session token before attempting new connection
      clearSessionToken();

      if (isDevelopment) {
        // Dev mode: bypass real Oracle, create a simulated session
        const response = await fetch('/api/dev/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: credentials.username, authSource: 'oracle' }),
        });
        const devResult = await response.json() as {
          success: boolean;
          data?: { sessionToken: string };
        };
        if (devResult.success && devResult.data?.sessionToken) {
          setSessionToken(devResult.data.sessionToken);
        }
        const newOracleState: OracleConnectionState = {
          isConnected: true,
          isConnecting: false,
          error: null,
        };
        set({
          oracleState: newOracleState,
          oracleCredentials: credentials,
          ...derivedFlags(newOracleState, get().soapState),
        });
        const token = getSessionToken();
        if (token) {
          wsService.connect(token);
        }
        return true;
      }

      // Production: real Oracle connection
      const { oracleApi } = await import('../services/oracle/oracleApi');
      const connectionString = `${oracleConfig.hostname}:${oracleConfig.port}/${oracleConfig.serviceName}`;

      const result = await oracleApi.connection.connect({
        connectionString,
        username: credentials.username,
        password: credentials.password,
      });

      if (result.success) {
        const newOracleState: OracleConnectionState = {
          isConnected: true,
          isConnecting: false,
          error: null,
        };
        set({
          oracleState: newOracleState,
          oracleCredentials: credentials,
          ...derivedFlags(newOracleState, get().soapState),
        });

        // Establish WebSocket connection (token was set by oracleApi.connect)
        const token = getSessionToken();
        if (token) {
          wsService.connect(token);
        }

        return true;
      } else {
        set({
          oracleState: {
            isConnected: false,
            isConnecting: false,
            error: result.error.message,
          },
        });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Oracle connection failed';
      set({
        oracleState: {
          isConnected: false,
          isConnecting: false,
          error: message,
        },
      });
      return false;
    }
  },

  disconnectOracle: async () => {
    if (!isDevelopment) {
      try {
        const { oracleApi } = await import('../services/oracle/oracleApi');
        await oracleApi.connection.disconnect();
      } catch (e) {
        console.warn('[Oracle] Disconnect API call failed:', e);
      }
    }
    set({
      oracleState: initialOracleState,
      oracleCredentials: null,
      ...derivedFlags(initialOracleState, get().soapState),
    });
  },

  // SOAP
  soapState: initialSoapState,
  soapCredentials: null,

  setSoapCredentials: (creds: SoapCredentials) => {
    set({
      soapCredentials: creds,
      soapState: { ...get().soapState, error: null },
    });
  },

  connectSoap: async (creds?: SoapCredentials): Promise<boolean> => {
    if (get().soapState.isConnecting) {
      return false;
    }

    const credentials = creds ?? get().soapCredentials;
    if (!credentials) {
      set({
        soapState: { ...get().soapState, error: 'No credentials provided' },
      });
      return false;
    }

    set({
      soapState: { ...get().soapState, isConnecting: true, error: null },
    });

    try {
      clearSessionToken();

      if (isDevelopment) {
        // Dev mode: bypass real SOAP, create a simulated session
        const response = await fetch('/api/dev/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: credentials.username, authSource: 'soap' }),
        });
        const devResult = await response.json() as {
          success: boolean;
          data?: { sessionToken: string };
        };
        if (devResult.success && devResult.data?.sessionToken) {
          setSessionToken(devResult.data.sessionToken);
        }
        const newSoapState: SoapConnectionState = {
          isConnected: true,
          isConnecting: false,
          error: null,
        };
        set({
          soapState: newSoapState,
          soapCredentials: credentials,
          ...derivedFlags(get().oracleState, newSoapState),
        });
        const token = getSessionToken();
        if (token) {
          wsService.connect(token);
        }
        return true;
      }

      // Production: real SOAP connection
      const { soapApi } = await import('../services/soap/soapApi');
      const result = await soapApi.connection.connect({
        username: credentials.username,
        password: credentials.password,
      });

      if (result.success) {
        const newSoapState: SoapConnectionState = {
          isConnected: true,
          isConnecting: false,
          error: null,
        };
        set({
          soapState: newSoapState,
          soapCredentials: credentials,
          ...derivedFlags(get().oracleState, newSoapState),
        });

        // Establish WebSocket connection (token was set by soapApi.connect)
        const token = getSessionToken();
        if (token) {
          wsService.connect(token);
        }

        return true;
      } else {
        set({
          soapState: {
            isConnected: false,
            isConnecting: false,
            error: result.error.message,
          },
        });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SOAP connection failed';
      set({
        soapState: {
          isConnected: false,
          isConnecting: false,
          error: message,
        },
      });
      return false;
    }
  },

  disconnectSoap: async () => {
    if (!isDevelopment) {
      try {
        const { soapApi } = await import('../services/soap/soapApi');
        await soapApi.connection.disconnect();
      } catch (e) {
        console.warn('[SOAP] Disconnect API call failed:', e);
      }
    }
    set({
      soapState: initialSoapState,
      soapCredentials: null,
      ...derivedFlags(get().oracleState, initialSoapState),
    });
  },

  // Combined
  disconnectAll: async () => {
    // Call both disconnect functions
    const state = get();
    await Promise.all([state.disconnectOracle(), state.disconnectSoap()]);
  },

  // Derived
  isFullyConnected: false,
  hasActiveConnection: false,

  // UI Hints
  oracleHintActive: false,
  setOracleHintActive: (active: boolean) => { set({ oracleHintActive: active }); },
  soapHintActive: false,
  setSoapHintActive: (active: boolean) => { set({ soapHintActive: active }); },

  // Session expiration handler
  handleSessionExpired: () => {
    const { oracleState, soapState } = get();

    // Only reset if we think we're connected
    if (!oracleState.isConnected && !soapState.isConnected) {
      return;
    }

    console.log('\u{1f512} [Session] Session expired - resetting connection state');

    wsService.disconnect();
    clearSessionToken();

    set({
      oracleState: initialOracleState,
      oracleCredentials: null,
      soapState: initialSoapState,
      soapCredentials: null,
      isFullyConnected: false,
      hasActiveConnection: false,
    });
  },
}));

/* ==============================================
   Session Expiration Monitoring (Module-Level)

   Polls the server periodically to detect session expiration.
   Starts/stops automatically based on connection state changes.
   ============================================== */

let pollInterval: ReturnType<typeof setInterval> | null = null;
let initialCheckTimeout: ReturnType<typeof setTimeout> | null = null;
let visibilityHandler: (() => void) | null = null;

function startSessionPolling() {
  // Already polling
  if (pollInterval) return;

  const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

  const checkSession = async () => {
    const status = await checkSessionStatus();
    if (!status) return; // Network error — don't clear
    if (!status.valid) {
      useConnectionStore.getState().handleSessionExpired();
    }
  };

  // Initial check (delayed to avoid race with connection setup)
  initialCheckTimeout = setTimeout(() => {
    void checkSession();
  }, 1000);

  // Periodic polling
  pollInterval = setInterval(() => {
    void checkSession();
  }, POLL_INTERVAL_MS);

  // Visibility change — check when tab becomes visible
  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && hasSessionToken()) {
      void checkSession();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

function stopSessionPolling() {
  if (initialCheckTimeout) {
    clearTimeout(initialCheckTimeout);
    initialCheckTimeout = null;
  }
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}

// Subscribe to connection state changes to start/stop polling
useConnectionStore.subscribe((state, prevState) => {
  const wasConnected = prevState.oracleState.isConnected || prevState.soapState.isConnected;
  const isConnected = state.oracleState.isConnected || state.soapState.isConnected;

  if (isConnected && !wasConnected && hasSessionToken()) {
    startSessionPolling();
  } else if (!isConnected && wasConnected) {
    stopSessionPolling();
  }
});

/* ==============================================
   Dev Simulation Helpers (Module-Level)
   ============================================== */

if (isDevelopment) {
  const simulateOracleConnect = async (username: string) => {
    try {
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
        setSessionToken(result.data.sessionToken);
      }

      const newOracleState: OracleConnectionState = {
        isConnected: true,
        isConnecting: false,
        error: null,
      };
      useConnectionStore.setState({
        oracleCredentials: { username, password: '********' },
        oracleState: newOracleState,
        ...derivedFlags(newOracleState, useConnectionStore.getState().soapState),
      });
      console.log(`\u{1f50c} [Dev] Oracle connected as: ${username} (session created)`);
    } catch (error) {
      console.error('[Dev] Failed to create dev session:', error);
      useConnectionStore.setState({
        oracleState: {
          isConnected: false,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Dev session creation failed',
        },
      });
    }
  };

  const simulateSoapConnect = async (username: string) => {
    try {
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
        setSessionToken(result.data.sessionToken);
      }

      const newSoapState: SoapConnectionState = {
        isConnected: true,
        isConnecting: false,
        error: null,
      };
      useConnectionStore.setState({
        soapCredentials: { username, password: '********' },
        soapState: newSoapState,
        ...derivedFlags(useConnectionStore.getState().oracleState, newSoapState),
      });
      console.log(`\u{1f50c} [Dev] SOAP connected as: ${username} (session created)`);
    } catch (error) {
      console.error('[Dev] Failed to create dev session:', error);
      useConnectionStore.setState({
        soapState: {
          isConnected: false,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Dev session creation failed',
        },
      });
    }
  };

  window.devSimulate = {
    oracleConnect: simulateOracleConnect,
    soapConnect: simulateSoapConnect,
    disconnectAll: () => void useConnectionStore.getState().disconnectAll(),
  };

  console.log(
    '\u{1f527} Dev helpers available:\n' +
    '   window.devSimulate.oracleConnect("username")\n' +
    '   window.devSimulate.soapConnect("username")\n' +
    '   window.devSimulate.disconnectAll()'
  );
}

/* ==============================================
   WebSocket Event Subscriptions (Module-Level)

   Listen for server-pushed auth changes and session expiry.
   These fire even when the tab is in background — no polling needed.
   ============================================== */

wsService.on<AuthChangedPayload>('auth:oracle-changed', (payload) => {
  if (!payload.verified) {
    const state = useConnectionStore.getState();
    if (state.oracleState.isConnected) {
      console.log(`[WS] Oracle auth revoked: ${payload.reason}`);
      useConnectionStore.setState({
        oracleState: initialOracleState,
        oracleCredentials: null,
        ...derivedFlags(initialOracleState, state.soapState),
      });
    }
  }
});

wsService.on<AuthChangedPayload>('auth:soap-changed', (payload) => {
  if (!payload.verified) {
    const state = useConnectionStore.getState();
    if (state.soapState.isConnected) {
      console.log(`[WS] SOAP auth revoked: ${payload.reason}`);
      useConnectionStore.setState({
        soapState: initialSoapState,
        soapCredentials: null,
        ...derivedFlags(state.oracleState, initialSoapState),
      });
    }
  }
});

wsService.on('session:expired', () => {
  useConnectionStore.getState().handleSessionExpired();
});
