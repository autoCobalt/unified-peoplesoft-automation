/**
 * CI_JOB_DATA Usage Template for SmartForm
 *
 * JOB_UPDATE_CI — Updates job data records via UPDATEDATA action.
 * SQL column: JOB_UPDATE_CI
 * 5 fields, all dynamic (no fixed values).
 *
 * This template uses KEYPROP_ prefixed fields for key properties and
 * PROP_ prefix for regular properties, following PeopleSoft's CI naming
 * convention for CI_JOB_DATA which uses explicit key/prop prefixes.
 */

import type { CIUsageTemplate, CITemplateField } from '../../types.js';

/* ==============================================
   JOB_UPDATE_CI Template (5 fields)
   ============================================== */

const JOB_UPDATE_FIELDS: readonly CITemplateField[] = [
  { name: 'KEYPROP_EMPLID',       dbType: 'VARCHAR2', maxLength: 11, isKey: true,  isRequired: true, defaultValue: null },
  { name: 'KEYPROP_EMPL_RCD',     dbType: 'NUMBER',   maxLength: 3,  isKey: true,  isRequired: true, defaultValue: null },
  { name: 'KEYPROP_EFFDT',        dbType: 'DATE',     maxLength: 10, isKey: true,  isRequired: true, defaultValue: null },
  { name: 'KEYPROP_EFFSEQ',       dbType: 'NUMBER',   maxLength: 3,  isKey: true,  isRequired: true, defaultValue: null },
  { name: 'PROP_POSITION_NBR',    dbType: 'VARCHAR2', maxLength: 8,  isKey: false, isRequired: true, defaultValue: null },
] as const;

export const JOB_UPDATE_CI_TEMPLATE: CIUsageTemplate = {
  queryFieldName: 'JOB_UPDATE_CI',
  ciName: 'CI_JOB_DATA',
  allowedActions: ['UPDATEDATA'],
  defaultAction: 'UPDATEDATA',
  actionIsFixed: true,
  fields: JOB_UPDATE_FIELDS,
  description: 'Updates job data in CI_JOB_DATA to link an employee record to a position number via UPDATEDATA.',
};
