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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSmartFormStore, selectEffectiveRecordCounts, useConnectionStore } from '../../../../stores';
import type { ChecklistTask } from '../../../../types';
import { useWorkflowDefinition } from '../../../../hooks';
import type { ActionMap, RequirementStatus } from '../../../../workflows';
import { managerWorkflowDefinition } from '../../../../workflows';
import {
  WorkflowActionButton,
  WorkflowChecklist,
  WorkflowStatusMessage,
} from '../../../workflow';
import { getProgress } from '../../../../utils/workflow/workflowHelpers';
import './ManagerWorkflowSection.css';

export function ManagerWorkflowSection() {
  const managerWorkflow = useSmartFormStore(s => s.managerWorkflow);
  const isWorkflowPaused = useSmartFormStore(s => s.isWorkflowPaused);
  const managerPauseReason = useSmartFormStore(s => s.managerPauseReason);
  const openBrowser = useSmartFormStore(s => s.openBrowser);
  const pauseApprovals = useSmartFormStore(s => s.pauseApprovals);
  const resumeApprovals = useSmartFormStore(s => s.resumeApprovals);
  const submitDeptCoData = useSmartFormStore(s => s.submitDeptCoData);
  const submitPositionData = useSmartFormStore(s => s.submitPositionData);
  const submitJobData = useSmartFormStore(s => s.submitJobData);
  const effectiveRecordCounts = useSmartFormStore(useShallow(selectEffectiveRecordCounts));

  // Cross-workflow: read Other workflow state for progress display
  const otherWorkflow = useSmartFormStore(s => s.otherWorkflow);
  const isOtherPaused = useSmartFormStore(s => s.isOtherWorkflowPaused);
  const crossProgress = getProgress(otherWorkflow);
  const isCrossWorkflowActive = crossProgress !== null && !crossProgress.isComplete;

  const soapState = useConnectionStore(s => s.soapState);
  const setOracleHintActive = useConnectionStore(s => s.setOracleHintActive);
  const setSoapHintActive = useConnectionStore(s => s.setSoapHintActive);

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

  // Ref for reading overrides without re-triggering effects on checkbox changes.
  // Auto-skip should only fire on step transitions (including mount), not when
  // the user unchecks rows causing record counts to drop to 0.
  const overridesRef = useRef(taskCompletionOverrides);
  useEffect(() => {
    overridesRef.current = taskCompletionOverrides;
  }, [taskCompletionOverrides]);

  // Auto-skip steps when no selected records exist for that CI type.
  // Each fires the submit function which handles the empty case internally
  // (transitions to the next step with total=0). Uses overridesRef to read
  // the latest checkbox state without being a dependency.
  useEffect(() => {
    if (stepName === 'approved' && overridesRef.current['dept-co']) {
      void submitDeptCoData();
    }
  }, [stepName, submitDeptCoData]);

  useEffect(() => {
    if (stepName === 'submitting-position' && overridesRef.current['position']) {
      void submitPositionData();
    }
  }, [stepName, submitPositionData]);

  useEffect(() => {
    if (stepName === 'submitting-job' && overridesRef.current['job']) {
      void submitJobData();
    }
  }, [stepName, submitJobData]);

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
          {isCrossWorkflowActive ? (
            <WorkflowActionButton
              label="Other Workflow"
              isProcessing={!isOtherPaused}
              isPaused={isOtherPaused}
              progress={crossProgress}
              onAction={() => undefined}
              disabled
            />
          ) : (
            <>
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
            </>
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
