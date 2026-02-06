/**
 * DataTableSection Component
 *
 * Displays CI preview tables and filtered transaction records using the shared
 * DataTable component.
 *
 * Features:
 * - CI preview tables with two-row headers (field name + label)
 * - Submission status column on CI preview tables (pending → submitting → success/error)
 * - Approval status column on main results table (pending → processing → success/error)
 *   Updated in real-time from server polling during approval workflows
 * - Row numbers column (first column, sticky, auto-generated)
 * - Row selection via checkbox column (sticky, tri-state header)
 * - Sticky columns: Row# | Checkbox | Status | TRANSACTION_NBR (4 total)
 * - TRANSACTION_NBR displayed as clickable hyperlink (uses WEB_LINK)
 * - Dynamic columns based on Oracle query results
 * - Date formatting (MM/DD/YYYY) for date columns
 * - Monospace font for ID columns
 * - Date cell highlighting when NEW_EFFDT === CUR_EFFDT
 * - Hidden fields (MGR_CUR, WEB_LINK) excluded from display
 * - Non-export header coloring on Row#, Checkbox, and Status columns
 * - Excel export with Download button on both main results and CI preview tables
 * - Transaction number toggle: per-CI-table checkbox controlling TRANSACTION_NBR
 *   inclusion in Excel export (state persisted via context: txnExcludedTables)
 * - Collapsible table sections with auto-collapse on all-success, manual override
 *   (state persisted via context: tableCollapseOverrides)
 * - Title bar controls group (.sf-ci-title-controls) with chevron, download, toggle
 * - Cross-table hover highlighting for matching transaction rows
 * - CI duplicate detection with faded row styling and count badge
 */

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSmartFormStore, selectFilteredRecords, useCILabelsStore } from '../../../../stores';
import type {
  SmartFormRecord,
  ColumnDef,
  PreparedSubmissionStatus,
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
import { DataTable, TriStateCheckbox } from '../../../table';
import { exportToExcel, findCIDuplicates, filterCIDuplicates } from '../../../../utils';
import type { ExcelColumn } from '../../../../utils';
import { DownloadIcon, ChevronIcon } from '../../../icons';
import './DataTableSection.css';

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
      // Warning styling when NEW_EFFDT === CUR_EFFDT (dates displayed in Oracle format)
      else if (isDate) {
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
 * tabFilter is an array of sub-tabs where the table should appear.
 * Order: deptCoUpdate, positionUpdate, jobUpdate, positionCreate
 */
const CI_PREVIEW_CONFIG = [
  { template: DEPT_CO_UPDATE_CI_TEMPLATE,     dataKey: 'deptCoUpdate' as const,    tabFilter: ['manager', 'other'] as const, checkDuplicates: true },
  { template: POSITION_UPDATE_CI_TEMPLATE,    dataKey: 'positionUpdate' as const,  tabFilter: ['manager'] as const,          checkDuplicates: true },
  { template: JOB_UPDATE_CI_TEMPLATE,         dataKey: 'jobUpdate' as const,       tabFilter: ['manager'] as const,          checkDuplicates: false },
  { template: POSITION_CREATE_CI_TEMPLATE,    dataKey: 'positionCreate' as const,  tabFilter: ['other'] as const,            checkDuplicates: true },
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
  includeTxnNbr = true,
): ColumnDef<T>[] {
  const txnColumn: ColumnDef<T> = {
    id: 'transactionNbr',
    header: (
      <>
        <span className="sf-ci-header-name">TRANSACTION_NBR</span>
        <span className="sf-ci-header-label">Transaction Number</span>
      </>
    ),
    headerClassName: includeTxnNbr ? undefined : 'sf-ci-header--non-export',
    cellClassName: includeTxnNbr ? undefined : 'sf-ci-cell--non-export',
    accessor: 'transactionNbr' as keyof T,
    type: 'mono',
    width: '134px',
  };

  const ciActionColumn: ColumnDef<T> = {
    id: 'action',
    header: (
      <>
        <span className="sf-ci-header-name">CI_ACTION</span>
        <span className="sf-ci-header-label">CI Action</span>
      </>
    ),
    accessor: 'action' as keyof T,
    type: 'mono',
    width: '110px',
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

  return !template.actionIsFixed
    ? [txnColumn, ciActionColumn, ...fieldColumns]
    : [txnColumn, ...fieldColumns];
}

/**
 * Build a STATUS column for manager-tab CI preview tables.
 * Looks up submission status from an external Map keyed by transactionNbr.
 */
function buildStatusColumn<T extends ParsedCIRecordBase>(
  statusMap: Map<string, PreparedSubmissionStatus>,
): ColumnDef<T> {
  const statusClassMap: Record<string, string> = {
    pending: 'pending',
    submitting: 'processing',
    success: 'success',
    error: 'error',
  };

  return {
    id: '__status',
    header: (
      <>
        <span className="sf-ci-header-name">STATUS</span>
        <span className="sf-ci-header-label">Submission</span>
      </>
    ),
    headerClassName: 'sf-ci-header--non-export',
    width: '88px',
    align: 'center',
    render: (_value, row) => {
      const status = statusMap.get(row.transactionNbr) ?? 'pending';
      const cssClass = statusClassMap[status] ?? status;
      return (
        <span className={`dt-status dt-status--${cssClass}`}>
          {status}
        </span>
      );
    },
  };
}

/* ==============================================
   Excel Export Helpers
   ============================================== */

/**
 * Build Excel column definitions from a CI usage template.
 * Includes TRANSACTION_NBR as the first column, followed by template fields.
 */
function buildCIExcelColumns(template: CIUsageTemplate): ExcelColumn[] {
  const base: ExcelColumn[] = [
    { header: 'TRANSACTION_NBR', accessor: 'transactionNbr' },
  ];
  if (!template.actionIsFixed) {
    base.push({ header: 'CI_ACTION', accessor: 'action' });
  }
  return [...base, ...template.fields.map(f => ({ header: f.name, accessor: f.name }))];
}

/**
 * Build Excel column definitions from a SmartForm record's visible keys.
 * Excludes hidden fields (same set as the DataTable column builder).
 */
function buildResultsExcelColumns(firstRow: SmartFormRecord): ExcelColumn[] {
  const hiddenSet = new Set<string>(HIDDEN_SMARTFORM_FIELDS);
  return Object.keys(firstRow)
    .filter(key => !hiddenSet.has(key))
    .map(key => ({ header: key, accessor: key }));
}

/**
 * Generate a timestamped filename for Excel downloads.
 * Format: {prefix}_YYYYMMDD_HHMMSS
 */
function buildExcelFileName(prefix: string): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${prefix}_${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

export function DataTableSection() {
  // State values (useShallow for object equality)
  const {
    activeSubTab,
    managerWorkflow,
    otherWorkflow,
    parsedCIData,
    selectedByTab,
    preparedDeptCoData,
    preparedPositionData,
    preparedJobData,
    preparedOtherDeptCoData,
    preparedPositionCreateData,
    tableCollapseOverrides: manualOverrides,
    txnExcludedTables,
  } = useSmartFormStore(
    useShallow(s => ({
      activeSubTab: s.activeSubTab,
      managerWorkflow: s.managerWorkflow,
      otherWorkflow: s.otherWorkflow,
      parsedCIData: s.parsedCIData,
      selectedByTab: s.selectedByTab,
      preparedDeptCoData: s.preparedDeptCoData,
      preparedPositionData: s.preparedPositionData,
      preparedJobData: s.preparedJobData,
      preparedOtherDeptCoData: s.preparedOtherDeptCoData,
      preparedPositionCreateData: s.preparedPositionCreateData,
      tableCollapseOverrides: s.tableCollapseOverrides,
      txnExcludedTables: s.txnExcludedTables,
    })),
  );

  // Actions (stable refs, no useShallow needed)
  const setTransactionSelected = useSmartFormStore(s => s.setTransactionSelected);
  const setAllTransactionsSelected = useSmartFormStore(s => s.setAllTransactionsSelected);
  const setManualOverrides = useSmartFormStore(s => s.setTableCollapseOverrides);
  const setTxnExcludedTables = useSmartFormStore(s => s.setTxnExcludedTables);

  // Computed selector
  const filteredRecords = useSmartFormStore(useShallow(selectFilteredRecords));
  const ensureLabels = useCILabelsStore(s => s.ensureLabels);
  const getLabel = useCILabelsStore(s => s.getLabel);

  // Fetch labels for all CI shapes used by preview tables
  useEffect(() => {
    for (const ciName of CI_NAMES_TO_LOAD) {
      void ensureLabels(ciName);
    }
  }, [ensureLabels]);

  // Build status lookup: dataKey → Map<transactionNbr, status>
  // Tab-dependent: Manager tab shows manager CI statuses, Other tab shows other CI statuses
  const statusMaps = useMemo(() => {
    const buildMap = (submissions: { id: string; status: PreparedSubmissionStatus }[], prefix: string) => {
      const map = new Map<string, PreparedSubmissionStatus>();
      for (const sub of submissions) {
        map.set(sub.id.replace(prefix, ''), sub.status);
      }
      return map;
    };

    if (activeSubTab === 'manager') {
      return new Map<string, Map<string, PreparedSubmissionStatus>>([
        ['deptCoUpdate', buildMap(preparedDeptCoData, 'deptco-')],
        ['positionUpdate', buildMap(preparedPositionData, 'pos-')],
        ['jobUpdate', buildMap(preparedJobData, 'job-')],
      ]);
    } else {
      return new Map<string, Map<string, PreparedSubmissionStatus>>([
        ['deptCoUpdate', buildMap(preparedOtherDeptCoData, 'other-deptco-')],
        ['positionCreate', buildMap(preparedPositionCreateData, 'poscreate-')],
      ]);
    }
  }, [activeSubTab, preparedDeptCoData, preparedPositionData, preparedJobData, preparedOtherDeptCoData, preparedPositionCreateData]);

  // Selection for the active sub-tab (from context, persists across tab switches)
  const selectedRows = selectedByTab[activeSubTab];

  // Compute duplicate sets for CI preview tables that have checkDuplicates enabled.
  // Operates on selectedRows-filtered records so unchecking a "first occurrence"
  // correctly reassigns which row is canonical vs duplicate.
  const ciDuplicateSets = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const { template, dataKey, tabFilter, checkDuplicates } of CI_PREVIEW_CONFIG) {
      if (!checkDuplicates || !tabFilter.some(t => t === activeSubTab)) continue;
      const allRecords = parsedCIData[dataKey] as ParsedCIRecordBase[];
      const records = allRecords.filter(r => selectedRows.has(r.transactionNbr));
      if (records.length > 0) {
        result.set(dataKey, findCIDuplicates(records, template.fields));
      }
    }
    return result;
  }, [parsedCIData, selectedRows, activeSubTab]);

  // Compute "all eligible successful" per CI preview table.
  // "Eligible" = selected (checked) records minus duplicates (beyond the first).
  const ciTableAllSuccess = useMemo(() => {
    const result = new Map<string, boolean>();
    for (const { dataKey, tabFilter, checkDuplicates } of CI_PREVIEW_CONFIG) {
      if (!tabFilter.some(t => t === activeSubTab)) continue;
      const tableKey = `${activeSubTab}-${dataKey}`;
      const allRecords = parsedCIData[dataKey] as ParsedCIRecordBase[];
      const records = allRecords.filter(r => selectedRows.has(r.transactionNbr));
      if (records.length === 0) { result.set(tableKey, false); continue; }

      const duplicateSet = checkDuplicates
        ? (ciDuplicateSets.get(dataKey) ?? new Set<string>())
        : new Set<string>();
      const dataStatusMap = statusMaps.get(dataKey);
      if (!dataStatusMap) { result.set(tableKey, false); continue; }

      const allSuccess = records
        .filter(r => !duplicateSet.has(r.transactionNbr))
        .every(r => dataStatusMap.get(r.transactionNbr) === 'success');
      result.set(tableKey, allSuccess);
    }
    return result;
  }, [activeSubTab, parsedCIData, selectedRows, ciDuplicateSets, statusMaps]);

  // Compute "all successful" for main results table (approval status, not CI submission).
  const mainTableAllSuccess = useMemo(() => {
    const selected = filteredRecords.filter(r => selectedRows.has(r.TRANSACTION_NBR));
    if (selected.length === 0) return false;
    return selected.every(r => r.status === 'success');
  }, [filteredRecords, selectedRows]);

  // allTableSuccess drives auto-collapse for all collapsible tables.
  // CI preview tables use their per-record statusMaps (clean batch signals).
  // The main results table uses the workflow step machine ('complete') instead
  // of mainTableAllSuccess — record statuses flicker during multi-step
  // workflows, but the workflow step only transitions once at the very end.
  // "Approvals done" gate for main results table auto-collapse.
  // Manager: true once past the 'approving' step (approved, submitting-*, complete).
  // Other: true once past the 'approving' step (approved, complete).
  // Does NOT fire during Other's pre-approval CI submission steps.
  const approvalsComplete = activeSubTab === 'manager'
    ? managerWorkflow.step !== 'idle' && managerWorkflow.step !== 'approving' && managerWorkflow.step !== 'error'
    : otherWorkflow.step === 'approved' || otherWorkflow.step === 'complete';

  const allTableSuccess = useMemo(() => {
    const result = new Map(ciTableAllSuccess);
    result.set('results', approvalsComplete);
    return result;
  }, [ciTableAllSuccess, approvalsComplete]);

  const toggleTxnExclude = (tableKey: string) => {
    setTxnExcludedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableKey)) next.delete(tableKey);
      else next.add(tableKey);
      return next;
    });
  };

  // Detect allSuccess transitions → clear manual overrides so auto behavior resumes.
  // Uses a ref for the previous snapshot (transition tracking, not a user preference).
  // Uses useEffect (not render-time setState) because manualOverrides lives in context.
  //
  // Key design decisions:
  //  - null sentinel: On mount (or remount after main-tab switch), the ref is null.
  //    The first effect run snapshots allTableSuccess without clearing overrides,
  //    so context-persisted overrides survive component remount.
  //  - Merge, don't replace: When sub-tabs switch, allTableSuccess has different keys.
  //    We merge current keys INTO the ref (preserving entries from other sub-tabs)
  //    so returning to a sub-tab doesn't see stale false→true "transitions".
  const prevAllSuccessRef = useRef<Map<string, boolean> | null>(null);

  useEffect(() => {
    // First run after (re)mount: snapshot current state, skip clearing.
    if (prevAllSuccessRef.current === null) {
      prevAllSuccessRef.current = new Map(allTableSuccess);
      return;
    }

    const prev = prevAllSuccessRef.current;

    // Clear overrides only for keys whose allSuccess genuinely transitioned.
    setManualOverrides(prevOverrides => {
      let changed = false;
      const next = new Map(prevOverrides);
      for (const [tableKey, allSuccess] of allTableSuccess) {
        if ((prev.get(tableKey) ?? false) !== allSuccess && next.has(tableKey)) {
          next.delete(tableKey);
          changed = true;
        }
      }
      return changed ? next : prevOverrides;
    });

    // Merge current keys into ref — preserves entries from other sub-tabs.
    for (const [key, value] of allTableSuccess) {
      prev.set(key, value);
    }
  }, [allTableSuccess, setManualOverrides]);

  // Determine effective collapse: manual override wins, else allSuccess auto-collapses.
  const isTableCollapsed = useCallback((tableKey: string): boolean => {
    const manual = manualOverrides.get(tableKey);
    if (manual !== undefined) return manual;
    return allTableSuccess.get(tableKey) ?? false;
  }, [manualOverrides, allTableSuccess]);

  // Toggle: sets the opposite of current effective state as a manual override.
  const toggleCollapse = useCallback((tableKey: string) => {
    setManualOverrides(prev => {
      const next = new Map(prev);
      const currentlyCollapsed = next.get(tableKey) ?? (allTableSuccess.get(tableKey) ?? false);
      next.set(tableKey, !currentlyCollapsed);
      return next;
    });
  }, [allTableSuccess, setManualOverrides]);

  // Disable checkboxes once the workflow leaves 'idle'. Changing selections
  // mid-workflow could orphan CI records that have already been approved/submitted.
  const workflowProcessing = activeSubTab === 'manager'
    ? managerWorkflow.step !== 'idle'
    : otherWorkflow.step !== 'idle';

  // Build columns dynamically from the first row's keys
  // Checkbox and status columns are prepended to the dynamic columns
  const columns = useMemo(() => {
    // Checkbox column definition (will be second after row number)
    const checkboxColumn: ColumnDef<SmartFormRecord> = {
      id: '__selected',
      header: (
        <TriStateCheckbox
          checked={selectedRows.size > 0 && selectedRows.size === filteredRecords.length}
          indeterminate={selectedRows.size > 0 && selectedRows.size < filteredRecords.length}
          disabled={workflowProcessing || filteredRecords.length === 0}
          onChange={(checked) => { setAllTransactionsSelected(checked); }}
          ariaLabel={`Select all ${activeSubTab} transactions`}
          className="dt-checkbox"
        />
      ),
      headerClassName: 'sf-ci-header--non-export',
      type: 'checkbox',
      align: 'center',
      width: '36px',
      checked: (row) => selectedRows.has(row.TRANSACTION_NBR),
      onCheckedChange: (row, checked) => {
        setTransactionSelected(row.TRANSACTION_NBR, checked);
      },
      checkboxDisabled: workflowProcessing,
    };

    // Approval status column (between checkbox and dynamic Oracle columns).
    // Unchecked rows display "skipped" with a neutral gray style instead of
    // their actual status, to reinforce that they won't be processed.
    const statusClassMap: Record<string, string> = {
      pending: 'pending',
      processing: 'processing',
      success: 'success',
      error: 'error',
      skipped: 'skipped',
    };

    const statusColumn: ColumnDef<SmartFormRecord> = {
      id: '__approval_status',
      header: 'Status',
      headerClassName: 'sf-ci-header--non-export',
      width: '90px',
      align: 'center',
      render: (_value, row) => {
        const isSelected = selectedRows.has(row.TRANSACTION_NBR);
        const displayStatus = isSelected ? row.status : 'skipped';
        const cssClass = statusClassMap[displayStatus] ?? displayStatus;
        return (
          <span className={`dt-status dt-status--${cssClass}`}>
            {displayStatus}
          </span>
        );
      },
    };

    if (filteredRecords.length === 0) {
      // Fallback: checkbox + status + minimal columns when no data
      return [
        checkboxColumn,
        statusColumn,
        { id: 'TRANSACTION_NBR', header: 'TRANSACTION_NBR', accessor: 'TRANSACTION_NBR' as const, type: 'mono' as const },
        { id: 'EMPLID', header: 'EMPLID', accessor: 'EMPLID' as const, type: 'mono' as const },
      ];
    }

    return [checkboxColumn, statusColumn, ...buildDynamicColumns(filteredRecords[0])];
  }, [filteredRecords, selectedRows, setTransactionSelected, setAllTransactionsSelected, workflowProcessing, activeSubTab]);

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

  // Main Results Section — extracted so it can be positioned above or below CI tables
  const resultsSection = (
    <div className="sf-results-container">
      <div className="sf-results-toolbar">
        <span className="sf-table-row-count">
          {rowCount} row{rowCount !== 1 ? 's' : ''}
        </span>
        <span className="sf-table-queue-label">
          {queueLabel} Approval Queue
        </span>
      </div>
      <h4 className={`sf-results-title${mainTableAllSuccess ? ' sf-title--success' : ''}`}>
        <div className="sf-ci-title-controls">
          <button
            type="button"
            className="sf-collapse-btn"
            title={isTableCollapsed('results') ? 'Expand table' : 'Collapse table'}
            aria-label={isTableCollapsed('results') ? 'Expand Pending Transactions' : 'Collapse Pending Transactions'}
            aria-expanded={!isTableCollapsed('results')}
            onClick={() => { toggleCollapse('results'); }}
          >
            <ChevronIcon className={`sf-collapse-chevron${isTableCollapsed('results') ? '' : ' sf-collapse-chevron--expanded'}`} />
          </button>
          <button
            type="button"
            className="sf-download-btn"
            title="Download checked transactions as Excel"
            aria-label="Download checked transactions as Excel"
            onClick={() => {
              const checked = filteredRecords.filter(r => selectedRows.has(r.TRANSACTION_NBR));
              if (checked.length === 0) return;
              exportToExcel(
                checked as Record<string, unknown>[],
                buildResultsExcelColumns(checked[0]),
                buildExcelFileName('Pending_Transactions'),
              );
            }}
          >
            <DownloadIcon />
            Download Excel
          </button>
        </div>
        Pending Transactions
      </h4>
      {!isTableCollapsed('results') && (
        <DataTable
          className="sf-table"
          columns={columns}
          data={filteredRecords}
          keyAccessor="TRANSACTION_NBR"
          showRowNumbers={true}
          stickyColumns={4}
          staggerRows={true}
          enableCellSelection={true}
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
      )}
    </div>
  );

  return (
    <div ref={crossHoverRef} className="sf-tables-wrapper">
      {/* Manager tab: results table appears ABOVE CI preview tables */}
      {activeSubTab === 'manager' && resultsSection}

      {/* CI Preview Tables */}
      {CI_PREVIEW_CONFIG.map(({ template, dataKey, tabFilter, checkDuplicates }) => {
        // Only show table on its designated sub-tab(s)
        if (!tabFilter.some(t => t === activeSubTab)) return null;

        const allRecords = parsedCIData[dataKey] as ParsedCIRecordBase[];
        const records = allRecords.filter(r => selectedRows.has(r.transactionNbr));
        if (records.length === 0) return null;

        const tableKey = `${activeSubTab}-${dataKey}`;
        const includeTxnNbr = !txnExcludedTables.has(tableKey);

        const ciColumns = buildCIPreviewColumns(template, getLabel, includeTxnNbr);
        const showStatusColumn = statusMaps.has(dataKey);
        const dataStatusMap = showStatusColumn
          ? (statusMaps.get(dataKey) ?? new Map<string, PreparedSubmissionStatus>())
          : null;
        const finalColumns = dataStatusMap
          ? [buildStatusColumn(dataStatusMap), ...ciColumns]
          : ciColumns;

        const duplicateSet = checkDuplicates
          ? (ciDuplicateSets.get(dataKey) ?? new Set<string>())
          : new Set<string>();
        const duplicateCount = duplicateSet.size;

        // Excel export excludes duplicates (when detection is enabled)
        const exportRecords = checkDuplicates
          ? filterCIDuplicates(records, template.fields)
          : records;

        const isCollapsed = isTableCollapsed(tableKey);
        const allSuccess = ciTableAllSuccess.get(tableKey) ?? false;

        // Excel columns — conditionally drop TRANSACTION_NBR when toggle is unchecked
        const excelColumns = buildCIExcelColumns(template);
        const finalExcelColumns = includeTxnNbr
          ? excelColumns
          : excelColumns.filter(c => c.accessor !== 'transactionNbr');

        return (
          <div key={dataKey} className="sf-ci-preview-container">
            <h4 className={`sf-ci-preview-title${allSuccess ? ' sf-title--success' : ''}`}>
              <div className="sf-ci-title-controls">
                <button
                  type="button"
                  className="sf-collapse-btn"
                  title={isCollapsed ? 'Expand table' : 'Collapse table'}
                  aria-label={isCollapsed ? `Expand ${template.queryFieldName}` : `Collapse ${template.queryFieldName}`}
                  aria-expanded={!isCollapsed}
                  onClick={() => { toggleCollapse(tableKey); }}
                >
                  <ChevronIcon className={`sf-collapse-chevron${isCollapsed ? '' : ' sf-collapse-chevron--expanded'}`} />
                </button>
                <button
                  type="button"
                  className="sf-download-btn"
                  title={`Download ${template.queryFieldName} as Excel`}
                  aria-label={`Download ${template.queryFieldName} as Excel`}
                  onClick={() => {
                    exportToExcel(
                      exportRecords as unknown as Record<string, unknown>[],
                      finalExcelColumns,
                      buildExcelFileName(template.queryFieldName),
                    );
                  }}
                >
                  <DownloadIcon />
                  Download Excel
                </button>
                <label className="sf-ci-txn-toggle" title="Include Transaction Number in download">
                  <input
                    type="checkbox"
                    checked={includeTxnNbr}
                    onChange={() => { toggleTxnExclude(tableKey); }}
                  />
                  Include Transaction Column
                </label>
              </div>
              {template.queryFieldName}
              <span className="sf-ci-submit-count">
                {exportRecords.length} submission{exportRecords.length !== 1 ? 's' : ''}
              </span>
              {duplicateCount > 0 && (
                <span className="sf-ci-duplicate-count">
                  {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''} excluded
                </span>
              )}
            </h4>
            {!isCollapsed && (
              <DataTable
                className="sf-ci-preview-table"
                columns={finalColumns}
                data={records}
                keyAccessor="transactionNbr"
                showRowNumbers={true}
                stickyColumns={showStatusColumn ? 3 : 2}
                enableCellSelection={true}
                emptyMessage="No records"
                ariaLabel={`${template.queryFieldName} preview`}
                rowConfig={duplicateCount > 0 ? {
                  className: (row) =>
                    duplicateSet.has(row.transactionNbr)
                      ? 'sf-ci-row--duplicate'
                      : '',
                } : undefined}
              />
            )}
          </div>
        );
      })}

      {/* Other tab: results table appears BELOW CI preview tables */}
      {activeSubTab !== 'manager' && resultsSection}
    </div>
  );
}
