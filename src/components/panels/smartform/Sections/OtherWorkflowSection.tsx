/**
 * OtherWorkflowSection Component
 *
 * Displays the 3-task Other approval workflow:
 * 1. Submit DEPARTMENT_TBL (auto-skipped if no records)
 * 2. Submit POSITION_CREATE_CI
 * 3. Process Approvals (browser automation with pause/resume)
 *
 * CI data is auto-parsed during query execution — no manual prepare step.
 * Submission status is displayed in the CI preview tables (DataTableSection).
 * Uses shared workflow components for the checklist, button, and status messages.
 *
 * Uses the definition-driven workflow system from src/workflows/.
 */

import { useEffect, useMemo } from 'react';
import { useSmartForm, useConnection } from '../../../../context';
import type { ChecklistTask } from '../../../../types';
import { useWorkflowDefinition } from '../../../../hooks';
import type { ActionMap, RequirementStatus } from '../../../../workflows';
import { otherWorkflowDefinition } from '../../../../workflows';
import {
  WorkflowActionButton,
  WorkflowChecklist,
  WorkflowStatusMessage,
} from '../../../workflow';
import './OtherWorkflowSection.css';

export function OtherWorkflowSection() {
  const {
    state,
    submitOtherDeptCoData,
    submitPositionCreateData,
    openOtherBrowser,
    pauseOtherApprovals,
    resumeOtherApprovals,
    isOtherWorkflowPaused,
    effectiveRecordCounts,
  } = useSmartForm();

  const {
    soapState,
    setOracleHintActive,
    setSoapHintActive,
  } = useConnection();

  const { otherWorkflow, queryResults } = state;
  const otherCount = queryResults?.otherCount ?? 0;

  // Action map connects task IDs to context-provided actions
  const actionMap: ActionMap = useMemo(() => ({
    'other-dept-co': submitOtherDeptCoData,
    'other-position-create': submitPositionCreateData,
    'other-approvals': openOtherBrowser,
  }), [submitOtherDeptCoData, submitPositionCreateData, openOtherBrowser]);

  // Build requirement status from connection states
  const requirementStatus: RequirementStatus = useMemo(() => ({
    soap: soapState.isConnected,
  }), [soapState.isConnected]);

  // Pre-complete tasks that have no submittable records (selected + non-duplicate).
  const taskCompletionOverrides = useMemo(() => ({
    'other-dept-co': effectiveRecordCounts.otherDeptCo === 0,
    'other-position-create': effectiveRecordCounts.positionCreate === 0,
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
    definition: otherWorkflowDefinition,
    workflowStep: otherWorkflow,
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

  // Hint handlers - activate hints for missing connection requirements
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
  // The 'idle' step guard needs hasQueried since idle is the initial state —
  // without it, the effect would fire on mount before any query runs.
  useEffect(() => {
    if (stepName === 'idle' && state.hasQueried && taskCompletionOverrides['other-dept-co']) {
      void submitOtherDeptCoData();
    }
  }, [stepName, state.hasQueried, taskCompletionOverrides, submitOtherDeptCoData]);

  useEffect(() => {
    if (stepName === 'submitting-position-create' && taskCompletionOverrides['other-position-create']) {
      void submitPositionCreateData();
    }
  }, [stepName, taskCompletionOverrides, submitPositionCreateData]);

  // Don't render if no other records and workflow is idle
  if (otherCount === 0 && stepName === 'idle') {
    return (
      <section className="sf-workflow-container">
        <WorkflowStatusMessage
          type="empty"
          message="No Other transactions pending"
        />
      </section>
    );
  }

  return (
    <section className="sf-workflow-container">
      {/* Action Button */}
      {activeTask && activeAction && !isComplete && !isError && (
        <div className="sf-workflow-action-container">
          <WorkflowActionButton
            label={activeTask.buttonLabel}
            isProcessing={isProcessing}
            isPaused={isOtherWorkflowPaused}
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
              {!isOtherWorkflowPaused ? (
                <button
                  type="button"
                  className="sf-workflow-pause-btn"
                  onClick={() => { void pauseOtherApprovals(); }}
                  title="Pause workflow between transactions"
                >
                  ⏸ Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="sf-workflow-resume-btn"
                  onClick={() => { void resumeOtherApprovals(); }}
                >
                  ▶ Resume
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <h3 className="sf-workflow-title">
        Other Approval Workflow
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
