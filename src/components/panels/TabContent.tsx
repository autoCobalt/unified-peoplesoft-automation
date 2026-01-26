/**
 * TabContent Component
 *
 * Manages tab state and renders the appropriate panel based on the active tab.
 * Includes TabNavigation and handles the card-stack animation between panels.
 *
 * This is the main content area for the application's feature tabs.
 */

import { useState, useRef, useCallback } from 'react';
import { TabNavigation } from '../TabNavigation';
import { CardStack, type AnimationDirection } from '../motion';
import { ErrorBoundary } from '../ErrorBoundary';
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

  // Get the display label for the current tab
  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? activeTab;

  // Error callback for logging panel errors
  const handlePanelError = useCallback((error: Error) => {
    console.error(`[TabContent] Error in ${activeTabLabel} panel:`, error.message);
  }, [activeTabLabel]);

  // Panel-specific fallback UI
  const panelFallback = (
    <div className="panel-error-fallback">
      <div className="panel-error-content">
        <span className="panel-error-icon">⚠️</span>
        <h3>This panel encountered an error</h3>
        <p>The {activeTabLabel} panel failed to load. Try switching to another tab or reload the page.</p>
      </div>
    </div>
  );

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
        {/* Panel-level error boundary - resets when switching tabs via key prop */}
        <ErrorBoundary
          key={activeTab}
          fallback={panelFallback}
          onError={handlePanelError}
        >
          <ActivePanel />
        </ErrorBoundary>
      </CardStack>
    </>
  );
}
