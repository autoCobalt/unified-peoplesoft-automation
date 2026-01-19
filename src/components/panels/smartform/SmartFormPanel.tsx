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
import { scaleFade } from '../../../utils/motion';
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
      {/* Query Button + Stats */}
      <QueryOverviewSection />

      {/* Sub-tabs (visible after query) */}
      <AnimatePresence>
        {hasQueried && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SubTabsSection />

            {/* Workflow Section based on active sub-tab */}
            <AnimatePresence mode="wait">
              {activeSubTab === 'manager' ? (
                <motion.div
                  key="manager-workflow"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ManagerWorkflowSection />
                </motion.div>
              ) : (
                <motion.div
                  key="other-workflow"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
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
