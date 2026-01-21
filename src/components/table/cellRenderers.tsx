/**
 * Cell Renderer Components
 *
 * Cell rendering logic using a registry pattern instead of switch statement.
 * This avoids the react-refresh ESLint rule while keeping code organized.
 *
 * @internal Not exported from barrel - internal implementation only
 */

import type { ReactNode } from 'react';
import type { ColumnDef } from '../../types/table';
import { formatCellValue, resolveValue } from './tableHelpers';

/* ==============================================
   Types
   ============================================== */

/**
 * Props passed to all cell renderer functions.
 */
export interface CellRendererProps<TData> {
  /** Column definition */
  column: ColumnDef<TData>;
  /** Row data */
  row: TData;
  /** Extracted cell value */
  value: unknown;
  /** Row index */
  index: number;
}

/* ==============================================
   Cell Renderer Functions
   ============================================== */

/**
 * Renders a monospace text cell.
 */
const renderMonoCell = (value: unknown): ReactNode => (
  <span className="dt-mono">
    {formatCellValue(value)}
  </span>
);

/**
 * Renders a right-aligned number cell with tabular figures.
 */
const renderNumberCell = (value: unknown): ReactNode => (
  <span className="dt-number">
    {formatCellValue(value)}
  </span>
);

/**
 * Renders a status badge cell with color-coded background.
 */
const renderStatusCell = <TData,>(
  column: ColumnDef<TData>,
  value: unknown
): ReactNode => {
  const statusValue = formatCellValue(value);
  const statusClass = column.statusClassMap?.[statusValue] ?? statusValue;

  return (
    <span className={`dt-status dt-status--${statusClass}`}>
      {statusValue}
    </span>
  );
};

/**
 * Renders an action button cell.
 */
const renderButtonCell = <TData,>(
  column: ColumnDef<TData>,
  row: TData,
  index: number
): ReactNode => {
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
};

/**
 * Renders a checkbox cell.
 */
const renderCheckboxCell = <TData,>(
  column: ColumnDef<TData>,
  row: TData,
  _index: number,
  onChangeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void
): ReactNode => {
  const checked = column.checked?.(row) ?? false;
  const disabled = resolveValue(column.checkboxDisabled, row, false);

  return (
    <input
      type="checkbox"
      className="dt-checkbox"
      checked={checked}
      onChange={onChangeHandler}
      disabled={disabled}
    />
  );
};

/* ==============================================
   Cell Render Dispatch
   ============================================== */

/**
 * Render a cell based on column type.
 * Custom render function takes precedence over type-based rendering.
 */
export function renderCell<TData>(props: CellRendererProps<TData>): ReactNode {
  const { column, row, value, index } = props;

  // Custom render takes precedence
  if (column.render) {
    return column.render(value, row, index);
  }

  // Type-specific rendering
  switch (column.type) {
    case 'status':
      return renderStatusCell(column, value);

    case 'button':
      return renderButtonCell(column, row, index);

    case 'checkbox': {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        column.onCheckedChange?.(row, e.target.checked, index);
      };
      return renderCheckboxCell(column, row, index, handleChange);
    }

    case 'number':
      return renderNumberCell(value);

    case 'mono':
      return renderMonoCell(value);

    case 'custom':
      // Custom type requires render function, fallback to text
      return formatCellValue(value);

    case 'text':
    default:
      return formatCellValue(value);
  }
}
