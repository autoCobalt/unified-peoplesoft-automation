-- ===========================================
-- Connection Test Query
-- ===========================================
-- Simple query using DUAL pseudo-table to verify Oracle connectivity.
-- Returns current timestamp, database name, and session user.
-- No table access required - works for any valid Oracle user.
-- ===========================================

SELECT
    SYSDATE AS CURRENT_TIME,
    SYS_CONTEXT('USERENV', 'DB_NAME') AS DATABASE_NAME,
    SYS_CONTEXT('USERENV', 'SESSION_USER') AS SESSION_USER,
    SYS_CONTEXT('USERENV', 'HOST') AS CLIENT_HOST,
    'Connection successful' AS STATUS
FROM DUAL
