/**
 * SmartFormPanel Component
 *
 * Main panel for the SmartForm feature.
 * Orchestrates the section components and provides context.
 *
 * Sections:
 * - QueryOverviewSection: Query button + stats
 * - SubTabsSection: Manager/Other sub-tab navigation
 * - ManagerWorkflowSection: 5-step manager approval workflow
 * - OtherWorkflowSection: Position creation + approval workflow
 * - DataTableSection: Filtered transaction table
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useSmartForm } from '../../../context';
import {
  QueryOverviewSection,
  SubTabsSection,
  ManagerWorkflowSection,
  OtherWorkflowSection,
  DataTableSection,
} from './Sections';
import {
  scaleFade,
  expandCollapse,
  slideHorizontalVariants,
  transitionQuick,
} from '../../../utils/motion';
import './SmartFormPanel.css';

/**
 * SmartFormPanel Component
 *
 * Consumes SmartFormContext (provided at App level for state persistence)
 * and orchestrates all section components.
 */
export function SmartFormPanel() {
  const { state } = useSmartForm();
  const { hasQueried, activeSubTab } = state;

  return (
    <motion.section
      className="feature-panel smartform-panel"
      {...scaleFade}
    >
      {/* Header Row: Button (left) + Tabs (center) + Total (right) */}
      <div className={`sf-header-row ${hasQueried ? 'sf-header-row--queried' : ''}`}>
        <QueryOverviewSection />
        {hasQueried && state.queryResults && (
          <>
            <div className="sf-header-center">
              <SubTabsSection />
            </div>
            <div className="sf-header-right">
              <div className="sf-overview-total">
                <span className="sf-overview-total-label">Total:</span>
                <span className="sf-overview-total-value">{state.queryResults.totalCount}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Workflow + Table (visible after query) */}
      <AnimatePresence>
        {hasQueried && (
          <motion.div className="sf-content" {...expandCollapse}>
            {/* Workflow Section based on active sub-tab */}
            <AnimatePresence mode="wait">
              {activeSubTab === 'manager' ? (
                <motion.div
                  key="manager-workflow"
                  custom={1}
                  variants={slideHorizontalVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={transitionQuick}
                >
                  <ManagerWorkflowSection />
                </motion.div>
              ) : (
                <motion.div
                  key="other-workflow"
                  custom={-1}
                  variants={slideHorizontalVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={transitionQuick}
                >
                  <OtherWorkflowSection />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Data Table */}
            <DataTableSection />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
