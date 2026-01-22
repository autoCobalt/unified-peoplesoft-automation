/**
 * QueryOverviewSection Component
 *
 * Displays the query button and statistics overview.
 * - Pre-query: Shows "Run SmartForm Query" button (requires Oracle connection)
 * - Post-query: Shows "Refresh SmartForm" button + stats
 */

import { useSmartForm, useConnection } from '../../../../context';
import { InteractiveElement } from '../../../motion';
import { PlayIcon, RefreshIcon } from '../../../icons';
import './QueryOverviewSection.css';

interface QueryOverviewSectionProps {
  /** Optional className for layout positioning */
  className?: string;
}

export function QueryOverviewSection({ className = '' }: QueryOverviewSectionProps) {
  const { state, runQuery } = useSmartForm();
  const { oracleState } = useConnection();
  const { hasQueried, isLoading } = state;

  // Query requires Oracle connection
  const canRun = oracleState.isConnected;
  const isDisabled = isLoading || !canRun;

  return (
    <div className={`sf-overview-container ${className}`}>
      <InteractiveElement
        className={`sf-overview-button ${isLoading ? 'sf-overview-button--loading' : ''} ${!canRun ? 'sf-overview-button--disabled' : ''}`}
        onClick={() => { void runQuery(); }}
        disabled={isDisabled}
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
