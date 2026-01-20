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
 *
 * Uses shared workflow components for the button and status messages.
 */

import { motion } from 'framer-motion';
import { useSmartForm } from '../../../../context';
import type { OtherWorkflowStepName } from '../../../../types';
import { useWorkflowState } from '../../../../hooks';
import { fadeIn } from '../../../../utils/motion';
import {
  WorkflowActionButton,
  WorkflowStatusMessage,
} from '../../../workflow';
import './OtherWorkflowSection.css';

/** Steps that indicate active processing */
const PROCESSING_STEPS: OtherWorkflowStepName[] = [
  'creating-positions', 'approving',
];

export function OtherWorkflowSection() {
  const {
    state,
    distinctPositionCount,
    createPositionRecords,
    processOtherApprovals,
  } = useSmartForm();

  const { otherWorkflow, queryResults } = state;
  const otherCount = queryResults?.otherCount ?? 0;

  // Use workflow state hook
  const {
    stepName,
    isProcessing,
    isComplete,
    isError,
    errorMessage,
    progress,
  } = useWorkflowState({
    workflowStep: otherWorkflow,
    processingSteps: PROCESSING_STEPS,
  });

  // Determine what action to show
  const getActionConfig = (): { label: string; action: () => Promise<void> } | null => {
    // If no other records, no action needed
    if (otherCount === 0 && stepName === 'idle') return null;

    // Phase 1: Position creation
    if (stepName === 'idle' && distinctPositionCount > 0) {
      return {
        label: 'Create Position Records',
        action: createPositionRecords,
      };
    }

    // Phase 2: Approval processing (after positions created or if no positions to create)
    if (stepName === 'positions-created' ||
        (stepName === 'idle' && distinctPositionCount === 0 && otherCount > 0)) {
      return {
        label: 'Process Approvals',
        action: processOtherApprovals,
      };
    }

    return null;
  };

  const actionConfig = getActionConfig();

  // Don't render if no other records and workflow is idle
  if (otherCount === 0 && stepName === 'idle') {
    return (
      <section className="sf-other-container">
        <WorkflowStatusMessage
          type="empty"
          message="No Other transactions pending"
        />
      </section>
    );
  }

  return (
    <section className="sf-other-container">
      <div className="sf-other-content">
        {/* Action Button */}
        {actionConfig && !isComplete && !isError && (
          <WorkflowActionButton
            label={actionConfig.label}
            isProcessing={isProcessing}
            progress={progress}
            onAction={() => { void actionConfig.action(); }}
          />
        )}

        {/* Position Count Display */}
        {stepName === 'idle' && distinctPositionCount > 0 && (
          <span className="sf-other-count">
            {distinctPositionCount} distinct position number{distinctPositionCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Positions Created Message */}
        {stepName === 'positions-created' && (
          <motion.span
            className="sf-other-status sf-other-status--success"
            {...fadeIn}
          >
            <svg viewBox="0 0 24 24" fill="none" className="sf-other-status-icon" aria-hidden="true">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {otherWorkflow.step === 'positions-created' ? otherWorkflow.count : 0} position{(otherWorkflow.step === 'positions-created' ? otherWorkflow.count : 0) !== 1 ? 's' : ''} created
          </motion.span>
        )}

        {/* Completion Message */}
        {isComplete && (
          <WorkflowStatusMessage
            type="complete"
            message="Other Workflow Complete"
          />
        )}

        {/* Error Message */}
        {isError && errorMessage && (
          <WorkflowStatusMessage
            type="error"
            message={errorMessage}
          />
        )}
      </div>
    </section>
  );
}
