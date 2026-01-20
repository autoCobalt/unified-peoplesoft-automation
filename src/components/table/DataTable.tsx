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
import type { DataTableProps, ColumnDef, CellAlignment } from '../../types/table';
import './DataTable.css';

/* ==============================================
   Helper Functions
   ============================================== */

/**
 * Safely convert an unknown value to a display string.
 * Only converts primitives; objects return empty string to avoid [object Object].
 */
function formatCellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/**
 * Get the value from a row using the accessor.
 */
function getValue<TData>(
  row: TData,
  accessor: ColumnDef<TData>['accessor']
): unknown {
  if (accessor === undefined) return undefined;
  if (typeof accessor === 'function') return accessor(row);
  return row[accessor];
}

/**
 * Get the unique key for a row.
 */
function getRowKey<TData>(
  row: TData,
  keyAccessor: DataTableProps<TData>['keyAccessor']
): string | number {
  if (typeof keyAccessor === 'function') return keyAccessor(row);
  return row[keyAccessor] as string | number;
}

/**
 * Get cell alignment class.
 */
function getAlignClass(align?: CellAlignment): string {
  if (!align || align === 'left') return '';
  return `dt-cell--${align}`;
}

/**
 * Resolve a value that can be a static value or function of row.
 */
function resolveValue<TData, TValue>(
  value: TValue | ((row: TData) => TValue) | undefined,
  row: TData,
  defaultValue: TValue
): TValue {
  if (value === undefined) return defaultValue;
  if (typeof value === 'function') return (value as (row: TData) => TValue)(row);
  return value;
}

/* ==============================================
   Cell Renderers
   ============================================== */

interface CellRendererProps<TData> {
  column: ColumnDef<TData>;
  row: TData;
  value: unknown;
  index: number;
}

/**
 * Render a status badge cell.
 */
function StatusCell<TData>({ column, value }: CellRendererProps<TData>) {
  const statusValue = formatCellValue(value);
  const statusClass = column.statusClassMap?.[statusValue] ?? statusValue;

  return (
    <span className={`dt-status dt-status--${statusClass}`}>
      {statusValue}
    </span>
  );
}

/**
 * Render a button cell.
 */
function ButtonCell<TData>({ column, row, index }: CellRendererProps<TData>) {
  const label = resolveValue(column.buttonLabel, row, 'Action');
  const disabled = resolveValue(column.buttonDisabled, row, false);

  const handleClick = () => {
    column.onClick?.(row, index);
  };

  return (
    <button
      type="button"
      className="dt-button"
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

/**
 * Render a checkbox cell.
 */
function CheckboxCell<TData>({ column, row, index }: CellRendererProps<TData>) {
  const checked = column.checked?.(row) ?? false;
  const disabled = resolveValue(column.checkboxDisabled, row, false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    column.onCheckedChange?.(row, e.target.checked, index);
  };

  return (
    <input
      type="checkbox"
      className="dt-checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}

/**
 * Render a cell based on column type.
 */
function renderCell<TData>(props: CellRendererProps<TData>): React.ReactNode {
  const { column, row, value, index } = props;

  // Custom render takes precedence
  if (column.render) {
    return column.render(value, row, index);
  }

  // Type-specific rendering
  switch (column.type) {
    case 'status':
      return <StatusCell {...props} />;

    case 'button':
      return <ButtonCell {...props} />;

    case 'checkbox':
      return <CheckboxCell {...props} />;

    case 'number':
      return (
        <span className="dt-number">
          {formatCellValue(value)}
        </span>
      );

    case 'mono':
      return (
        <span className="dt-mono">
          {formatCellValue(value)}
        </span>
      );

    case 'custom':
      // Custom type requires render function, fallback to text
      return formatCellValue(value);

    case 'text':
    default:
      return formatCellValue(value);
  }
}

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
