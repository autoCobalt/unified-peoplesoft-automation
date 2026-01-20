/**
 * ManagerWorkflowSection Component
 *
 * Displays the 5-step Manager approval workflow:
 * 1. Prepare CI submissions
 * 2. Open browser
 * 3. Process approvals
 * 4. Submit position data
 * 5. Submit job data
 *
 * Features a progressive action button and prepared submission tables.
 * Uses shared workflow components for the checklist, button, and status messages.
 * Uses the DataTable component for displaying prepared CI submissions.
 */

import { useMemo } from 'react';
import { useSmartForm } from '../../../../context';
import type {
  ManagerWorkflowStepName,
  PreparedSubmission,
  WorkflowTask,
  ChecklistTask,
  ColumnDef,
} from '../../../../types';
import { useWorkflowState, useWorkflowTasks } from '../../../../hooks';
import {
  WorkflowActionButton,
  WorkflowChecklist,
  WorkflowStatusMessage,
} from '../../../workflow';
import { DataTable } from '../../../table';
import './ManagerWorkflowSection.css';

/** Step order for status calculation */
const STEP_ORDER: readonly ManagerWorkflowStepName[] = [
  'idle', 'preparing', 'prepared',
  'browser-opening', 'browser-open',
  'approving', 'approved',
  'submitting-position', 'submitting-job', 'complete',
];

/** Steps that indicate active processing */
const PROCESSING_STEPS = [
  'preparing', 'browser-opening', 'approving', 'submitting-position', 'submitting-job',
];

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
    processApprovals,
    submitPositionData,
    submitJobData,
    preparedPositionData,
    preparedJobData,
  } = useSmartForm();

  const { managerWorkflow } = state;

  // Define workflow tasks
  const tasks: WorkflowTask<ManagerWorkflowStepName>[] = useMemo(() => [
    {
      id: 'prepare',
      triggerStep: 'idle',
      completionStep: 'prepared',
      label: 'Prepare CI submissions',
      buttonLabel: 'Prepare Submissions',
      action: prepareSubmissions,
    },
    {
      id: 'browser',
      triggerStep: 'prepared',
      completionStep: 'browser-open',
      label: 'Open browser',
      buttonLabel: 'Open Browser',
      action: openBrowser,
    },
    {
      id: 'approvals',
      triggerStep: 'browser-open',
      completionStep: 'approved',
      label: 'Process approvals',
      buttonLabel: 'Process Approvals',
      action: processApprovals,
    },
    {
      id: 'position',
      triggerStep: 'approved',
      completionStep: 'submitting-job',
      label: 'Submit position data',
      buttonLabel: 'Submit CI_POSITION_DATA',
      action: submitPositionData,
    },
    {
      id: 'job',
      triggerStep: 'submitting-job',
      completionStep: 'complete',
      label: 'Submit job data',
      buttonLabel: 'Submit CI_JOB_DATA',
      action: submitJobData,
    },
  ], [prepareSubmissions, openBrowser, processApprovals, submitPositionData, submitJobData]);

  // Use workflow state hook
  const {
    stepName,
    isProcessing,
    isComplete,
    isError,
    errorMessage,
    progress,
  } = useWorkflowState({
    workflowStep: managerWorkflow,
    processingSteps: PROCESSING_STEPS,
  });

  // Use workflow tasks hook
  const { tasksWithStatus, activeTask } = useWorkflowTasks({
    currentStepName: stepName as ManagerWorkflowStepName,
    tasks,
    stepOrder: STEP_ORDER,
  });

  // Convert tasks to checklist format
  const checklistTasks: ChecklistTask[] = tasksWithStatus.map(t => ({
    id: t.id,
    label: t.label,
    status: t.status,
  }));

  // Column definitions for submission tables
  const submissionColumns = useSubmissionColumns();

  // Use prepared data from context (persists across workflow steps)
  const hasPreparedData = preparedPositionData.length > 0 || preparedJobData.length > 0;

  return (
    <section className="sf-workflow-container">
      <h3 className="sf-workflow-title">Manager Approval Workflow</h3>

      {/* Task Checklist */}
      <WorkflowChecklist tasks={checklistTasks} />

      {/* Action Button */}
      {activeTask && !isComplete && !isError && (
        <div className="sf-workflow-action-container">
          <WorkflowActionButton
            label={activeTask.buttonLabel}
            isProcessing={isProcessing}
            progress={progress}
            onAction={() => { void activeTask.action(); }}
          />
        </div>
      )}

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
