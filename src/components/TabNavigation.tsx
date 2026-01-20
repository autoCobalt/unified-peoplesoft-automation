/**
 * TabNavigation Component
 *
 * Horizontal tab bar for switching between application features.
 * Each tab represents a separate automation workflow (SmartForm, EDW, etc.).
 *
 * Uses framer-motion for smooth tab indicator animation.
 * Tabs wrap to multiple rows on smaller viewports.
 */

import { motion } from 'framer-motion';
import { TABS, type TabId } from '../types';
import { slideUpFadeDelay, transitionSpring } from '../utils';
import './TabNavigation.css';

interface TabNavigationProps {
  /** Currently active tab */
  activeTab: TabId;
  /** Callback when a tab is selected */
  onTabChange: (tabId: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <motion.nav
      className="tab-navigation"
      role="tablist"
      aria-label="Feature tabs"
      {...slideUpFadeDelay}
    >
      <div className="tab-list">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              className={`tab-button ${isActive ? 'active' : ''}`}
              onClick={() => { onTabChange(tab.id); }}
              title={tab.description}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  className="tab-indicator"
                  layoutId="tab-indicator"
                  {...transitionSpring}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
