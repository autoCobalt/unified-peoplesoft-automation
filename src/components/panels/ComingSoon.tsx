/**
 * ComingSoon Component
 *
 * Generic placeholder for features that haven't been implemented yet.
 * Displays the tab name and description with a "Coming Soon" badge.
 *
 * Animation is handled by the parent AnimatedPanel wrapper.
 */

import { TABS, type TabId } from '../../types';
import './ComingSoon.css';

interface ComingSoonProps {
  /** The tab ID to display information for */
  tabId: TabId;
}

/** Icon mapping for each tab */
const TAB_ICONS: Record<TabId, string> = {
  smartform: '📋',
  'edw-transfers': '🔄',
  'bulk-paf': '📑',
  'parking-deductions': '🅿️',
  'ci-record-entry': '📊',
  'mass-email-notices': '📧',
};

export function ComingSoon({ tabId }: ComingSoonProps) {
  const tab = TABS.find((t) => t.id === tabId);

  if (!tab) {
    return null;
  }

  return (
    <section className="feature-panel coming-soon-panel">
      <div className="panel-placeholder">
        <div className="placeholder-icon">{TAB_ICONS[tabId]}</div>
        <h2>{tab.label}</h2>
        <p>{tab.description}</p>
        <span className="placeholder-badge">Coming Soon</span>
      </div>
    </section>
  );
}
