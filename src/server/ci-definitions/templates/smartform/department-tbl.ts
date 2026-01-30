/**
 * DEPARTMENT_TBL Usage Template for SmartForm
 *
 * DEPT_CO_UPDATE_CI — Updates department company assignment via UPDATEDATA.
 * SQL column: DEPT_CO_UPDATE_CI
 * 4 fields, 1 fixed (SETID='SHARE').
 *
 * The SETID is always 'SHARE' because departments use a shared set
 * across business units in this PeopleSoft configuration.
 */

import type { CIUsageTemplate, CITemplateField } from '../../types.js';

/* ==============================================
   DEPT_CO_UPDATE_CI Template (4 fields)
   ============================================== */

const DEPT_CO_UPDATE_FIELDS: readonly CITemplateField[] = [
  { name: 'SETID',   dbType: 'VARCHAR2', maxLength: 5,  isKey: true,  isRequired: true, defaultValue: 'SHARE' },
  { name: 'DEPTID',  dbType: 'VARCHAR2', maxLength: 10, isKey: true,  isRequired: true, defaultValue: null },
  { name: 'EFFDT',   dbType: 'DATE',     maxLength: 10, isKey: true,  isRequired: true, defaultValue: null },
  { name: 'COMPANY', dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: false, defaultValue: null },
] as const;

export const DEPT_CO_UPDATE_CI_TEMPLATE: CIUsageTemplate = {
  queryFieldName: 'DEPT_CO_UPDATE_CI',
  ciName: 'DEPARTMENT_TBL',
  allowedActions: ['UPDATEDATA'],
  defaultAction: 'UPDATEDATA',
  actionIsFixed: true,
  fields: DEPT_CO_UPDATE_FIELDS,
  description: 'Updates department company assignment in DEPARTMENT_TBL. SETID is always SHARE (shared set configuration).',
};
