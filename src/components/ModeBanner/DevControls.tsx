/**
 * DevControls Component
 *
 * Development-only controls for simulating Oracle and PeopleSoft connections.
 * Uses a data-driven approach to render connection buttons, reducing repetition.
 *
 * This component should only be rendered when isDevelopment is true.
 */

import { useState, useMemo } from 'react';
import { useConnection } from '../../context';
import { useDevSimulation } from '../../hooks';

/* ==============================================
   Button Configuration Types
   ============================================== */

interface SimulationButtonConfig {
  /** Unique identifier for the button */
  id: string;
  /** Button label text */
  label: string;
  /** Which simulation function to call */
  simulationType: 'oracle' | 'soap' | 'both';
  /** Tooltip text */
  title: string;
  /** Additional CSS class */
  className?: string;
}

/* ==============================================
   Button Configuration Data
   ============================================== */

/**
 * Configuration for simulation buttons.
 * Adding a new button only requires adding an entry here.
 */
const SIMULATION_BUTTONS: readonly SimulationButtonConfig[] = [
  {
    id: 'oracle',
    label: 'Oracle',
    simulationType: 'oracle',
    title: 'Simulate Oracle connection',
  },
  {
    id: 'soap',
    label: 'PeopleSoft',
    simulationType: 'soap',
    title: 'Simulate PeopleSoft connection',
  },
  {
    id: 'both',
    label: 'Both',
    simulationType: 'both',
    title: 'Simulate both connections',
    className: 'dev-button-both',
  },
];

/* ==============================================
   Component
   ============================================== */

export function DevControls() {
  const [username, setUsername] = useState('dev_user');
  const { oracleState, soapState, disconnectAll } = useConnection();
  const { simulateOracle, simulateSoap, simulateBoth } = useDevSimulation();

  const hasAnyConnection = oracleState.isConnected || soapState.isConnected;

  /**
   * Map simulation type to its corresponding function and disabled state.
   * Memoized to prevent recreation on every render.
   */
  const simulationMap = useMemo(() => ({
    oracle: {
      action: () => { simulateOracle(username); },
      isDisabled: oracleState.isConnected,
    },
    soap: {
      action: () => { simulateSoap(username); },
      isDisabled: soapState.isConnected,
    },
    both: {
      action: () => { simulateBoth(username); },
      isDisabled: oracleState.isConnected && soapState.isConnected,
    },
  }), [username, oracleState.isConnected, soapState.isConnected, simulateOracle, simulateSoap, simulateBoth]);

  return (
    <div className="dev-controls">
      {/* Username Input */}
      <input
        type="text"
        className="dev-username-input"
        value={username}
        onChange={(e) => { setUsername(e.target.value); }}
        placeholder="username"
        title="Username for simulated connections"
      />

      {/* Simulation Buttons (data-driven) */}
      {SIMULATION_BUTTONS.map((config) => {
        const { action, isDisabled } = simulationMap[config.simulationType];
        return (
          <button
            key={config.id}
            type="button"
            className={`dev-button ${config.className ?? ''}`}
            onClick={action}
            disabled={isDisabled}
            title={config.title}
          >
            {config.label}
          </button>
        );
      })}

      {/* Reset Button (separate - only shown when connected) */}
      {hasAnyConnection && (
        <button
          type="button"
          className="dev-button dev-button-disconnect"
          onClick={() => void disconnectAll()}
          title="Disconnect all"
        >
          Reset
        </button>
      )}
    </div>
  );
}
