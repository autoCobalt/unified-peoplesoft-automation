/**
 * QueryOverviewSection Component
 *
 * Displays the query button and statistics overview.
 * - Pre-query: Shows "Run SmartForm Query" button
 * - Post-query: Shows "Refresh SmartForm" button + stats
 */

import { motion } from 'framer-motion';
import { useSmartForm } from '../../../../context';
import { buttonInteraction } from '../../../../utils/motion';
import { PlayIcon, RefreshIcon } from '../../../icons';
import './QueryOverviewSection.css';

export function QueryOverviewSection() {
  const { state, runQuery } = useSmartForm();
  const { hasQueried, isLoading } = state;

  return (
    <motion.button
      className={`sf-overview-button ${isLoading ? 'sf-overview-button--loading' : ''}`}
      onClick={() => { void runQuery(); }}
      disabled={isLoading}
      {...buttonInteraction}
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
    </motion.button>
  );
}
