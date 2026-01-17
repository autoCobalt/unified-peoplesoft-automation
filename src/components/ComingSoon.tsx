/**
 * ComingSoon Component
 *
 * Generic placeholder for features that haven't been implemented yet.
 * Displays the tab name and description with a "Coming Soon" badge.
 */

import { motion } from 'framer-motion';
import { TABS, type TabId } from '../types';
import { scaleFade } from '../utils';
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
    <motion.section
      className="feature-panel coming-soon-panel"
      initial={scaleFade.initial}
      animate={scaleFade.animate}
      exit={scaleFade.exit}
      transition={scaleFade.transition}
    >
      <div className="panel-placeholder">
        <div className="placeholder-icon">{TAB_ICONS[tabId]}</div>
        <h2>{tab.label}</h2>
        <p>{tab.description}</p>
        <span className="placeholder-badge">Coming Soon</span>
      </div>
    </motion.section>
  );
}
