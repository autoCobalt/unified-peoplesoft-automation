/**
 * SmartForm CI Template Registry
 *
 * Central registry of all CI usage templates for the SmartForm tab.
 * Maps SQL query column names to their template definitions.
 *
 * Each template defines:
 * - Which PeopleSoft CI it targets
 * - What SOAP action(s) are allowed
 * - Which fields are included and their types
 * - Which fields have fixed vs. dynamic values
 */

import type { CIUsageTemplate } from '../../types.js';
import { POSITION_CREATE_CI_TEMPLATE, POSITION_UPDATE_CI_TEMPLATE } from './ci-position-data.js';
import { JOB_UPDATE_CI_TEMPLATE } from './ci-job-data.js';
import { DEPT_CO_UPDATE_CI_TEMPLATE } from './department-tbl.js';

/* ==============================================
   Template Registry
   ============================================== */

/**
 * All SmartForm CI templates keyed by SQL column name.
 *
 * Usage: CI_TEMPLATE_REGISTRY['POSITION_CREATE_CI'] → template definition
 */
export const CI_TEMPLATE_REGISTRY: Record<string, CIUsageTemplate> = {
  POSITION_CREATE_CI: POSITION_CREATE_CI_TEMPLATE,
  POSITION_UPDATE_CI: POSITION_UPDATE_CI_TEMPLATE,
  JOB_UPDATE_CI: JOB_UPDATE_CI_TEMPLATE,
  DEPT_CO_UPDATE_CI: DEPT_CO_UPDATE_CI_TEMPLATE,
};

/**
 * CI field names as a const tuple for type-safe iteration.
 * These match the SQL query column names from smartform-pending-transactions.sql.
 */
export const CI_FIELD_NAMES = [
  'POSITION_CREATE_CI',
  'POSITION_UPDATE_CI',
  'JOB_UPDATE_CI',
  'DEPT_CO_UPDATE_CI',
] as const;

/** Union type of all CI field names */
export type CIFieldName = typeof CI_FIELD_NAMES[number];

/* ==============================================
   Re-exports
   ============================================== */

export {
  POSITION_CREATE_CI_TEMPLATE,
  POSITION_UPDATE_CI_TEMPLATE,
} from './ci-position-data.js';

export { JOB_UPDATE_CI_TEMPLATE } from './ci-job-data.js';
export { DEPT_CO_UPDATE_CI_TEMPLATE } from './department-tbl.js';
