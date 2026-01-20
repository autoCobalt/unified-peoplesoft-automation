/**
 * WorkflowActionButton Component
 *
 * Reusable action button for workflow operations.
 * Displays spinner and progress counter when processing.
 *
 * @example
 * <WorkflowActionButton
 *   label="Process Approvals"
 *   isProcessing={isProcessing}
 *   progress={progress}
 *   onAction={() => void processApprovals()}
 *   className="sf-workflow"
 * />
 */

import { motion } from 'framer-motion';
import { buttonInteraction } from '../../utils/motion';
import type { WorkflowActionButtonProps } from '../../types/workflow';
import './WorkflowActionButton.css';

export function WorkflowActionButton({
  label,
  isProcessing,
  progress,
  onAction,
  className = '',
  disabled = false,
}: WorkflowActionButtonProps) {
  const baseClass = 'wf-action-button';
  const processingClass = isProcessing ? `${baseClass}--processing` : '';

  return (
    <motion.button
      className={`${baseClass} ${processingClass} ${className}`.trim()}
      onClick={onAction}
      disabled={isProcessing || disabled}
      {...buttonInteraction}
    >
      {isProcessing ? (
        <>
          <span className="wf-action-spinner" aria-hidden="true" />
          {progress
            ? `Processing ${String(progress.current)}/${String(progress.total)}...`
            : 'Processing...'}
        </>
      ) : (
        label
      )}
    </motion.button>
  );
}
