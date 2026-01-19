/**
 * OtherWorkflowSection Component
 *
 * Displays the Other approval workflow:
 * Phase 1: Position creation
 * Phase 2: Approval processing (if positions remain after refresh)
 *
 * Features:
 * - Single-line layout with action button and count display
 * - Auto-refresh after position creation
 * - Transitions to approval workflow when needed
 */

import { motion } from 'framer-motion';
import { useSmartForm } from '../../../../context';
import { buttonInteraction } from '../../../../utils/motion';
import './OtherWorkflowSection.css';

export function OtherWorkflowSection() {
  const {
    state,
    distinctPositionCount,
    createPositionRecords,
    processOtherApprovals,
    getStepProgress,
  } = useSmartForm();

  const { otherWorkflow, queryResults } = state;
  const currentStep = otherWorkflow.step;
  const otherCount = queryResults?.otherCount ?? 0;

  const progress = getStepProgress('other');
  const isProcessing = ['creating-positions', 'browser-opening', 'approving'].includes(currentStep);

  // Determine what action to show
  const getActionConfig = (): { label: string; action: () => Promise<void> } | null => {
    // If no other records, no action needed
    if (otherCount === 0 && currentStep === 'idle') return null;

    // Phase 1: Position creation
    if (currentStep === 'idle' && distinctPositionCount > 0) {
      return {
        label: 'Create Position Records',
        action: createPositionRecords,
      };
    }

    // Phase 2: Approval processing (after positions created or if no positions to create)
    if (currentStep === 'positions-created' ||
        (currentStep === 'idle' && distinctPositionCount === 0 && otherCount > 0)) {
      return {
        label: 'Process Approvals',
        action: processOtherApprovals,
      };
    }

    return null;
  };

  const actionConfig = getActionConfig();

  // Don't render if no other records and workflow is idle
  if (otherCount === 0 && currentStep === 'idle') {
    return (
      <section className="sf-other-container">
        <div className="sf-other-empty">
          <svg viewBox="0 0 24 24" fill="none" className="sf-other-empty-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>No Other transactions pending</span>
        </div>
      </section>
    );
  }

  return (
    <section className="sf-other-container">
      <div className="sf-other-content">
        {/* Action Button */}
        {actionConfig && currentStep !== 'complete' && currentStep !== 'error' && (
          <motion.button
            className={`sf-other-action-button ${isProcessing ? 'sf-other-action-button--processing' : ''}`}
            onClick={() => { void actionConfig.action(); }}
            disabled={isProcessing}
            {...buttonInteraction}
          >
            {isProcessing ? (
              <>
                <span className="sf-other-spinner" />
                {progress ? `Processing ${String(progress.current)}/${String(progress.total)}...` : 'Processing...'}
              </>
            ) : (
              actionConfig.label
            )}
          </motion.button>
        )}

        {/* Position Count Display */}
        {currentStep === 'idle' && distinctPositionCount > 0 && (
          <span className="sf-other-count">
            {distinctPositionCount} distinct position number{distinctPositionCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Positions Created Message */}
        {currentStep === 'positions-created' && (
          <motion.span
            className="sf-other-status sf-other-status--success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="sf-other-status-icon">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {otherWorkflow.count} position{otherWorkflow.count !== 1 ? 's' : ''} created
          </motion.span>
        )}

        {/* Completion Message */}
        {currentStep === 'complete' && (
          <motion.div
            className="sf-other-complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="sf-other-complete-icon">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Other Workflow Complete</span>
          </motion.div>
        )}

        {/* Error Message */}
        {currentStep === 'error' && (
          <motion.div
            className="sf-other-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="sf-other-error-icon">!</span>
            <span>{otherWorkflow.message}</span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
