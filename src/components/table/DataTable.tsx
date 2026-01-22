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
 *   staggerRows={true}
 * />
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { FadeIn } from '../motion';
import type { DataTableProps, ColumnDef } from '../../types/table';
import { renderCell } from './cellRenderers';
import { getValue, getRowKey, getAlignClass } from './tableHelpers';
import './DataTable.css';

/* ==============================================
   Stagger Animation Configuration
   ============================================== */

const STAGGER_DEFAULTS = {
  /** Target total duration for all rows to start animating (seconds) */
  targetDuration: 0.25,
  /** Minimum delay between rows (seconds) */
  minDelay: 0.01,
  /** Maximum delay between rows (seconds) */
  maxDelay: 0.035,
  /** Y offset for row animation (0 = opacity only) */
  offset: 0,
} as const;

/**
 * Creates stagger container variants for tbody.
 * Uses `staggerChildren` to delay each row's animation.
 */
function createContainerVariants(staggerDelay: number): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        // Slightly delay start to let container settle
        delayChildren: 0.05,
      },
    },
  };
}

/**
 * Creates stagger item variants for each tr.
 * Uses subtle opacity fade with minimal Y movement to avoid scrollbar flicker.
 */
function createRowVariants(offset: number): Variants {
  // Use opacity-only when offset is 0 for cleanest animation
  const hidden = offset > 0
    ? { opacity: 0, y: offset }
    : { opacity: 0 };

  const visible = offset > 0
    ? { opacity: 1, y: 0 }
    : { opacity: 1 };

  return {
    hidden,
    visible: {
      ...visible,
      transition: {
        duration: 0.25,
        ease: 'easeOut',
      },
    },
  };
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
  staggerRows = false,
}: DataTableProps<TData>) {
  const prefersReducedMotion = useReducedMotion();

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

  // Parse stagger configuration
  const staggerEnabled = Boolean(staggerRows) && !prefersReducedMotion;
  const staggerConfig = typeof staggerRows === 'object' ? staggerRows : {};
  const staggerOffset = staggerConfig.offset ?? STAGGER_DEFAULTS.offset;

  // Calculate adaptive stagger delay based on row count
  // More rows = smaller delay to keep total animation time consistent
  const rowCount = data.length;
  const calculatedDelay = rowCount > 1
    ? STAGGER_DEFAULTS.targetDuration / (rowCount - 1)
    : STAGGER_DEFAULTS.minDelay;
  const staggerDelay = staggerConfig.delay
    ?? Math.min(STAGGER_DEFAULTS.maxDelay, Math.max(STAGGER_DEFAULTS.minDelay, calculatedDelay));

  // Create variants only when stagger is enabled
  const containerVariants = staggerEnabled ? createContainerVariants(staggerDelay) : undefined;
  const rowVariants = staggerEnabled ? createRowVariants(staggerOffset) : undefined;

  // Render a single table row (shared between stagger and non-stagger modes)
  const renderRow = (row: TData, index: number) => {
    const rowKey = getRowKey(row, keyAccessor);
    const rowClassName = rowConfig?.className?.(row, index) ?? '';
    const rowClickHandler = rowConfig?.onClick;
    const combinedRowClass = `${rowClassName} ${rowClickHandler ? 'dt-row--clickable' : ''}`.trim();

    const cells = effectiveColumns.map(column => {
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
    });

    // Use motion.tr when stagger is enabled
    if (staggerEnabled && rowVariants) {
      return (
        <motion.tr
          key={rowKey}
          className={combinedRowClass}
          variants={rowVariants}
          onClick={
            rowClickHandler
              ? () => { rowClickHandler(row, index); }
              : undefined
          }
        >
          {cells}
        </motion.tr>
      );
    }

    // Standard tr when stagger is disabled
    return (
      <tr
        key={rowKey}
        className={combinedRowClass}
        onClick={
          rowClickHandler
            ? () => { rowClickHandler(row, index); }
            : undefined
        }
      >
        {cells}
      </tr>
    );
  };

  // Render tbody with or without stagger animation
  const renderTbody = () => {
    if (data.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={totalColumns} className="dt-empty">
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      );
    }

    if (staggerEnabled && containerVariants) {
      // Key forces re-mount (and re-animation) when tabPanel.id changes
      // This ensures stagger runs when switching between sub-tabs
      const animationKey = tabPanel?.id;

      return (
        <motion.tbody
          key={animationKey}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {data.map(renderRow)}
        </motion.tbody>
      );
    }

    return <tbody>{data.map(renderRow)}</tbody>;
  };

  return (
    <FadeIn
      className={`dt-container ${className}`.trim()}
      {...(tabPanel && {
        role: 'tabpanel',
        id: tabPanel.id,
        'aria-labelledby': tabPanel.labelledBy,
      })}
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
          {renderTbody()}
        </table>
      </div>
    </FadeIn>
  );
}
