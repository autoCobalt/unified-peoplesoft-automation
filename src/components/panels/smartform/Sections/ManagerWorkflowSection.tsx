/**
 * ManagerWorkflowSection Component
 *
 * Displays the 4-task Manager approval workflow:
 * 1. Process approvals (browser opens automatically)
 * 2. Submit dept company clearing (auto-skipped if no records)
 * 3. Submit position data
 * 4. Submit job data
 *
 * CI data is auto-parsed during query execution — no manual prepare step.
 * Submission status is displayed in the CI preview tables (DataTableSection).
 * Uses shared workflow components for the checklist, button, and status messages.
 *
 * Uses the definition-driven workflow system from src/workflows/.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useSmartForm, useConnection } from '../../../../context';
import type { ChecklistTask } from '../../../../types';
import { useWorkflowDefinition } from '../../../../hooks';
import type { ActionMap, RequirementStatus } from '../../../../workflows';
import { managerWorkflowDefinition } from '../../../../workflows';
import {
  WorkflowActionButton,
  WorkflowChecklist,
  WorkflowStatusMessage,
} from '../../../workflow';
import './ManagerWorkflowSection.css';

export function ManagerWorkflowSection() {
  const {
    state,
    openBrowser,
    pauseApprovals,
    resumeApprovals,
    submitDeptCoData,
    submitPositionData,
    submitJobData,
    isWorkflowPaused,
    managerPauseReason,
    effectiveRecordCounts,
  } = useSmartForm();

  const {
    soapState,
    setOracleHintActive,
    setSoapHintActive,
  } = useConnection();

  const { managerWorkflow } = state;

  // Action map connects task IDs to context-provided actions
  // This keeps action logic in the context provider while definitions stay pure
  const actionMap: ActionMap = useMemo(() => ({
    approvals: openBrowser,
    'dept-co': submitDeptCoData,
    position: submitPositionData,
    job: submitJobData,
  }), [openBrowser, submitDeptCoData, submitPositionData, submitJobData]);

  // Build requirement status from connection states
  const requirementStatus: RequirementStatus = useMemo(() => ({
    soap: soapState.isConnected,
    // Add other requirements as needed:
    // oracle: oracleState.isConnected,
    // browser: browserState.isConnected,
  }), [soapState.isConnected]);

  // Pre-complete tasks that have no submittable records (selected + non-duplicate).
  // Uses centralized effectiveRecordCounts from context for consistency with submit functions.
  const taskCompletionOverrides = useMemo(() => ({
    'dept-co': effectiveRecordCounts.deptCo === 0,
    'position': effectiveRecordCounts.positionUpdate === 0,
    'job': effectiveRecordCounts.jobUpdate === 0,
  }), [effectiveRecordCounts]);

  // Use definition-driven workflow hook
  const {
    stepName,
    isProcessing,
    isComplete,
    isError,
    errorMessage,
    progress,
    tasksWithStatus,
    activeTask,
    canProceed,
    missingRequirements,
  } = useWorkflowDefinition({
    definition: managerWorkflowDefinition,
    workflowStep: managerWorkflow,
    requirementStatus,
    taskCompletionOverrides,
  });

  // Convert tasks to checklist format
  const checklistTasks: ChecklistTask[] = tasksWithStatus.map(t => ({
    id: t.id,
    label: t.label,
    status: t.status,
  }));

  // Get action for the active task
  const activeAction = activeTask ? actionMap[activeTask.id] : undefined;

  // Format missing requirements for display
  const requirementLabels: Record<string, string> = {
    soap: 'PeopleSoft SOAP',
    oracle: 'Oracle Database',
    browser: 'Browser',
  };
  const missingRequirementsText = missingRequirements
    .map(req => requirementLabels[req] ?? req)
    .join(', ');

  // Hint handlers - activate hints for missing connection requirements when hovering disabled button
  const handlePointerEnter = () => {
    if (!canProceed && missingRequirements.length > 0) {
      if (missingRequirements.includes('oracle')) {
        setOracleHintActive(true);
      }
      if (missingRequirements.includes('soap')) {
        setSoapHintActive(true);
      }
    }
  };

  const handlePointerLeave = () => {
    setOracleHintActive(false);
    setSoapHintActive(false);
  };

  // Auto-skip steps when no selected records exist for that CI type.
  // Each fires the submit function which handles the empty case internally
  // (transitions to the next step with total=0). Uses taskCompletionOverrides
  // so it respects checkbox selection, not just the raw prepared array length.
  useEffect(() => {
    if (stepName === 'approved' && taskCompletionOverrides['dept-co']) {
      void submitDeptCoData();
    }
  }, [stepName, taskCompletionOverrides, submitDeptCoData]);

  useEffect(() => {
    if (stepName === 'submitting-position' && taskCompletionOverrides['position']) {
      void submitPositionData();
    }
  }, [stepName, taskCompletionOverrides, submitPositionData]);

  useEffect(() => {
    if (stepName === 'submitting-job' && taskCompletionOverrides['job']) {
      void submitJobData();
    }
  }, [stepName, taskCompletionOverrides, submitJobData]);

  // Resume handler with confirmation for browser-closed pause reason
  const handleResume = useCallback(() => {
    if (managerPauseReason === 'browser-closed') {
      const confirmed = window.confirm(
        'The browser was closed. A new browser will open to continue approvals. Continue?'
      );
      if (!confirmed) return;
    }
    void resumeApprovals();
  }, [managerPauseReason, resumeApprovals]);

  return (
    <section className="sf-workflow-container">
      {/* Action Button */}
      {activeTask && activeAction && !isComplete && !isError && (
        <div className="sf-workflow-action-container">
          <WorkflowActionButton
            label={activeTask.buttonLabel}
            isProcessing={isProcessing}
            isPaused={isWorkflowPaused}
            progress={progress}
            onAction={() => { void activeAction(); }}
            disabled={!canProceed}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />
          {/* Missing requirements message */}
          {!canProceed && missingRequirementsText && (
            <p className="sf-workflow-requirements-warning">
              Requires {missingRequirementsText} connection
            </p>
          )}
          {/* Pause/Resume controls - visible during approval processing */}
          {stepName === 'approving' && (
            <div className="sf-workflow-pause-controls">
              {!isWorkflowPaused ? (
                <button
                  type="button"
                  className="sf-workflow-pause-btn"
                  onClick={() => { void pauseApprovals(); }}
                  title="Pause workflow between transactions"
                >
                  ⏸ Pause
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="sf-workflow-resume-btn"
                    onClick={handleResume}
                  >
                    ▶ Resume
                  </button>
                  {managerPauseReason === 'browser-closed' && (
                    <p className="sf-workflow-pause-message sf-workflow-pause-message--warning">
                      Browser was closed. Press Resume to re-open and continue.
                    </p>
                  )}
                  {managerPauseReason === 'tab-switch' && (
                    <p className="sf-workflow-pause-message sf-workflow-pause-message--info">
                      Paused due to tab switch.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <h3 className="sf-workflow-title">
        Manager Approval Workflow
      </h3>

      {/* Task Checklist */}
      <WorkflowChecklist tasks={checklistTasks} />

      {/* Completion Message */}
      {isComplete && (
        <WorkflowStatusMessage
          type="complete"
          message="Workflow Complete"
        />
      )}

      {/* Error Message */}
      {isError && errorMessage && (
        <WorkflowStatusMessage
          type="error"
          message={errorMessage}
        />
      )}

    </section>
  );
}
