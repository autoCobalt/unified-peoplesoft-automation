/**
 * WorkflowStatusMessage Component
 *
 * Displays workflow status messages (complete, error, or empty state).
 * Uses appropriate icons and colors for each status type.
 *
 * @example
 * <WorkflowStatusMessage
 *   type="complete"
 *   message="Workflow Complete"
 *   className="sf-workflow"
 * />
 */

import { motion } from 'framer-motion';
import type { WorkflowStatusMessageProps, StatusMessageType } from '../../types/workflow';
import { CircleCheckIcon, CircleXIcon } from '../icons';
import './WorkflowStatusMessage.css';

/** Get animation props based on status type */
function getAnimationProps(type: StatusMessageType) {
  if (type === 'complete') {
    return {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
    };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  };
}

export function WorkflowStatusMessage({
  type,
  message,
  className = '',
}: WorkflowStatusMessageProps) {
  const baseClass = 'wf-status';
  const typeClass = `${baseClass}--${type}`;

  return (
    <motion.div
      className={`${baseClass} ${typeClass} ${className}`.trim()}
      {...getAnimationProps(type)}
      role="status"
      aria-live="polite"
    >
      {type === 'error'
        ? <CircleXIcon className="wf-status-icon wf-status-icon--error" />
        : <CircleCheckIcon className="wf-status-icon wf-status-icon--success" />}
      <span className="wf-status-text">{message}</span>
    </motion.div>
  );
}
