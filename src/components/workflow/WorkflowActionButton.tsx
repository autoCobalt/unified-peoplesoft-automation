/**
 * WorkflowActionButton Component
 *
 * Reusable action button for workflow operations.
 * Displays spinner and progress counter when processing.
 * When paused, retains processing styling but shows pause-specific text.
 *
 * @example
 * <WorkflowActionButton
 *   label="Process Approvals"
 *   isProcessing={isProcessing}
 *   isPaused={isPaused}
 *   progress={progress}
 *   onAction={() => void processApprovals()}
 *   className="sf-workflow"
 * />
 */

import { InteractiveElement } from '../motion';
import type { WorkflowActionButtonProps } from '../../types/workflow';
import './WorkflowActionButton.css';

/**
 * Renders the button content based on processing/paused state
 */
function renderButtonContent(
  isProcessing: boolean,
  isPaused: boolean,
  progress: WorkflowActionButtonProps['progress'],
  label: string
): React.ReactNode {
  // Paused state - show processing styling with pause message
  if (isPaused && progress) {
    return (
      <>
        <span className="wf-action-spinner wf-action-spinner--paused" aria-hidden="true" />
        {`Paused: ${progress.currentItem ?? ''} ${String(progress.current)}/${String(progress.total)}`}
      </>
    );
  }

  // Active processing state
  if (isProcessing) {
    const progressText = progress
      ? `Processing ${progress.currentItem ? `${progress.currentItem} ` : ''}${String(progress.current)}/${String(progress.total)}...`
      : 'Processing...';

    return (
      <>
        <span className="wf-action-spinner" aria-hidden="true" />
        {progressText}
      </>
    );
  }

  // Idle state
  return label;
}

export function WorkflowActionButton({
  label,
  isProcessing,
  isPaused = false,
  progress,
  onAction,
  className = '',
  disabled = false,
  onPointerEnter,
  onPointerLeave,
}: WorkflowActionButtonProps) {
  const baseClass = 'wf-action-button';
  // Apply processing class for both processing and paused states (visual continuity)
  const processingClass = (isProcessing || isPaused) ? `${baseClass}--processing` : '';
  const pausedClass = isPaused ? `${baseClass}--paused` : '';

  return (
    <InteractiveElement
      className={`${baseClass} ${processingClass} ${pausedClass} ${className}`.trim()}
      onClick={onAction}
      disabled={isProcessing || isPaused || disabled}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      aria-busy={isProcessing || isPaused}
      aria-label={isPaused ? `${label} - paused` : isProcessing ? `${label} - processing` : undefined}
    >
      {renderButtonContent(isProcessing, isPaused, progress, label)}
    </InteractiveElement>
  );
}
