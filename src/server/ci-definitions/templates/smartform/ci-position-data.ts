/**
 * CI_POSITION_DATA Usage Templates for SmartForm
 *
 * Two independent templates for the CI_POSITION_DATA Component Interface:
 *
 * 1. POSITION_CREATE_CI — Creates new positions (action: CREATE)
 *    SQL column: POSITION_CREATE_CI
 *    19 fields, 5 fixed (POSITION_NBR=00000000, EFF_STATUS=A, ACTION_REASON=NEW,
 *                         MAX_HEAD_COUNT=99, UPDATE_INCUMBENTS=Y)
 *
 * 2. POSITION_UPDATE_CI — Updates existing positions (action: UPDATE or UPDATEDATA)
 *    SQL column: POSITION_UPDATE_CI
 *    17 fields, 3 fixed (EFF_STATUS=A, ACTION_REASON=UPD, UPDATE_INCUMBENTS=Y)
 *
 * Each template is fully self-contained with its own field list.
 */

import type { CIUsageTemplate, CITemplateField } from '../../types.js';

/* ==============================================
   POSITION_CREATE_CI Template (19 fields)
   ============================================== */

const POSITION_CREATE_FIELDS: readonly CITemplateField[] = [
  { name: 'POSITION_NBR',     dbType: 'VARCHAR2', maxLength: 8,  isKey: true,  isRequired: true,  defaultValue: '00000000' },
  { name: 'EFFDT',            dbType: 'DATE',     maxLength: 10, isKey: true,  isRequired: true,  defaultValue: null },
  { name: 'EFF_STATUS',       dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: 'A' },
  { name: 'ACTION_REASON',    dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: false, defaultValue: 'NEW' },
  { name: 'BUSINESS_UNIT',    dbType: 'VARCHAR2', maxLength: 5,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'DEPTID',           dbType: 'VARCHAR2', maxLength: 10, isKey: false, isRequired: false, defaultValue: null },
  { name: 'JOBCODE',          dbType: 'VARCHAR2', maxLength: 6,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'MAX_HEAD_COUNT',   dbType: 'NUMBER',   maxLength: 4,  isKey: false, isRequired: false, defaultValue: '99' },
  { name: 'UPDATE_INCUMBENTS', dbType: 'VARCHAR2', maxLength: 1, isKey: false, isRequired: true,  defaultValue: 'Y' },
  { name: 'REPORTS_TO',       dbType: 'VARCHAR2', maxLength: 8,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'LOCATION',         dbType: 'VARCHAR2', maxLength: 10, isKey: false, isRequired: false, defaultValue: null },
  { name: 'MAIL_DROP',        dbType: 'VARCHAR2', maxLength: 50, isKey: false, isRequired: false, defaultValue: null },
  { name: 'COMPANY',          dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'STD_HOURS',        dbType: 'NUMBER',   maxLength: 6,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'UNION_CD',         dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'SHIFT',            dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'REG_TEMP',         dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'FULL_PART_TIME',   dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'INCLUDE_TITLE',    dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
] as const;

export const POSITION_CREATE_CI_TEMPLATE: CIUsageTemplate = {
  queryFieldName: 'POSITION_CREATE_CI',
  ciName: 'CI_POSITION_DATA',
  allowedActions: ['CREATE'],
  defaultAction: 'CREATE',
  actionIsFixed: true,
  fields: POSITION_CREATE_FIELDS,
  description: 'Creates a new position record in CI_POSITION_DATA with POSITION_NBR=00000000 (PeopleSoft auto-assigns).',
};

/* ==============================================
   POSITION_UPDATE_CI Template (17 fields)
   ============================================== */

const POSITION_UPDATE_FIELDS: readonly CITemplateField[] = [
  { name: 'POSITION_NBR',     dbType: 'VARCHAR2', maxLength: 8,  isKey: true,  isRequired: true,  defaultValue: null },
  { name: 'EFFDT',            dbType: 'DATE',     maxLength: 10, isKey: true,  isRequired: true,  defaultValue: null },
  { name: 'EFF_STATUS',       dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: 'A' },
  { name: 'ACTION_REASON',    dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: false, defaultValue: 'UPD' },
  { name: 'UPDATE_INCUMBENTS', dbType: 'VARCHAR2', maxLength: 1, isKey: false, isRequired: true,  defaultValue: 'Y' },
  { name: 'BUSINESS_UNIT',    dbType: 'VARCHAR2', maxLength: 5,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'DEPTID',           dbType: 'VARCHAR2', maxLength: 10, isKey: false, isRequired: false, defaultValue: null },
  { name: 'JOBCODE',          dbType: 'VARCHAR2', maxLength: 6,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'REPORTS_TO',       dbType: 'VARCHAR2', maxLength: 8,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'LOCATION',         dbType: 'VARCHAR2', maxLength: 10, isKey: false, isRequired: false, defaultValue: null },
  { name: 'COMPANY',          dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'STD_HOURS',        dbType: 'NUMBER',   maxLength: 6,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'UNION_CD',         dbType: 'VARCHAR2', maxLength: 3,  isKey: false, isRequired: false, defaultValue: null },
  { name: 'SHIFT',            dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'REG_TEMP',         dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'FULL_PART_TIME',   dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
  { name: 'INCLUDE_TITLE',    dbType: 'VARCHAR2', maxLength: 1,  isKey: false, isRequired: true,  defaultValue: null },
] as const;

export const POSITION_UPDATE_CI_TEMPLATE: CIUsageTemplate = {
  queryFieldName: 'POSITION_UPDATE_CI',
  ciName: 'CI_POSITION_DATA',
  allowedActions: ['UPDATE', 'UPDATEDATA'],
  defaultAction: 'UPDATE',
  actionIsFixed: false,
  fields: POSITION_UPDATE_FIELDS,
  description: 'Updates an existing position in CI_POSITION_DATA. Action varies: UPDATE (save immediately) or UPDATEDATA (batch).',
};
