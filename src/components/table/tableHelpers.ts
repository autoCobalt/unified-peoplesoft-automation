/**
 * Table Helper Functions
 *
 * Pure utility functions for the DataTable component.
 * These have no React dependencies and handle data extraction,
 * formatting, and CSS class computation.
 *
 * @internal Not exported from barrel - internal implementation only
 */

import type { ColumnDef, DataTableProps, CellAlignment } from '../../types/table';

/* ==============================================
   Value Formatting
   ============================================== */

/**
 * Safely convert an unknown value to a display string.
 * Only converts primitives; objects return empty string to avoid [object Object].
 */
export function formatCellValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/* ==============================================
   Data Access
   ============================================== */

/**
 * Get the value from a row using the accessor.
 * Supports both property keys and accessor functions.
 */
export function getValue<TData>(
  row: TData,
  accessor: ColumnDef<TData>['accessor']
): unknown {
  if (accessor === undefined) return undefined;
  if (typeof accessor === 'function') return accessor(row);
  return row[accessor];
}

/**
 * Get the unique key for a row.
 * Used for React's key prop in row mapping.
 */
export function getRowKey<TData>(
  row: TData,
  keyAccessor: DataTableProps<TData>['keyAccessor']
): string | number {
  if (typeof keyAccessor === 'function') return keyAccessor(row);
  return row[keyAccessor] as string | number;
}

/* ==============================================
   CSS Class Utilities
   ============================================== */

/**
 * Get cell alignment CSS class.
 * Returns empty string for left alignment (default).
 */
export function getAlignClass(align?: CellAlignment): string {
  if (!align || align === 'left') return '';
  return `dt-cell--${align}`;
}

/* ==============================================
   Generic Value Resolution
   ============================================== */

/**
 * Resolve a value that can be a static value or function of row.
 * Used for props like buttonLabel, buttonDisabled, etc.
 */
export function resolveValue<TData, TValue>(
  value: TValue | ((row: TData) => TValue) | undefined,
  row: TData,
  defaultValue: TValue
): TValue {
  if (value === undefined) return defaultValue;
  if (typeof value === 'function') return (value as (row: TData) => TValue)(row);
  return value;
}
