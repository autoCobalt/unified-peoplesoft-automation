/**
 * Workflows Barrel Export
 *
 * This module provides the workflow definition system:
 * - Type definitions for creating workflows
 * - Pre-built workflow definitions for SmartForm
 *
 * Usage:
 * ```tsx
 * import { managerWorkflowDefinition, type WorkflowDefinition } from '../workflows';
 * ```
 */

// Types
export type {
  StepProcessingBehavior,
  StepConfig,
  TaskConfig,
  WorkflowDefinition,
  ExtractStepNames,
  ActionMap,
  UseWorkflowDefinitionOptions,
  WorkflowActionConfig,
  UseWorkflowActionsOptions,
  RequirementType,
  RequirementStatus,
} from './types';

// Definitions
export {
  // Manager workflow
  managerWorkflowDefinition,
  MANAGER_STEPS,
  MANAGER_TASKS,
  MANAGER_STEP_ORDER,
  MANAGER_PROCESSING_STEPS,
  // Other workflow
  otherWorkflowDefinition,
  OTHER_STEPS,
  OTHER_TASKS,
  OTHER_STEP_ORDER,
  OTHER_PROCESSING_STEPS,
} from './definitions';
