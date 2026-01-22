/**
 * TabContent Component
 *
 * Manages tab state and renders the appropriate panel based on the active tab.
 * Includes TabNavigation and handles the card-stack animation between panels.
 *
 * This is the main content area for the application's feature tabs.
 */

import { useState, useRef } from 'react';
import { TabNavigation } from '../TabNavigation';
import { CardStack, type AnimationDirection } from '../motion';
import { DEFAULT_TAB, TABS, type TabId } from '../../types';
import { PANEL_REGISTRY } from './panelRegistry';

export function TabContent() {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);
  const [direction, setDirection] = useState<AnimationDirection>(1);
  const [transitionId, setTransitionId] = useState(0);
  const prevIndexRef = useRef(0);

  /**
   * Handles tab changes and calculates animation direction.
   * Direction is 1 for forward (right) and -1 for backward (left).
   * Each transition gets a unique ID to prevent key collisions.
   */
  const handleTabChange = (newTabId: TabId) => {
    // Ignore clicks on the already-active tab
    if (newTabId === activeTab) return;

    const newIndex = TABS.findIndex((t) => t.id === newTabId);
    const prevIndex = prevIndexRef.current;

    setDirection(newIndex > prevIndex ? 1 : -1);
    prevIndexRef.current = newIndex;
    setTransitionId((id) => (id + 1) % 128);
    setActiveTab(newTabId);
  };

  // Get the panel component for the active tab
  const ActivePanel = PANEL_REGISTRY[activeTab];

  return (
    <>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <CardStack
        transitionKey={`${activeTab}-${String(transitionId)}`}
        direction={direction}
        style={{
          transformOrigin: 'center center',
          transformStyle: 'preserve-3d',
        }}
      >
        <ActivePanel />
      </CardStack>
    </>
  );
}
