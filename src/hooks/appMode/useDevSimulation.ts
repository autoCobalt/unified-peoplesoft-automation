/**
 * useDevSimulation Hook
 *
 * Provides stable function references for simulating connections
 * during development. These functions wrap `window.devSimulate`
 * which is only available when VITE_APP_MODE === 'development'.
 *
 * Usage:
 * ```tsx
 * const { simulateOracle, simulateSoap, simulateBoth } = useDevSimulation();
 * simulateOracle('dev_user');
 * ```
 *
 * Note: This hook should only be used in development mode.
 * The functions will no-op if window.devSimulate is not available.
 */

import { useCallback } from 'react';

export interface DevSimulationActions {
  /** Simulate an Oracle database connection */
  simulateOracle: (username: string) => void;
  /** Simulate a PeopleSoft SOAP connection */
  simulateSoap: (username: string) => void;
  /** Simulate both Oracle and PeopleSoft connections */
  simulateBoth: (username: string) => void;
}

/**
 * Hook providing development simulation functions.
 *
 * Functions are memoized with useCallback to maintain stable references,
 * preventing unnecessary re-renders in consuming components.
 */
export function useDevSimulation(): DevSimulationActions {
  const simulateOracle = useCallback((username: string) => {
    window.devSimulate?.oracleConnect(username);
  }, []);

  const simulateSoap = useCallback((username: string) => {
    window.devSimulate?.soapConnect(username);
  }, []);

  const simulateBoth = useCallback((username: string) => {
    window.devSimulate?.oracleConnect(username);
    window.devSimulate?.soapConnect(username);
  }, []);

  return { simulateOracle, simulateSoap, simulateBoth };
}
