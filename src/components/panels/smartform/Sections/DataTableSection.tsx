/**
 * DataTableSection Component
 *
 * Displays the filtered transaction records using the shared DataTable component.
 * Features:
 * - Row count and queue label in toolbar
 * - Date match highlighting
 * - Status badges with appropriate colors
 */

import { useMemo } from 'react';
import { useSmartForm } from '../../../../context';
import type { SmartFormRecord, ColumnDef } from '../../../../types';
import { DataTable } from '../../../table';
import './DataTableSection.css';

/**
 * Column definitions for the SmartForm transaction table.
 * Defines structure, types, and conditional styling.
 */
function useTransactionColumns(): ColumnDef<SmartFormRecord>[] {
  return useMemo(() => [
    {
      id: 'transaction',
      header: 'Transaction',
      accessor: 'transaction',
      type: 'mono',
    },
    {
      id: 'emplid',
      header: 'Emplid',
      accessor: 'emplid',
      type: 'mono',
    },
    {
      id: 'employeeName',
      header: 'Employee Name',
      accessor: 'employeeName',
    },
    {
      id: 'currentEffdt',
      header: 'Current Effdt',
      accessor: 'currentEffdt',
      type: 'mono',
      cellClassName: (_value, row) =>
        row.currentEffdt === row.newEffdt ? 'sf-table-cell--date-warning' : '',
    },
    {
      id: 'newEffdt',
      header: 'New Effdt',
      accessor: 'newEffdt',
      type: 'mono',
      cellClassName: (_value, row) =>
        row.currentEffdt === row.newEffdt ? 'sf-table-cell--date-warning' : '',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      type: 'status',
      statusClassMap: {
        pending: 'pending',
        processing: 'processing',
        success: 'success',
        error: 'error',
      },
    },
  ], []);
}

export function DataTableSection() {
  const { state, filteredRecords } = useSmartForm();
  const { activeSubTab } = state;

  const columns = useTransactionColumns();
  const queueLabel = activeSubTab === 'manager' ? 'Manager' : 'Other';
  const rowCount = filteredRecords.length;

  return (
    <DataTable
      className="sf-table"
      columns={columns}
      data={filteredRecords}
      keyAccessor="id"
      showRowNumbers
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
      rowConfig={{
        className: (row) =>
          row.currentEffdt === row.newEffdt ? 'sf-table-row--date-match' : '',
      }}
      tabPanel={{
        id: `sf-tabpanel-${activeSubTab}`,
        labelledBy: `sf-tab-${activeSubTab}`,
      }}
      ariaLabel={`${queueLabel} approval transactions`}
    />
  );
}
