/*
 * @sql-meta
 * name: example-dual-query
 * description: Example query demonstrating the SQL metadata format
 * author: Walter Alcazar
 * version: 1.1.0
 * category: utility
 * created: 2025-01-24
 * modified: 2025-01-25
 *
 * @returns
 * - CURRENT_TIME: DATE [DD-MMM-YY] - Current database timestamp
 * - DATABASE_NAME: VARCHAR2 - Name of the connected database
 * - SESSION_USER: VARCHAR2 - Current session username
 *
 * @tags
 * - example
 * - testing
 * - documentation
 *
 * @notes
 * This is an example SQL file demonstrating the metadata format.
 * It uses the DUAL pseudo-table which is available to all Oracle users.
 * No special permissions are required to run this query.
 *
 * The CURRENT_TIME column uses the [DD-MMM-YY] format specifier to
 * indicate that Oracle returns dates in its default format (e.g., 25-JAN-25).
 * @end-sql-meta
 */

-- ===========================================
-- Example Query Using DUAL Pseudo-Table
-- ===========================================
-- This query returns basic session information
-- and is useful for testing Oracle connectivity.
-- ===========================================

SELECT
    SYSDATE AS CURRENT_TIME,
    SYS_CONTEXT('USERENV', 'DB_NAME') AS DATABASE_NAME,
    SYS_CONTEXT('USERENV', 'SESSION_USER') AS SESSION_USER
FROM DUAL
