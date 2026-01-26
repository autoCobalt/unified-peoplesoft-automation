/**
 * DataTableSection Component
 *
 * Displays the filtered transaction records using the shared DataTable component.
 * Features:
 * - Dynamic columns based on Oracle query results
 * - TRANSACTION_NBR displayed as clickable hyperlink (uses WEB_LINK)
 * - Date formatting (MM/DD/YYYY) for date columns
 * - Monospace font for ID columns
 * - Date cell highlighting when EFFDT === CUR_JOB_EFFDT
 * - Hidden fields (MGR_CUR, WEB_LINK) excluded from display
 */

import { useMemo } from 'react';
import { useSmartForm } from '../../../../context';
import type {
  SmartFormRecord,
  ColumnDef,
} from '../../../../types';
import {
  HIDDEN_SMARTFORM_FIELDS,
  MONOSPACE_SMARTFORM_FIELDS,
  DATE_SMARTFORM_FIELDS,
} from '../../../../types';
import { DataTable } from '../../../table';
import './DataTableSection.css';

/**
 * Format an Oracle date string to MM/DD/YYYY.
 * Handles common formats: "2025-01-15", "15-JAN-25", ISO strings.
 */
function formatDateMMDDYYYY(oracleDate: unknown): string {
  // Only process string values
  if (typeof oracleDate !== 'string') {
    // Handle null/undefined
    if (oracleDate == null) return '';
    // Handle numbers (might be timestamp)
    if (typeof oracleDate === 'number') {
      const date = new Date(oracleDate);
      if (!isNaN(date.getTime())) {
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = String(date.getFullYear());
        return `${mm}/${dd}/${yyyy}`;
      }
    }
    // For other types (objects, etc.), return empty
    return '';
  }

  if (!oracleDate) return '';

  const date = new Date(oracleDate);
  if (isNaN(date.getTime())) {
    // Return as-is if parsing fails
    return oracleDate;
  }

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Build dynamic columns from the first row's keys.
 * Applies type-specific rendering based on field configuration arrays.
 */
function buildDynamicColumns(
  firstRow: SmartFormRecord
): ColumnDef<SmartFormRecord>[] {
  const hiddenSet = new Set<string>(HIDDEN_SMARTFORM_FIELDS);
  const monoSet = new Set<string>(MONOSPACE_SMARTFORM_FIELDS);
  const dateSet = new Set<string>(DATE_SMARTFORM_FIELDS);

  return Object.keys(firstRow)
    .filter(key => !hiddenSet.has(key))
    .map(key => {
      const isMonospace = monoSet.has(key);
      const isDate = dateSet.has(key);
      const isTransactionLink = key === 'TRANSACTION_NBR';

      const column: ColumnDef<SmartFormRecord> = {
        id: key,
        header: key, // Keep Oracle format as requested
        accessor: key as keyof SmartFormRecord,
        type: isMonospace ? 'mono' : 'text',
      };

      // Special render for TRANSACTION_NBR as hyperlink
      if (isTransactionLink) {
        column.render = (value, row) => (
          <a
            href={row.WEB_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="sf-transaction-link"
          >
            {String(value)}
          </a>
        );
      }
      // Date formatting for date columns
      else if (isDate) {
        column.render = (value) => formatDateMMDDYYYY(value);
        // Add warning styling for date match (only highlight cells when dates match)
        column.cellClassName = (_value, row) => {
          const effdt = row.EFFDT;
          const curJobEffdt = row.CUR_JOB_EFFDT;
          return effdt === curJobEffdt ? 'sf-table-cell--date-warning' : '';
        };
      }

      return column;
    });
}

export function DataTableSection() {
  const { state, filteredRecords } = useSmartForm();
  const { activeSubTab } = state;

  // Build columns dynamically from the first row's keys
  const columns = useMemo(() => {
    if (filteredRecords.length === 0) {
      // Fallback: minimal columns when no data
      return [
        { id: 'TRANSACTION_NBR', header: 'TRANSACTION_NBR', accessor: 'TRANSACTION_NBR' as const, type: 'mono' as const },
        { id: 'EMPLID', header: 'EMPLID', accessor: 'EMPLID' as const, type: 'mono' as const },
      ];
    }
    return buildDynamicColumns(filteredRecords[0]);
  }, [filteredRecords]);

  const queueLabel = activeSubTab === 'manager' ? 'Manager' : 'Other';
  const rowCount = filteredRecords.length;

  return (
    <DataTable
      className="sf-table"
      columns={columns}
      data={filteredRecords}
      keyAccessor="TRANSACTION_NBR"
      showRowNumbers={true}
      stickyColumns={2}
      staggerRows={true}
      emptyMessage="No transactions in this queue"
      toolbar={{
        left: (
          <span className="sf-table-row-count">
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </span>
        ),
        right: (
          <span className="sf-table-queue-label">
            {queueLabel} Approval Queue
          </span>
        ),
      }}
      tabPanel={{
        id: `sf-tabpanel-${activeSubTab}`,
        labelledBy: `sf-tab-${activeSubTab}`,
      }}
      ariaLabel={`${queueLabel} approval transactions`}
    />
  );
}
