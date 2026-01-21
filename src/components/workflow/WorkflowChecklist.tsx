/**
 * WorkflowChecklist Component
 *
 * Displays a visual checklist of workflow tasks with status indicators.
 * Uses staggered animations for a cascading reveal effect.
 *
 * @example
 * <WorkflowChecklist
 *   tasks={[
 *     { id: 'prepare', label: 'Prepare submissions', status: 'completed' },
 *     { id: 'process', label: 'Process approvals', status: 'active' },
 *     { id: 'submit', label: 'Submit data', status: 'pending' },
 *   ]}
 *   className="sf-workflow"
 * />
 */

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../utils/motion';
import type { WorkflowChecklistProps, TaskStatus } from '../../types/workflow';
import { CheckIcon } from '../icons';
import './WorkflowChecklist.css';

/** Get appropriate aria label for task status */
function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Pending',
    active: 'In progress',
    completed: 'Completed',
  };
  return labels[status];
}

export function WorkflowChecklist({
  tasks,
  className = '',
}: WorkflowChecklistProps) {
  return (
    <motion.ol
      className={`wf-checklist ${className}`.trim()}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      role="list"
      aria-label="Workflow tasks"
    >
      {tasks.map((task, index) => (
        <motion.li
          key={task.id}
          className={`wf-checklist-task wf-checklist-task--${task.status}`}
          variants={staggerItem}
          aria-label={`${task.label}: ${getStatusLabel(task.status)}`}
        >
          <span className="wf-checklist-indicator" aria-hidden="true">
            {task.status === 'completed' ? (
              <CheckIcon className="wf-checklist-check-icon" />
            ) : (
              <span className="wf-checklist-number">{index + 1}</span>
            )}
          </span>
          <span className="wf-checklist-label">{task.label}</span>
        </motion.li>
      ))}
    </motion.ol>
  );
}
