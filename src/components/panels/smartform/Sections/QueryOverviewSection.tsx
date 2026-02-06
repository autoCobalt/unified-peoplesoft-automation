/**
 * QueryOverviewSection Component
 *
 * Displays the query button and statistics overview.
 * - Pre-query: Shows "Run SmartForm Query" button (requires Oracle connection)
 * - Post-query: Shows "Refresh SmartForm" button + stats
 */

import { useShallow } from 'zustand/react/shallow';
import { useSmartFormStore, useConnectionStore } from '../../../../stores';
import { InteractiveElement } from '../../../motion';
import { PlayIcon, RefreshIcon } from '../../../icons';
import './QueryOverviewSection.css';

interface QueryOverviewSectionProps {
  /** Optional className for layout positioning */
  className?: string;
}

export function QueryOverviewSection({ className = '' }: QueryOverviewSectionProps) {
  const { hasQueried, isLoading } = useSmartFormStore(
    useShallow(s => ({ hasQueried: s.hasQueried, isLoading: s.isLoading })),
  );
  const runQuery = useSmartFormStore(s => s.runQuery);
  const oracleState = useConnectionStore(s => s.oracleState);
  const setOracleHintActive = useConnectionStore(s => s.setOracleHintActive);

  // Query requires Oracle connection
  const canRun = oracleState.isConnected;
  const isDisabled = isLoading || !canRun;

  // Hint handlers - only active when button is disabled due to missing Oracle connection
  const handlePointerEnter = () => {
    if (!canRun && !isLoading) {
      setOracleHintActive(true);
    }
  };

  const handlePointerLeave = () => {
    setOracleHintActive(false);
  };

  return (
    <div className={`sf-overview-container ${className}`}>
      <InteractiveElement
        className={`sf-overview-button ${isLoading ? 'sf-overview-button--loading' : ''} ${!canRun ? 'sf-overview-button--disabled' : ''}`}
        onClick={() => { void runQuery(); }}
        disabled={isDisabled}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {isLoading ? (
          <>
            <span className="sf-overview-spinner" />
            Running Query...
          </>
        ) : (
          <>
            {hasQueried ? (
              <RefreshIcon className="sf-overview-icon" />
            ) : (
              <PlayIcon className="sf-overview-icon" />
            )}
            {hasQueried ? 'Refresh SmartForm' : 'Run SmartForm Query'}
          </>
        )}
      </InteractiveElement>
      {!canRun && (
        <p className="sf-overview-requirements-warning">
          Requires Oracle connection
        </p>
      )}
    </div>
  );
}
