/**
 * ManagerWorkflowSection Component
 *
 * Displays the 4-step Manager approval workflow:
 * 1. Prepare CI submissions
 * 2. Process approvals (browser opens automatically)
 * 3. Submit position data
 * 4. Submit job data
 *
 * Features a progressive action button and prepared submission tables.
 * Uses shared workflow components for the checklist, button, and status messages.
 * Uses the DataTable component for displaying prepared CI submissions.
 *
 * Uses the new definition-driven workflow system from src/workflows/.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSmartForm, useConnection } from '../../../../context';
import type {
  PreparedSubmission,
  ChecklistTask,
  ColumnDef,
} from '../../../../types';
import { useWorkflowDefinition } from '../../../../hooks';
import type { ActionMap, RequirementStatus } from '../../../../workflows';
import { managerWorkflowDefinition } from '../../../../workflows';
import { slideUpFadeInstantExit } from '../../../../utils';
import {
  WorkflowActionButton,
  WorkflowChecklist,
  WorkflowStatusMessage,
} from '../../../workflow';
import { DataTable } from '../../../table';
import './ManagerWorkflowSection.css';

/**
 * Column definitions for prepared submission tables.
 * Memoized to prevent unnecessary re-renders.
 */
function useSubmissionColumns(): ColumnDef<PreparedSubmission>[] {
  return useMemo(() => [
    {
      id: 'emplid',
      header: 'Emplid',
      accessor: 'emplid',
      type: 'mono',
    },
    {
      id: 'employeeName',
      header: 'Employee',
      accessor: 'employeeName',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      type: 'status',
      statusClassMap: {
        pending: 'pending',
        submitting: 'processing',
        success: 'success',
        error: 'error',
      },
    },
  ], []);
}

export function ManagerWorkflowSection() {
  const {
    state,
    prepareSubmissions,
    openBrowser,
    pauseApprovals,
    resumeApprovals,
    submitPositionData,
    submitJobData,
    preparedPositionData,
    preparedJobData,
    isWorkflowPaused,
  } = useSmartForm();

  const { soapState } = useConnection();

  const { managerWorkflow } = state;

  // Action map connects task IDs to context-provided actions
  // This keeps action logic in the context provider while definitions stay pure
  const actionMap: ActionMap = useMemo(() => ({
    prepare: prepareSubmissions,
    approvals: openBrowser,
    position: submitPositionData,
    job: submitJobData,
  }), [prepareSubmissions, openBrowser, submitPositionData, submitJobData]);

  // Build requirement status from connection states
  const requirementStatus: RequirementStatus = useMemo(() => ({
    soap: soapState.isConnected,
    // Add other requirements as needed:
    // oracle: oracleState.isConnected,
    // browser: browserState.isConnected,
  }), [soapState.isConnected]);

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

  // Column definitions for submission tables
  const submissionColumns = useSubmissionColumns();

  // Use prepared data from context (persists across workflow steps)
  const hasPreparedData = preparedPositionData.length > 0 || preparedJobData.length > 0;

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
          />
          {/* Missing requirements message */}
          {!canProceed && missingRequirementsText && (
            <p className="sf-workflow-requirements-warning">
              Requires {missingRequirementsText} connection
            </p>
          )}
          {/* Pause/Resume controls - visible at prepared step (disabled) and approving step (enabled) */}
          {(stepName === 'prepared' || stepName === 'approving') && (
            <div className="sf-workflow-pause-controls">
              {!isWorkflowPaused ? (
                <button
                  type="button"
                  className="sf-workflow-pause-btn"
                  onClick={() => { void pauseApprovals(); }}
                  disabled={stepName === 'prepared'}
                  title={stepName === 'prepared' ? 'Pause will be available during approval processing' : 'Pause workflow between transactions'}
                >
                  ⏸ Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="sf-workflow-resume-btn"
                  onClick={() => { void resumeApprovals(); }}
                >
                  ▶ Resume
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <motion.h3
        className="sf-workflow-title"
        {...slideUpFadeInstantExit}
      >
        Manager Approval Workflow
      </motion.h3>

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

      {/* Prepared Submission Tables (using DataTable component) */}
      {hasPreparedData && (
        <div className="sf-workflow-submissions">
          {/* CI_POSITION_DATA Table */}
          {preparedPositionData.length > 0 && (
            <div className="sf-workflow-sub-table-container">
              <h4 className="sf-workflow-sub-table-title">CI_POSITION_DATA</h4>
              <DataTable
                className="sf-workflow-sub-table"
                columns={submissionColumns}
                data={preparedPositionData}
                keyAccessor="id"
                emptyMessage="No position data"
                ariaLabel="CI_POSITION_DATA submissions"
              />
            </div>
          )}

          {/* CI_JOB_DATA Table */}
          {preparedJobData.length > 0 && (
            <div className="sf-workflow-sub-table-container">
              <h4 className="sf-workflow-sub-table-title">CI_JOB_DATA</h4>
              <DataTable
                className="sf-workflow-sub-table"
                columns={submissionColumns}
                data={preparedJobData}
                keyAccessor="id"
                emptyMessage="No job data"
                ariaLabel="CI_JOB_DATA submissions"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
