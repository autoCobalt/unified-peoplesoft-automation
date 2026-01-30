  /*
 * @sql-meta
 * name: smartform-pending-transactions
 * description: Retrieves all pending CI transactions awaiting approval. Results are used to populate the SmartForm data table.
 * author: System
 * version: 1.1.0
 * category: smartform
 * created: 2025-01-24
 * modified: 2026-01-30
 *
 * @returns
 * - TRANSACTION_NBR: VARCHAR2 - Unique transaction identifier
 * - MGR_CUR: NUMBER - Manager current flag (1 = Manager, 0 = Other)
 * - EMPLID: VARCHAR2 - Employee ID
 * - EMPL_RCD: NUMBER - Employee record number
 * - EMPLOYEE_NAME: VARCHAR2 - Full employee name
 * - NEW_EFFDT: DATE - New effective date (Oracle date, DD-MMM-YY)
 * - CUR_EFFDT: DATE - Current effective date (Oracle date, DD-MMM-YY)
 * - CUR_POS: VARCHAR2 - Current position number
 * - POSITION_CREATE_CI: VARCHAR2 - Pipe-delimited CI string for position creation (nullable)
 * - POSITION_UPDATE_CI: VARCHAR2 - Pipe-delimited CI string for position update (nullable)
 * - JOB_UPDATE_CI: VARCHAR2 - Pipe-delimited CI string for job data update (nullable)
 * - DEPT_CO_UPDATE_CI: VARCHAR2 - Pipe-delimited CI string for department company update (nullable)
 * - FIELD_DIFFERENCES: VARCHAR2 - Field differences description (nullable)
 * - WEB_LINK: VARCHAR2 - Full URL for transaction hyperlink
 *
 * @tags
 * - smartform
 * - transactions
 * - approval
 *
 * @notes
 * CI string format: ACTION|CI_NAME|FIELD1:VALUE1|FIELD2:VALUE2|...
 *
 * POSITION_CREATE_CI (19 fields):
 *   CREATE|CI_POSITION_DATA|POSITION_NBR:00000000|EFFDT:{val}|EFF_STATUS:A|ACTION_REASON:NEW|
 *   BUSINESS_UNIT:{val}|DEPTID:{val}|JOBCODE:{val}|MAX_HEAD_COUNT:99|UPDATE_INCUMBENTS:Y|
 *   REPORTS_TO:{val}|LOCATION:{val}|MAIL_DROP:{val}|COMPANY:{val}|STD_HOURS:{val}|
 *   UNION_CD:{val}|SHIFT:{val}|REG_TEMP:{val}|FULL_PART_TIME:{val}|INCLUDE_TITLE:{val}
 *   Fixed: POSITION_NBR=00000000, EFF_STATUS=A, ACTION_REASON=NEW, MAX_HEAD_COUNT=99, UPDATE_INCUMBENTS=Y
 *
 * POSITION_UPDATE_CI (17 fields):
 *   {ACTION}|CI_POSITION_DATA|POSITION_NBR:{val}|EFFDT:{val}|EFF_STATUS:A|ACTION_REASON:UPD|
 *   UPDATE_INCUMBENTS:Y|BUSINESS_UNIT:{val}|DEPTID:{val}|JOBCODE:{val}|REPORTS_TO:{val}|
 *   LOCATION:{val}|COMPANY:{val}|STD_HOURS:{val}|UNION_CD:{val}|SHIFT:{val}|REG_TEMP:{val}|
 *   FULL_PART_TIME:{val}|INCLUDE_TITLE:{val}
 *   Fixed: EFF_STATUS=A, ACTION_REASON=UPD, UPDATE_INCUMBENTS=Y
 *
 * JOB_UPDATE_CI (5 fields):
 *   UPDATEDATA|CI_JOB_DATA|KEYPROP_EMPLID:{val}|KEYPROP_EMPL_RCD:{val}|
 *   KEYPROP_EFFDT:{val}|KEYPROP_EFFSEQ:{val}|PROP_POSITION_NBR:{val}
 *   Fixed: Action=UPDATEDATA, CI=CI_JOB_DATA
 *
 * DEPT_CO_UPDATE_CI (4 fields):
 *   UPDATEDATA|DEPARTMENT_TBL|SETID:SHARE|DEPTID:{val}|EFFDT:{val}|COMPANY:{val}
 *   Fixed: Action=UPDATEDATA, CI=DEPARTMENT_TBL, SETID=SHARE
 *
 * PLACEHOLDER: Replace subquery source with actual production tables.
 * The WHERE 1 = 0 clause ensures no rows are returned until the query is updated.
 * @end-sql-meta
 */
