/**
 * TabContent Component
 *
 * Manages tab state and renders the appropriate panel based on the active tab.
 * Includes TabNavigation and handles the card-stack animation between panels.
 *
 * This is the main content area for the application's feature tabs.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabNavigation } from '../TabNavigation';
import { cardStackVariants, cardStackTransition } from '../../utils';
import { DEFAULT_TAB, TABS, type TabId } from '../../types';

// Panel imports
import { SmartFormPanel } from './smartform';
import { EdwTransfersPanel } from './edw-transfers';
import { BulkPafPanel } from './bulk-paf';
import { ParkingDeductionsPanel } from './parking-deductions';
import { CiRecordEntryPanel } from './ci-record-entry';
import { MassEmailNoticesPanel } from './mass-email-notices';

/**
 * Maps tab IDs to their corresponding panel components.
 */
const PANEL_MAP: Record<TabId, React.ComponentType> = {
  'smartform': SmartFormPanel,
  'edw-transfers': EdwTransfersPanel,
  'bulk-paf': BulkPafPanel,
  'parking-deductions': ParkingDeductionsPanel,
  'ci-record-entry': CiRecordEntryPanel,
  'mass-email-notices': MassEmailNoticesPanel,
};

export function TabContent() {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);
  const [direction, setDirection] = useState(0);
  const [transitionId, setTransitionId] = useState(0);
  const prevIndexRef = useRef(0);

  /**
   * Handles tab changes and calculates animation direction.
   * Direction is 1 for forward (right) and -1 for backward (left).
   */
  const handleTabChange = (newTabId: TabId) => {
    // Ignore clicks on the already-active tab
    if (newTabId === activeTab) return;

    const newIndex = TABS.findIndex((t) => t.id === newTabId);
    const prevIndex = prevIndexRef.current;

    setDirection(newIndex > prevIndex ? 1 : -1);
    prevIndexRef.current = newIndex;
    setTransitionId((id) => (id + 1) % 7);
    setActiveTab(newTabId);
  };

  // Get the panel component for the active tab
  const ActivePanel = PANEL_MAP[activeTab];

  return (
    <>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <div style={{ perspective: '1000px', overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={`${activeTab}-${String(transitionId)}`}
            custom={direction}
            variants={cardStackVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={cardStackTransition}
            style={{
              transformOrigin: 'center center',
              transformStyle: 'preserve-3d',
            }}
          >
            <ActivePanel />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
