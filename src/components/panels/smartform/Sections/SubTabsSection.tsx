/**
 * SubTabsSection Component
 *
 * Displays the Manager/Other sub-tab navigation.
 * Hidden until query has been executed.
 * Shows count badges with status-based coloring.
 */

import { motion } from 'framer-motion';
import { useSmartForm } from '../../../../context';
import { SMARTFORM_SUBTABS } from '../../../../types';
import { transitionSpring } from '../../../../utils/motion';
import './SubTabsSection.css';

interface SubTabsSectionProps {
  /** Optional className for layout positioning */
  className?: string;
}

export function SubTabsSection({ className = '' }: SubTabsSectionProps) {
  const { state, setActiveSubTab } = useSmartForm();
  const { queryResults, activeSubTab } = state;

  if (!queryResults) return null;

  return (
    <nav className={`sf-subtabs-container ${className}`} role="tablist" aria-label="SmartForm sub-tabs">
      {SMARTFORM_SUBTABS.map(({ id, label, countKey }) => {
        const count = queryResults[countKey];
        const isActive = activeSubTab === id;
        const isZero = count === 0;

        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`sf-tabpanel-${id}`}
            className={`sf-subtab-button ${isActive ? 'sf-subtab-button--active' : ''}`}
            onClick={() => { setActiveSubTab(id); }}
          >
            <span className="sf-subtab-label">{label}:</span>
            <span
              className={`sf-subtab-badge ${
                isZero ? 'sf-subtab-badge--success' : 'sf-subtab-badge--warning'
              }`}
            >
              {count}
            </span>

            {isActive && (
              <motion.div
                className="sf-subtab-indicator"
                layoutId="smartform-subtab-indicator"
                {...transitionSpring}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
