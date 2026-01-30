/**
 * DataTableSection Component
 *
 * Displays CI preview tables and filtered transaction records using the shared
 * DataTable component.
 *
 * Features:
 * - CI preview tables with two-row headers (field name + label)
 * - Row numbers column (first column, sticky, auto-generated)
 * - Row selection via checkbox column (second column, sticky)
 * - TRANSACTION_NBR displayed as clickable hyperlink (uses WEB_LINK)
 * - Dynamic columns based on Oracle query results
 * - Date formatting (MM/DD/YYYY) for date columns
 * - Monospace font for ID columns
 * - Date cell highlighting when NEW_EFFDT === CUR_EFFDT
 * - Hidden fields (MGR_CUR, WEB_LINK) excluded from display
 */

import { useMemo, useEffect, useRef } from 'react';
import { useSmartForm, useCILabels } from '../../../../context';
import type {
  SmartFormRecord,
  ColumnDef,
} from '../../../../types';
import {
  HIDDEN_SMARTFORM_FIELDS,
  MONOSPACE_SMARTFORM_FIELDS,
  DATE_SMARTFORM_FIELDS,
} from '../../../../types';
import type { CIUsageTemplate, ParsedCIRecordBase } from '../../../../server/ci-definitions/types';
import {
  DEPT_CO_UPDATE_CI_TEMPLATE,
  POSITION_UPDATE_CI_TEMPLATE,
  JOB_UPDATE_CI_TEMPLATE,
  POSITION_CREATE_CI_TEMPLATE,
} from '../../../../server/ci-definitions/templates/smartform';
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

/* ==============================================
   CI Preview Table Helpers
   ============================================== */

/**
 * CI preview table configuration — display order and data key mapping.
 * Order: deptCoUpdate, positionUpdate, jobUpdate, positionCreate
 */
const CI_PREVIEW_CONFIG = [
  { template: DEPT_CO_UPDATE_CI_TEMPLATE,     dataKey: 'deptCoUpdate' as const,    tabFilter: 'manager' as const },
  { template: POSITION_UPDATE_CI_TEMPLATE,    dataKey: 'positionUpdate' as const,  tabFilter: 'manager' as const },
  { template: JOB_UPDATE_CI_TEMPLATE,         dataKey: 'jobUpdate' as const,       tabFilter: 'manager' as const },
  { template: POSITION_CREATE_CI_TEMPLATE,    dataKey: 'positionCreate' as const,  tabFilter: 'other' as const },
] as const;

/** All unique CI names referenced by the preview tables */
const CI_NAMES_TO_LOAD = [...new Set(CI_PREVIEW_CONFIG.map(c => c.template.ciName))];

/**
 * Build column definitions for a CI preview table.
 * Prepends a TRANSACTION_NBR column and maps template fields to two-row headers.
 */
function buildCIPreviewColumns<T extends ParsedCIRecordBase>(
  template: CIUsageTemplate,
  getLabel: (ciName: string, fieldName: string) => string,
): ColumnDef<T>[] {
  const txnColumn: ColumnDef<T> = {
    id: 'transactionNbr',
    header: (
      <>
        <span className="sf-ci-header-name">TRANSACTION_NBR</span>
        <span className="sf-ci-header-label">Transaction Number</span>
      </>
    ),
    accessor: 'transactionNbr' as keyof T,
    type: 'mono',
  };

  const fieldColumns: ColumnDef<T>[] = template.fields.map(field => ({
    id: field.name,
    header: (
      <>
        <span className="sf-ci-header-name">{field.name}</span>
        <span className="sf-ci-header-label">{getLabel(template.ciName, field.name)}</span>
      </>
    ),
    accessor: field.name as keyof T,
    type: 'text' as const,
  }));

  return [txnColumn, ...fieldColumns];
}

