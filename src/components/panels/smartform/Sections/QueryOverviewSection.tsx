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
import './QueryOverviewSection.css';

export function QueryOverviewSection() {
  const { state, runQuery } = useSmartForm();
  const { hasQueried, isLoading, queryResults } = state;

  return (
    <section className="sf-overview-container">
      {/* Query Button */}
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="sf-overview-icon"
            >
              {hasQueried ? (
                // Refresh icon
                <path
                  d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                // Play/Run icon
                <path
                  d="M5 3L19 12L5 21V3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            {hasQueried ? 'Refresh SmartForm' : 'Run SmartForm Query'}
          </>
        )}
      </motion.button>

      {/* Total Display (only after query) */}
      {hasQueried && queryResults && (
        <div className="sf-overview-total">
          <span className="sf-overview-total-label">Total:</span>
          <span className="sf-overview-total-value">{queryResults.totalCount}</span>
        </div>
      )}
    </section>
  );
}
