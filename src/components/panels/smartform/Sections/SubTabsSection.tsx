/**
 * SubTabsSection Component
 *
 * Displays the Manager/Other sub-tab navigation.
 * Hidden until query has been executed.
 * Shows count badges with status-based coloring.
 *
 * The sliding indicator uses CSS transform instead of Framer Motion's layoutId
 * to avoid conflicts with CardStack's popLayout AnimatePresence mode, which
 * shares the same internal layout animation system and prevents exit cleanup.
 */

import { useShallow } from 'zustand/react/shallow';
import { useSmartFormStore } from '../../../../stores';
import { SMARTFORM_SUBTABS } from '../../../../types';
import './SubTabsSection.css';

interface SubTabsSectionProps {
  /** Optional className for layout positioning */
  className?: string;
}

export function SubTabsSection({ className = '' }: SubTabsSectionProps) {
  const { queryResults, activeSubTab } = useSmartFormStore(
    useShallow(s => ({ queryResults: s.queryResults, activeSubTab: s.activeSubTab })),
  );
  const setActiveSubTab = useSmartFormStore(s => s.setActiveSubTab);

  if (!queryResults) return null;

  const activeIndex = SMARTFORM_SUBTABS.findIndex(t => t.id === activeSubTab);

  return (
    <nav className={`sf-subtabs-container ${className}`} role="tablist" aria-label="SmartForm sub-tabs">
      {/* Sliding indicator — positioned absolutely, slides via CSS transform */}
      <div
        className="sf-subtab-indicator"
        style={activeIndex > 0
          ? { transform: `translateX(calc(${String(activeIndex)} * (100% + 0.25rem)))` }
          : undefined}
      />

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
          </button>
        );
      })}
    </nav>
  );
}
