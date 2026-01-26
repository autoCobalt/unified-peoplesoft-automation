/**
 * DataTableSection Component
 *
 * Displays the filtered transaction records using the shared DataTable component.
 * Features:
 * - Row numbers column (first column, sticky, auto-generated)
 * - Row selection via checkbox column (second column, sticky)
 * - TRANSACTION_NBR displayed as clickable hyperlink (uses WEB_LINK)
 * - Dynamic columns based on Oracle query results
 * - Date formatting (MM/DD/YYYY) for date columns
 * - Monospace font for ID columns
 * - Date cell highlighting when NEW_EFFDT === CUR_EFFDT
 * - Hidden fields (MGR_CUR, WEB_LINK) excluded from display
 */

import { useMemo, useState, useCallback } from 'react';
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
          const newEffdt = row.NEW_EFFDT;
          const curEffdt = row.CUR_EFFDT;
          return newEffdt === curEffdt ? 'sf-table-cell--date-warning' : '';
        };
      }

      return column;
    });
}

/**
 * Selection state with data signature for auto-reset detection.
 * When the data signature changes, selection resets to include all rows.
 */
interface SelectionState {
  /** Signature of the current data (used to detect data changes) */
  signature: string;
  /** Set of selected TRANSACTION_NBR values */
  selected: Set<string>;
}

/**
 * Selection states keyed by sub-tab ID.
 * Each sub-tab maintains its own independent selection.
 * Uses Partial to indicate not all tabs may have state yet.
 */
type SelectionByTab = Partial<Record<string, SelectionState>>;

/**
 * Creates a selection state with all records selected.
 */
function createFullSelection(records: SmartFormRecord[]): SelectionState {
  return {
    signature: records.map(r => r.TRANSACTION_NBR).join(','),
    selected: new Set(records.map(r => r.TRANSACTION_NBR)),
  };
}

export function DataTableSection() {
  const { state, filteredRecords } = useSmartForm();
  const { activeSubTab } = state;

  // Track selection state PER SUB-TAB so switching tabs preserves selections
  const [selectionByTab, setSelectionByTab] = useState<SelectionByTab>(() => ({
    [activeSubTab]: createFullSelection(filteredRecords),
  }));

  // Get or create selection state for current tab
  const currentTabSelection = selectionByTab[activeSubTab];
  const currentSignature = filteredRecords.map(r => r.TRANSACTION_NBR).join(',');

  // Initialize selection for this tab if it doesn't exist,
  // or reset if the underlying data changed (e.g., new query results)
  if (!currentTabSelection || currentTabSelection.signature !== currentSignature) {
    setSelectionByTab(prev => ({
      ...prev,
      [activeSubTab]: createFullSelection(filteredRecords),
    }));
  }

  // Extract selected set for current tab (with stable fallback for first render)
  const selectedRows = useMemo(() => {
    return currentTabSelection?.selected
      ?? new Set(filteredRecords.map(r => r.TRANSACTION_NBR));
  }, [currentTabSelection?.selected, filteredRecords]);

  // Memoized checkbox toggle handler (updates the current tab's selection)
  const handleCheckboxChange = useCallback(
    (row: SmartFormRecord, checked: boolean) => {
      const key = row.TRANSACTION_NBR;
      setSelectionByTab(prev => {
        const tabState = prev[activeSubTab];
        if (!tabState) return prev;

        const next = new Set(tabState.selected);
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return {
          ...prev,
          [activeSubTab]: { ...tabState, selected: next },
        };
      });
    },
    [activeSubTab]
  );

  // Build columns dynamically from the first row's keys
  // Checkbox column is prepended to the dynamic columns
  const columns = useMemo(() => {
    // Checkbox column definition (will be second after row number)
    const checkboxColumn: ColumnDef<SmartFormRecord> = {
      id: '__selected',
      header: '',
      type: 'checkbox',
      align: 'center',
      width: '36px',
      checked: (row) => selectedRows.has(row.TRANSACTION_NBR),
      onCheckedChange: handleCheckboxChange,
    };

    if (filteredRecords.length === 0) {
      // Fallback: checkbox + minimal columns when no data
      return [
        checkboxColumn,
        { id: 'TRANSACTION_NBR', header: 'TRANSACTION_NBR', accessor: 'TRANSACTION_NBR' as const, type: 'mono' as const },
        { id: 'EMPLID', header: 'EMPLID', accessor: 'EMPLID' as const, type: 'mono' as const },
      ];
    }

    return [checkboxColumn, ...buildDynamicColumns(filteredRecords[0])];
  }, [filteredRecords, selectedRows, handleCheckboxChange]);

  const queueLabel = activeSubTab === 'manager' ? 'Manager' : 'Other';
  const rowCount = filteredRecords.length;

  return (
    <DataTable
      className="sf-table"
      columns={columns}
      data={filteredRecords}
      keyAccessor="TRANSACTION_NBR"
      showRowNumbers={true}
      stickyColumns={3}
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
      rowConfig={{
        className: (row) =>
          selectedRows.has(row.TRANSACTION_NBR) ? '' : 'sf-table-row--unchecked',
      }}
      tabPanel={{
        id: `sf-tabpanel-${activeSubTab}`,
        labelledBy: `sf-tab-${activeSubTab}`,
      }}
      ariaLabel={`${queueLabel} approval transactions`}
    />
  );
}
