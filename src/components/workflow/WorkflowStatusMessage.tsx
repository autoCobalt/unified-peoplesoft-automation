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
import './WorkflowStatusMessage.css';

/** Success/complete icon with circle and checkmark */
function SuccessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="wf-status-icon wf-status-icon--success"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12L11 15L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Error icon (exclamation in circle) */
function ErrorIcon() {
  return (
    <span className="wf-status-error-badge" aria-hidden="true">
      !
    </span>
  );
}

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
      {type === 'error' ? <ErrorIcon /> : <SuccessIcon />}
      <span className="wf-status-text">{message}</span>
    </motion.div>
  );
}