select
    a.transaction_nbr
  , a.mgr_cur
  , a.emplid
  , a.empl_rcd
  , a.employee_name
  , a.new_effdt
  , a.cur_effdt
  , a.cur_pos
  , a.position_create_ci
  , a.position_update_ci
  , a.job_update_ci
  , a.dept_co_update_ci
  , a.field_differences
  , a.web_link
from
  (
    select
      -- === POSITION_CREATE_CI (19 fields) ===
      -- Creates a new position: POSITION_NBR=00000000 (PeopleSoft auto-assigns)
              'CREATE|CI_POSITION_DATA'
      || '|' || 'POSITION_NBR:'      || '00000000'
      || '|' || 'EFFDT:'             || PLACEHOLDER
      || '|' || 'EFF_STATUS:'        || 'A'
      || '|' || 'ACTION_REASON:'     || 'NEW'
      || '|' || 'BUSINESS_UNIT:'     || PLACEHOLDER
      || '|' || 'DEPTID:'            || PLACEHOLDER
      || '|' || 'JOBCODE:'           || PLACEHOLDER
      || '|' || 'MAX_HEAD_COUNT:'    || '99'
      || '|' || 'UPDATE_INCUMBENTS:' || 'Y'
      || '|' || 'REPORTS_TO:'        || PLACEHOLDER
      || '|' || 'LOCATION:'          || PLACEHOLDER
      || '|' || 'MAIL_DROP:'         || PLACEHOLDER
      || '|' || 'COMPANY:'           || PLACEHOLDER
      || '|' || 'STD_HOURS:'         || PLACEHOLDER
      || '|' || 'UNION_CD:'          || PLACEHOLDER
      || '|' || 'SHIFT:'             || PLACEHOLDER
      || '|' || 'REG_TEMP:'          || PLACEHOLDER
      || '|' || 'FULL_PART_TIME:'    || PLACEHOLDER
      || '|' || 'INCLUDE_TITLE:'     || PLACEHOLDER
        position_create_ci

      -- === POSITION_UPDATE_CI (17 fields) ===
      -- Updates existing position: action varies (UPDATE or UPDATEDATA)
    ,         PLACEHOLDER || '|CI_POSITION_DATA'
      || '|' || 'POSITION_NBR:'      || PLACEHOLDER
      || '|' || 'EFFDT:'             || PLACEHOLDER
      || '|' || 'EFF_STATUS:'        || 'A'
      || '|' || 'ACTION_REASON:'     || 'UPD'
      || '|' || 'UPDATE_INCUMBENTS:' || 'Y'
      || '|' || 'BUSINESS_UNIT:'     || PLACEHOLDER
      || '|' || 'DEPTID:'            || PLACEHOLDER
      || '|' || 'JOBCODE:'           || PLACEHOLDER
      || '|' || 'REPORTS_TO:'        || PLACEHOLDER
      || '|' || 'LOCATION:'          || PLACEHOLDER
      || '|' || 'COMPANY:'           || PLACEHOLDER
      || '|' || 'STD_HOURS:'         || PLACEHOLDER
      || '|' || 'UNION_CD:'          || PLACEHOLDER
      || '|' || 'SHIFT:'             || PLACEHOLDER
      || '|' || 'REG_TEMP:'          || PLACEHOLDER
      || '|' || 'FULL_PART_TIME:'    || PLACEHOLDER
      || '|' || 'INCLUDE_TITLE:'     || PLACEHOLDER
        position_update_ci

      -- === JOB_UPDATE_CI (5 fields) ===
      -- Updates job data: links employee record to position via UPDATEDATA
    ,         'UPDATEDATA|CI_JOB_DATA'
      || '|' || 'KEYPROP_EMPLID:'    || PLACEHOLDER
      || '|' || 'KEYPROP_EMPL_RCD:'  || PLACEHOLDER
      || '|' || 'KEYPROP_EFFDT:'     || PLACEHOLDER
      || '|' || 'KEYPROP_EFFSEQ:'    || PLACEHOLDER
      || '|' || 'PROP_POSITION_NBR:' || PLACEHOLDER
        job_update_ci

      -- === DEPT_CO_UPDATE_CI (4 fields) ===
      -- Updates department company: SETID always SHARE (shared set)
    ,         'UPDATEDATA|DEPARTMENT_TBL'
      || '|' || 'SETID:'   || 'SHARE'
      || '|' || 'DEPTID:'  || PLACEHOLDER
      || '|' || 'EFFDT:'   || PLACEHOLDER
      || '|' || 'COMPANY:' || PLACEHOLDER
        dept_co_update_ci

    from
      dual
    where 1 = 0
  ) a
;
