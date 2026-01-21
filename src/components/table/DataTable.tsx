/**
 * DataTable Component
 *
 * A reusable, generic table component that renders data based on
 * column definitions. Supports various column types including
 * text, status badges, checkboxes, buttons, and custom renderers.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { id: 'name', header: 'Name', accessor: 'name' },
 *     { id: 'status', header: 'Status', accessor: 'status', type: 'status' },
 *   ]}
 *   data={records}
 *   keyAccessor="id"
 *   emptyMessage="No records found"
 * />
 */

import { motion } from 'framer-motion';
import { fadeIn } from '../../utils/motion';
import type { DataTableProps, ColumnDef } from '../../types/table';
import { renderCell } from './cellRenderers';
import { getValue, getRowKey, getAlignClass } from './tableHelpers';
import './DataTable.css';

/* ==============================================
   Main Component
   ============================================== */

export function DataTable<TData>({
  columns,
  data,
  keyAccessor,
  rowConfig,
  toolbar,
  emptyMessage = 'No data available',
  className = '',
  ariaLabel,
  tabPanel,
  showRowNumbers = false,
}: DataTableProps<TData>) {
  // Build effective columns (prepend row number if enabled)
  const effectiveColumns: ColumnDef<TData>[] = showRowNumbers
    ? [
        {
          id: '__rowNumber',
          header: '#',
          width: '3rem',
          align: 'center',
          render: (_value, _row, index) => index + 1,
        },
        ...columns,
      ]
    : columns;

  // Compute total columns for empty state colspan
  const totalColumns = effectiveColumns.length;

  return (
    <motion.div
      className={`dt-container ${className}`.trim()}
      {...(tabPanel && {
        role: 'tabpanel',
        id: tabPanel.id,
        'aria-labelledby': tabPanel.labelledBy,
      })}
      {...fadeIn}
    >
      {/* Toolbar */}
      {toolbar && (toolbar.left || toolbar.right) && (
        <div className="dt-toolbar">
          <div className="dt-toolbar-left">{toolbar.left}</div>
          <div className="dt-toolbar-right">{toolbar.right}</div>
        </div>
      )}

      {/* Table */}
      <div className="dt-scroll-container">
        <table className="dt-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {effectiveColumns.map(column => (
                <th
                  key={column.id}
                  className={`
                    ${getAlignClass(column.align)}
                    ${column.headerClassName ?? ''}
                  `.trim()}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className="dt-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowKey = getRowKey(row, keyAccessor);
                const rowClassName = rowConfig?.className?.(row, index) ?? '';
                const rowClickHandler = rowConfig?.onClick;

                return (
                  <tr
                    key={rowKey}
                    className={`${rowClassName} ${rowClickHandler ? 'dt-row--clickable' : ''}`.trim()}
                    onClick={
                      rowClickHandler
                        ? () => { rowClickHandler(row, index); }
                        : undefined
                    }
                  >
                    {effectiveColumns.map(column => {
                      const value = getValue(row, column.accessor);
                      const cellClassFn = column.cellClassName;
                      const cellClass =
                        typeof cellClassFn === 'function'
                          ? cellClassFn(value, row, index)
                          : cellClassFn ?? '';

                      return (
                        <td
                          key={column.id}
                          className={`
                            ${getAlignClass(column.align)}
                            ${(column.mono || column.type === 'mono') ? 'dt-cell--mono' : ''}
                            ${column.type === 'number' ? 'dt-cell--number' : ''}
                            ${cellClass}
                          `.trim()}
                        >
                          {renderCell({ column, row, value, index })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
