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

import type { WorkflowStatusMessageProps } from '../../types/workflow';
import { CircleCheckIcon, CircleXIcon } from '../icons';
import { ScaleIn, FadeIn } from '../motion';
import './WorkflowStatusMessage.css';

export function WorkflowStatusMessage({
  type,
  message,
  className = '',
}: WorkflowStatusMessageProps) {
  const baseClass = 'wf-status';
  const typeClass = `${baseClass}--${type}`;
  const combinedClassName = `${baseClass} ${typeClass} ${className}`.trim();

  const content = (
    <>
      {type === 'error'
        ? <CircleXIcon className="wf-status-icon wf-status-icon--error" />
        : <CircleCheckIcon className="wf-status-icon wf-status-icon--success" />}
      <span className="wf-status-text">{message}</span>
    </>
  );

  // Complete status uses scale + fade, others use simple fade
  if (type === 'complete') {
    return (
      <ScaleIn
        className={combinedClassName}
        role="status"
        aria-live="polite"
      >
        {content}
      </ScaleIn>
    );
  }

  return (
    <FadeIn
      className={combinedClassName}
      role="status"
      aria-live="polite"
    >
      {content}
    </FadeIn>
  );
}
