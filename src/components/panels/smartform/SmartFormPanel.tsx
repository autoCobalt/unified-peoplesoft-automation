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
 * - Workflow sections animate with SlideTransition
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useSmartForm } from '../../../context';
import { SlideTransition } from '../../SlideTransition';
import {
  QueryOverviewSection,
  SubTabsSection,
  TotalDisplay,
  ManagerWorkflowSection,
  OtherWorkflowSection,
  DataTableSection,
} from './Sections';
import { scaleFade, expandCollapse } from '../../../utils/motion';
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
  const { state } = useSmartForm();
  const { hasQueried, activeSubTab, queryResults } = state;

  // Get the active workflow component
  const WorkflowSection = WORKFLOW_SECTIONS[activeSubTab];

  // Determine slide direction based on tab position
  const slideDirection = activeSubTab === 'manager' ? 'left' : 'right';

  return (
    <motion.section className={`feature-panel smartform-panel ${!hasQueried ? 'smartform-panel--pre-query' : ''}`} {...scaleFade}>
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
      <AnimatePresence>
        {hasQueried && (
          <motion.div className="sf-content" {...expandCollapse}>
            {/* Workflow Section with slide transition */}
            <SlideTransition
              transitionKey={activeSubTab}
              direction={slideDirection}
            >
              <WorkflowSection />
            </SlideTransition>

            {/* Data Table */}
            <DataTableSection />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