export function DataTableSection() {
  const {
    state,
    filteredRecords,
    parsedCIData,
    selectedByTab,
    setTransactionSelected,
  } = useSmartForm();
  const { activeSubTab } = state;
  const { ensureLabels, getLabel } = useCILabels();

  // Fetch labels for all CI shapes used by preview tables
  useEffect(() => {
    for (const ciName of CI_NAMES_TO_LOAD) {
      void ensureLabels(ciName);
    }
  }, [ensureLabels]);

  // Selection for the active sub-tab (from context, persists across tab switches)
  const selectedRows = selectedByTab[activeSubTab];

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
      onCheckedChange: (row, checked) => {
        setTransactionSelected(row.TRANSACTION_NBR, checked);
      },
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
  }, [filteredRecords, selectedRows, setTransactionSelected]);

  const queueLabel = activeSubTab === 'manager' ? 'Manager' : 'Other';
  const rowCount = filteredRecords.length;

  // Cross-table hover: ref for event delegation wrapper
  const crossHoverRef = useRef<HTMLDivElement>(null);

  // Cross-table hover: highlight rows with matching transaction numbers
  useEffect(() => {
    const wrapper = crossHoverRef.current;
    if (!wrapper) return;

    let lastKey: string | null = null;
    let lastSourceTable: Element | null = null;

    function clearHighlights() {
      if (!wrapper || !lastKey) return;
      const highlighted = wrapper.querySelectorAll('tr.sf-cross-hover');
      for (const el of highlighted) {
        el.classList.remove('sf-cross-hover');
      }
      lastKey = null;
      lastSourceTable = null;
    }

    function handleMouseOver(e: MouseEvent) {
      const tr = (e.target as HTMLElement).closest('tr[data-row-key]');
      if (!tr) {
        clearHighlights();
        return;
      }

      const key = tr.getAttribute('data-row-key');
      const sourceTable = tr.closest('table');

      // Skip if same row in same table (no change)
      if (key === lastKey && sourceTable === lastSourceTable) return;

      clearHighlights();
      if (!key || !wrapper) return;

      // Find all rows with matching key across ALL tables in the wrapper
      const allMatches = wrapper.querySelectorAll(
        `tr[data-row-key="${CSS.escape(key)}"]`
      );

      // Highlight only rows in OTHER tables (source table has native :hover)
      for (const match of allMatches) {
        if (match.closest('table') !== sourceTable) {
          match.classList.add('sf-cross-hover');
        }
      }

      lastKey = key;
      lastSourceTable = sourceTable;
    }

    function handleMouseLeave() {
      clearHighlights();
    }

    wrapper.addEventListener('mouseover', handleMouseOver);
    wrapper.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      wrapper.removeEventListener('mouseover', handleMouseOver);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
      clearHighlights();
    };
  }, []);

  return (
    <div ref={crossHoverRef} className="sf-tables-wrapper">
      {/* CI Preview Tables (above the main results table) */}
      {CI_PREVIEW_CONFIG.map(({ template, dataKey, tabFilter }) => {
        // Only show table on its designated sub-tab
        if (tabFilter !== activeSubTab) return null;

        const allRecords = parsedCIData[dataKey] as ParsedCIRecordBase[];
        const records = allRecords.filter(r => selectedRows.has(r.transactionNbr));
        if (records.length === 0) return null;

        const ciColumns = buildCIPreviewColumns(template, getLabel);

        return (
          <div key={dataKey} className="sf-ci-preview-container">
            <h4 className="sf-ci-preview-title">{template.queryFieldName}</h4>
            <DataTable
              className="sf-ci-preview-table"
              columns={ciColumns}
              data={records}
              keyAccessor="transactionNbr"
              showRowNumbers={true}
              stickyColumns={2}
              emptyMessage="No records"
              ariaLabel={`${template.queryFieldName} preview`}
            />
          </div>
        );
      })}

      {/* Main Results Section: Toolbar → Title Bar → DataTable */}
      <div className="sf-results-container">
        <div className="sf-results-toolbar">
          <span className="sf-table-row-count">
            {rowCount} row{rowCount !== 1 ? 's' : ''}
          </span>
          <span className="sf-table-queue-label">
            {queueLabel} Approval Queue
          </span>
        </div>
        <h4 className="sf-results-title">Pending Transactions</h4>
        <DataTable
          className="sf-table"
          columns={columns}
          data={filteredRecords}
          keyAccessor="TRANSACTION_NBR"
          showRowNumbers={true}
          stickyColumns={3}
          staggerRows={true}
          emptyMessage="No transactions in this queue"
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
      </div>
    </div>
  );
}
