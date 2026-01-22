-- SmartForm Pending Transactions Query
--
-- Retrieves all pending CI transactions awaiting approval.
-- Results are used to populate the SmartForm data table.
--
-- Expected columns:
--   TRANSACTION_NBR  - Unique transaction identifier
--   EMPLID           - Employee ID
--   EMPLOYEE_NAME    - Full employee name
--   CURRENT_EFFDT    - Current effective date (YYYY-MM-DD)
--   NEW_EFFDT        - New effective date (YYYY-MM-DD)
--   APPROVER_TYPE    - 'Manager' or 'Other'
--   POSITION_NBR     - Position number (nullable, used for Other workflow)
--
-- PLACEHOLDER: Replace with actual query for production use

SELECT
    'TXN000001' AS TRANSACTION_NBR,
    '123456' AS EMPLID,
    'Placeholder Employee' AS EMPLOYEE_NAME,
    '2025-01-01' AS CURRENT_EFFDT,
    '2025-02-01' AS NEW_EFFDT,
    'Manager' AS APPROVER_TYPE,
    NULL AS POSITION_NBR
FROM DUAL
WHERE 1 = 0  -- Returns no rows - replace entire query for production
