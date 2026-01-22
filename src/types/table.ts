/**
 * Table Types
 *
 * Generic type definitions for the reusable DataTable component.
 * Supports various column types including text, status badges,
 * checkboxes, buttons, and custom renderers.
 *
 * @example
 * const columns: ColumnDef<MyRecord>[] = [
 *   { id: 'name', header: 'Name', accessor: 'name' },
 *   { id: 'status', header: 'Status', accessor: 'status', type: 'status' },
 *   { id: 'action', header: '', type: 'button', buttonLabel: 'Edit', onClick: handleEdit },
 * ];
 */

import type { ReactNode } from 'react';

/* ==============================================
   Column Types
   ============================================== */

/**
 * Built-in column types with predefined styling.
 *
 * - `text`: Default text rendering
 * - `mono`: Monospace font (for IDs, codes, dates)
 * - `number`: Right-aligned number
 * - `status`: Status badge with color mapping
 * - `checkbox`: Interactive checkbox
 * - `button`: Clickable button
 * - `custom`: Fully custom render function
 */
export type ColumnType =
  | 'text'
  | 'mono'
  | 'number'
  | 'status'
  | 'checkbox'
  | 'button'
  | 'custom';

/**
 * Cell alignment options.
 */
export type CellAlignment = 'left' | 'center' | 'right';

/* ==============================================
   Column Definition
   ============================================== */

/**
 * Defines a single column in the table.
 * Generic over the row data type for type-safe accessors.
 *
 * @template TData - The type of each row's data object
 */
export interface ColumnDef<TData> {
  /** Unique identifier for the column */
  id: string;

  /** Column header text (can be empty for action columns) */
  header: string;

  /**
   * How to access the cell value from the row data.
   * Can be a key of TData or a function that extracts the value.
   *
   * @example
   * accessor: 'employeeName'  // Direct key access
   * accessor: (row) => `${row.firstName} ${row.lastName}`  // Computed value
   */
  accessor?: keyof TData | ((row: TData) => unknown);

  /** Column type - determines styling and rendering behavior */
  type?: ColumnType;

  /** Optional fixed width (CSS value like '100px' or '10%') */
  width?: string;

  /** Cell content alignment */
  align?: CellAlignment;

  /** Whether this column should use monospace font (shorthand for type: 'mono') */
  mono?: boolean;

  /* ----- Status Column Options ----- */

  /**
   * For status columns: maps status values to CSS class modifiers.
   * The modifier is appended to the base status class.
   *
   * @example
   * statusClassMap: {
   *   pending: 'pending',    // Results in: dt-status--pending
   *   success: 'success',    // Results in: dt-status--success
   * }
   */
  statusClassMap?: Record<string, string>;

  /* ----- Button Column Options ----- */

  /** Button click handler */
  onClick?: (row: TData, index: number) => void;

  /** Button label - can be static string or function of row */
  buttonLabel?: string | ((row: TData) => string);

  /** Whether button should be disabled */
  buttonDisabled?: boolean | ((row: TData) => boolean);

  /* ----- Checkbox Column Options ----- */

  /** Function to determine if checkbox is checked */
  checked?: (row: TData) => boolean;

  /** Checkbox change handler */
  onCheckedChange?: (row: TData, checked: boolean, index: number) => void;

  /** Whether checkbox should be disabled */
  checkboxDisabled?: boolean | ((row: TData) => boolean);

  /* ----- Custom Render ----- */

  /**
   * Custom render function for complete control over cell content.
   * When provided, overrides the default rendering for this column.
   *
   * @example
   * render: (value, row, index) => (
   *   <span className={row.isHighlighted ? 'highlight' : ''}>
   *     {String(value)}
   *   </span>
   * )
   */
  render?: (value: unknown, row: TData, index: number) => ReactNode;

  /* ----- Cell Styling ----- */

  /**
   * Function to compute additional CSS classes for cells in this column.
   * Useful for conditional styling based on cell value or row data.
   */
  cellClassName?: string | ((value: unknown, row: TData, index: number) => string);

  /**
   * Additional CSS class for the header cell.
   */
  headerClassName?: string;
}

/* ==============================================
   Row Configuration
   ============================================== */

/**
 * Configuration for row-level behavior and styling.
 */
export interface RowConfig<TData> {
  /**
   * Function to compute CSS class names for a row.
   * Useful for conditional row highlighting.
   *
   * @example
   * rowClassName: (row) => row.isUrgent ? 'row--urgent' : ''
   */
  className?: (row: TData, index: number) => string;

  /**
   * Click handler for the entire row.
   */
  onClick?: (row: TData, index: number) => void;
}

/* ==============================================
   Toolbar Configuration
   ============================================== */

/**
 * Configuration for the optional table toolbar.
 */
export interface ToolbarConfig {
  /** Content for the left side of the toolbar */
  left?: ReactNode;

  /** Content for the right side of the toolbar */
  right?: ReactNode;
}

/* ==============================================
   Table Props
   ============================================== */

/**
 * Props for the DataTable component.
 *
 * @template TData - The type of each row's data object
 */
export interface DataTableProps<TData> {
  /** Column definitions */
  columns: ColumnDef<TData>[];

  /** Array of row data */
  data: TData[];

  /**
   * How to extract a unique key from each row.
   * Used for React's key prop.
   *
   * @example
   * keyAccessor: 'id'  // Use the 'id' field
   * keyAccessor: (row) => `${row.type}-${row.id}`  // Computed key
   */
  keyAccessor: keyof TData | ((row: TData) => string | number);

  /** Row-level configuration */
  rowConfig?: RowConfig<TData>;

  /** Optional toolbar configuration */
  toolbar?: ToolbarConfig;

  /** Message shown when data array is empty */
  emptyMessage?: string;

  /** CSS class for theming (applied to container) */
  className?: string;

  /** Accessible label for the table */
  ariaLabel?: string;

  /** Optional ARIA role panel attributes for tab integration */
  tabPanel?: {
    id: string;
    labelledBy: string;
  };

  /** Whether to show row numbers as first column */
  showRowNumbers?: boolean;

  /**
   * Enable stagger animation for table rows.
   * Rows animate in with a cascading delay effect.
   *
   * - `true` uses default timing (0.03s delay between rows)
   * - Object allows customizing delay and offset
   *
   * @example
   * staggerRows={true}
   * staggerRows={{ delay: 0.05, offset: 15 }}
   */
  staggerRows?: boolean | {
    /** Delay between each row animation (seconds). Default: 0.03 */
    delay?: number;
    /** Y offset to animate from (pixels). Default: 12 */
    offset?: number;
  };
}
