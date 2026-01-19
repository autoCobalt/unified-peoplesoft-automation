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
 */

import { motion } from 'framer-motion';
import { useSmartForm } from '../../../../context';
import type { ManagerWorkflowStepName, PreparedSubmission } from '../../../../types';
import {
  staggerContainer,
  staggerItem,
  buttonInteraction,
} from '../../../../utils/motion';
import './ManagerWorkflowSection.css';

/** Workflow task configuration */
interface WorkflowTask {
  step: ManagerWorkflowStepName;
  label: string;
  buttonLabel: string;
  action: () => Promise<void>;
}

/** Get status class for submission badge */
function getSubmissionStatusClass(status: PreparedSubmission['status']): string {
  const classMap: Record<PreparedSubmission['status'], string> = {
    pending: 'sf-workflow-sub-status--pending',
    submitting: 'sf-workflow-sub-status--submitting',
    success: 'sf-workflow-sub-status--success',
    error: 'sf-workflow-sub-status--error',
  };
  return classMap[status];
}

export function ManagerWorkflowSection() {
  const {
    state,
    prepareSubmissions,
    openBrowser,
    processApprovals,
    submitPositionData,
    submitJobData,
    getStepProgress,
  } = useSmartForm();

  const { managerWorkflow } = state;
  const currentStep = managerWorkflow.step;

  // Define the workflow tasks
  const tasks: WorkflowTask[] = [
    { step: 'prepared', label: 'Prepare CI submissions', buttonLabel: 'Prepare Submissions', action: prepareSubmissions },
    { step: 'browser-open', label: 'Open browser', buttonLabel: 'Open Browser', action: openBrowser },
    { step: 'approved', label: 'Process approvals', buttonLabel: 'Process Approvals', action: processApprovals },
    { step: 'submitting-position', label: 'Submit position data', buttonLabel: 'Submit CI_POSITION_DATA', action: submitPositionData },
    { step: 'complete', label: 'Submit job data', buttonLabel: 'Submit CI_JOB_DATA', action: submitJobData },
  ];

  // Determine which step index we're at
  const stepOrder: ManagerWorkflowStepName[] = [
    'idle', 'preparing', 'prepared',
    'browser-opening', 'browser-open',
    'approving', 'approved',
    'submitting-position', 'submitting-job', 'complete',
  ];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  // Determine task status based on position in workflow
  // taskCompletionSteps maps each task index to the step that marks it as complete
  const taskCompletionSteps: ManagerWorkflowStepName[] = [
    'prepared',        // Task 0: "Prepare CI submissions" completes at 'prepared'
    'browser-open',    // Task 1: "Open browser" completes at 'browser-open'
    'approved',        // Task 2: "Process approvals" completes at 'approved'
    'submitting-job',  // Task 3: "Submit position data" completes when job submission starts
    'complete',        // Task 4: "Submit job data" completes at 'complete'
  ];

  const getTaskStatus = (taskIndex: number): 'completed' | 'active' | 'pending' => {
    const taskStepIndex = stepOrder.indexOf(taskCompletionSteps[taskIndex]);

    if (currentStepIndex >= taskStepIndex) return 'completed';
    if (currentStepIndex === taskStepIndex - 1 ||
        (taskIndex === 0 && currentStep === 'idle') ||
        (taskIndex === 0 && currentStep === 'preparing')) return 'active';
    return 'pending';
  };

  // Get current action button info
  const getActiveTask = (): WorkflowTask | null => {
    if (currentStep === 'idle') return tasks[0];
    if (currentStep === 'prepared') return tasks[1];
    if (currentStep === 'browser-open') return tasks[2];
    if (currentStep === 'approved') return tasks[3];
    if (currentStep === 'submitting-position' || currentStepIndex >= stepOrder.indexOf('submitting-position')) {
      // Check if position data is done
      if (currentStep === 'submitting-job' || currentStepIndex < stepOrder.indexOf('complete')) {
        return tasks[4];
      }
    }
    return null;
  };

  const activeTask = getActiveTask();
  const progress = getStepProgress('manager');

  // Check if actively processing (not just step name, but also if loop is ongoing)
  // For loop steps, processing is complete when current === total
  const loopSteps = ['approving', 'submitting-position', 'submitting-job'];
  const isInLoopStep = loopSteps.includes(currentStep);
  const isLoopComplete = progress !== null && progress.current === progress.total;
  const isProcessing =
    ['preparing', 'browser-opening'].includes(currentStep) ||
    (isInLoopStep && !isLoopComplete);

  // Get prepared data from workflow state
  const positionData = managerWorkflow.step === 'prepared' ? managerWorkflow.positionData : [];
  const jobData = managerWorkflow.step === 'prepared' ? managerWorkflow.jobData : [];
  const hasPreparedData = positionData.length > 0 || jobData.length > 0;

  return (
    <section className="sf-workflow-container">
      <h3 className="sf-workflow-title">Manager Approval Workflow</h3>

      {/* Task Checklist */}
      <motion.ol
        className="sf-workflow-checklist"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {tasks.map((task, index) => {
          const status = getTaskStatus(index);
          return (
            <motion.li
              key={task.step}
              className={`sf-workflow-task sf-workflow-task--${status}`}
              variants={staggerItem}
            >
              <span className="sf-workflow-task-indicator">
                {status === 'completed' ? (
                  <svg viewBox="0 0 24 24" fill="none" className="sf-workflow-check-icon">
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="sf-workflow-task-number">{index + 1}</span>
                )}
              </span>
              <span className="sf-workflow-task-label">{task.label}</span>
            </motion.li>
          );
        })}
      </motion.ol>

      {/* Action Button */}
      {activeTask && currentStep !== 'complete' && currentStep !== 'error' && (
        <div className="sf-workflow-action-container">
          <motion.button
            className={`sf-workflow-action-button ${isProcessing ? 'sf-workflow-action-button--processing' : ''}`}
            onClick={() => { void activeTask.action(); }}
            disabled={isProcessing}
            {...buttonInteraction}
          >
            {isProcessing ? (
              <>
                <span className="sf-workflow-spinner" />
                {progress ? `Processing ${String(progress.current)}/${String(progress.total)}...` : 'Processing...'}
              </>
            ) : (
              activeTask.buttonLabel
            )}
          </motion.button>
        </div>
      )}

      {/* Completion Message */}
      {currentStep === 'complete' && (
        <motion.div
          className="sf-workflow-complete"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="sf-workflow-complete-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Workflow Complete</span>
        </motion.div>
      )}

      {/* Error Message */}
      {currentStep === 'error' && (
        <motion.div
          className="sf-workflow-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="sf-workflow-error-icon">!</span>
          <span>{managerWorkflow.message}</span>
        </motion.div>
      )}

      {/* Prepared Submission Tables */}
      {hasPreparedData && (
        <div className="sf-workflow-submissions">
          {/* CI_POSITION_DATA Table */}
          {positionData.length > 0 && (
            <div className="sf-workflow-sub-table-container">
              <h4 className="sf-workflow-sub-table-title">CI_POSITION_DATA</h4>
              <table className="sf-workflow-sub-table">
                <thead>
                  <tr>
                    <th>Emplid</th>
                    <th>Employee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {positionData.map(sub => (
                    <tr key={sub.id}>
                      <td className="sf-workflow-sub-cell-mono">{sub.emplid}</td>
                      <td>{sub.employeeName}</td>
                      <td>
                        <span className={`sf-workflow-sub-status ${getSubmissionStatusClass(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CI_JOB_DATA Table */}
          {jobData.length > 0 && (
            <div className="sf-workflow-sub-table-container">
              <h4 className="sf-workflow-sub-table-title">CI_JOB_DATA</h4>
              <table className="sf-workflow-sub-table">
                <thead>
                  <tr>
                    <th>Emplid</th>
                    <th>Employee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobData.map(sub => (
                    <tr key={sub.id}>
                      <td className="sf-workflow-sub-cell-mono">{sub.emplid}</td>
                      <td>{sub.employeeName}</td>
                      <td>
                        <span className={`sf-workflow-sub-status ${getSubmissionStatusClass(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
