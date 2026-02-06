/**
 * SmartFormPanel Component
 *
 * Main panel for the SmartForm feature.
 * Orchestrates the section components and provides layout structure.
 *
 * Sections:
 * - QueryOverviewSection: Query button + stats
 * - SubTabsSection: Manager/Other sub-tab navigation
 * - TotalDisplay: Transaction count
 * - ManagerWorkflowSection: 4-step manager approval workflow
 * - OtherWorkflowSection: Position creation + approval workflow
 * - DataTableSection: Filtered transaction table
 *
 * Layout:
 * - Header uses CSS Grid (3 columns: left | center | right)
 * - Workflow sections animate with PresenceWrapper
 */

import { useShallow } from 'zustand/react/shallow';
import { useSmartFormStore } from '../../../stores';
import {
  ScaleIn,
  ExpandCollapse,
  PresenceWrapper,
} from '../../motion';
import {
  QueryOverviewSection,
  SubTabsSection,
  TotalDisplay,
  ManagerWorkflowSection,
  OtherWorkflowSection,
  DataTableSection,
} from './Sections';
import './SmartFormPanel.css';

/* ==============================================
   Workflow Section Mapping
   ============================================== */

/**
 * Maps sub-tab IDs to their workflow components.
 * Adding a new workflow only requires adding an entry here.
 */
const WORKFLOW_SECTIONS = {
  manager: ManagerWorkflowSection,
  other: OtherWorkflowSection,
} as const;

/* ==============================================
   Component
   ============================================== */

export function SmartFormPanel() {
  const { hasQueried, activeSubTab, queryResults } = useSmartFormStore(
    useShallow(s => ({ hasQueried: s.hasQueried, activeSubTab: s.activeSubTab, queryResults: s.queryResults })),
  );

  // Get the active workflow component
  const WorkflowSection = WORKFLOW_SECTIONS[activeSubTab];

  // Determine slide direction based on tab position (1 = right, -1 = left)
  const slideDirection = activeSubTab === 'manager' ? -1 : 1;

  return (
    <ScaleIn
      as="section"
      className={`feature-panel smartform-panel ${!hasQueried ? 'smartform-panel--pre-query' : ''}`}
    >
      {/* Header Row: Query (left) | SubTabs (center) | Total (right) */}
      <div className={`sf-header-row ${hasQueried ? 'sf-header-row--queried' : ''}`}>
        <QueryOverviewSection className="sf-grid-left" />

        {hasQueried && queryResults && (
          <>
            <SubTabsSection className="sf-grid-center" />
            <TotalDisplay
              count={queryResults.totalCount}
              className="sf-grid-right"
            />
          </>
        )}
      </div>

      {/* Content: Workflow + Table (visible after query) */}
      <ExpandCollapse isOpen={hasQueried} className="sf-content" overflow="visible">
        {/* Workflow Section with slide transition */}
        <PresenceWrapper
          transitionKey={activeSubTab}
          variant="slideHorizontal"
          direction={slideDirection}
          duration={0.15}
          mode="popLayout"
          overflow="visible"
        >
          <WorkflowSection />
        </PresenceWrapper>

        {/* Data Table */}
        <DataTableSection />
      </ExpandCollapse>
    </ScaleIn>
  );
}
