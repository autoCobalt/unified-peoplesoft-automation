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
      {/* Header Row: Query Button + Sub-tabs + Stats */}
      <div className="sf-header-row">
        <QueryOverviewSection />
        {hasQueried && (
          <div className="sf-subtabs-wrapper">
            <SubTabsSection />
          </div>
        )}
      </div>

      {/* Workflow + Table (visible after query) */}
      <AnimatePresence>
        {hasQueried && (
          <motion.div {...expandCollapse}>
            {/* Workflow Section based on active sub-tab */}
            <AnimatePresence mode="wait">
              {activeSubTab === 'manager' ? (
                <motion.div
                  key="manager-workflow"
                  custom={-1}
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
                  custom={1}
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
