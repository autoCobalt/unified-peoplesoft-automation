-- SmartForm Pending Transactions Query
--
-- Retrieves all pending CI transactions awaiting approval.
-- Results are used to populate the SmartForm data table.
--
-- Expected columns:
--   TRANSACTION_NBR    - Unique transaction identifier
--   MGR_CUR            - Manager current flag (1 = Manager, 0 = Other)
--   EMPLID             - Employee ID
--   EMPL_RCD           - Employee record number
--   EMPLOYEE_NAME      - Full employee name
--   NEW_EFFDT          - New effective date (Oracle date, DD-MMM-YY)
--   CUR_EFFDT          - Current effective date (Oracle date, DD-MMM-YY)
--   CUR_POS            - Current position number
--   POSITION_CREATE_CI - Position Create CI flag (nullable)
--   POSITION_UPDATE_CI - Position Update CI flag (nullable)
--   JOB_UPDATE_CI      - Job Update CI flag (nullable)
--   DEPT_CO_UPDATE_CI  - Dept/Co Update CI flag (nullable)
--   FIELD_DIFFERENCES  - Field differences description (nullable)
--   WEB_LINK           - Full URL for transaction hyperlink
--
-- PLACEHOLDER: Replace with actual query for production use

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
