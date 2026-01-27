/*
 * @sql-meta
 * name: smartform-pending-transactions
 * description: Retrieves all pending CI transactions awaiting approval. Results are used to populate the SmartForm data table.
 * author: System
 * version: 1.0.0
 * category: smartform
 * created: 2025-01-24
 * modified: 2025-01-24
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
 * - POSITION_CREATE_CI: VARCHAR2 - Position Create CI flag (nullable)
 * - POSITION_UPDATE_CI: VARCHAR2 - Position Update CI flag (nullable)
 * - JOB_UPDATE_CI: VARCHAR2 - Job Update CI flag (nullable)
 * - DEPT_CO_UPDATE_CI: VARCHAR2 - Dept/Co Update CI flag (nullable)
 * - FIELD_DIFFERENCES: VARCHAR2 - Field differences description (nullable)
 * - WEB_LINK: VARCHAR2 - Full URL for transaction hyperlink
 *
 * @tags
 * - smartform
 * - transactions
 * - approval
 *
 * @notes
 * PLACEHOLDER: Replace with actual query for production use.
 * The WHERE 1 = 0 clause ensures no rows are returned until the query is updated.
 * @end-sql-meta
 */

SELECT
    'TXN000001' AS TRANSACTION_NBR,
    1 AS MGR_CUR,
    '123456' AS EMPLID,
    0 AS EMPL_RCD,
    'Placeholder Employee' AS EMPLOYEE_NAME,
    '01-JAN-25' AS NEW_EFFDT,
    '01-FEB-25' AS CUR_EFFDT,
    'POS00001' AS CUR_POS,
    NULL AS POSITION_CREATE_CI,
    NULL AS POSITION_UPDATE_CI,
    NULL AS JOB_UPDATE_CI,
    NULL AS DEPT_CO_UPDATE_CI,
    NULL AS FIELD_DIFFERENCES,
    'https://example.com/txn/TXN000001' AS WEB_LINK
FROM DUAL
WHERE 1 = 0  -- Returns no rows - replace entire query for production
