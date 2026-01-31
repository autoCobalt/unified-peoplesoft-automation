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

import { useState, useRef, useEffect, useCallback } from 'react';
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
  targetDuration: 0.18,
  /** Minimum delay between rows (seconds) */
  minDelay: 0.008,
  /** Maximum delay between rows (seconds) */
  maxDelay: 0.025,
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
        delayChildren: 0.03,
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
        duration: 0.2,
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
  stickyColumns = 0,
  staggerRows = false,
}: DataTableProps<TData>) {
  const prefersReducedMotion = useReducedMotion();

  // Scroll state for shadow indicators
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sticky column left offsets (measured from actual DOM)
  const [stickyOffsets, setStickyOffsets] = useState<number[]>([]);

  /**
   * Updates scroll state based on current scroll position.
   * Called on scroll events and on mount/data changes.
   */
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const tolerance = 1; // Account for sub-pixel rounding

    // Check if horizontal scrolling is possible at all
    const scrollingPossible = scrollWidth > clientWidth + tolerance;
    setCanScroll(scrollingPossible);

    setCanScrollLeft(scrollLeft > tolerance);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - tolerance);
  }, []);

  /**
   * Measures actual header cell widths and calculates cumulative offsets
   * for sticky column positioning. Uses getBoundingClientRect() for
   * sub-pixel precision to prevent tiny shifts when sticky activates.
   * Also sets a CSS variable for total sticky column width (used for border highlight).
   */
  const measureStickyOffsets = useCallback(() => {
    if (!theadRef.current || stickyColumns <= 0) return;

    const headerRow = theadRef.current.querySelector('tr');
    if (!headerRow) return;

    const cells = headerRow.querySelectorAll('th');
    if (cells.length === 0) return;

    // Use cumulative widths so sticky cells sit flush against each other.
    // Position-based offsets (cellRect.left) include collapsed-border gaps
    // between cells, leaving uncovered strips where scrolled content bleeds through.
    const offsets: number[] = [];
    let cumulativeLeft = 0;

    for (let i = 0; i < stickyColumns && i < cells.length; i++) {
      offsets.push(cumulativeLeft);
      cumulativeLeft += Math.round(cells[i].getBoundingClientRect().width);
    }

    setStickyOffsets(offsets);

    // Set CSS variable for total sticky column width (for border highlight overlay)
    if (stickyColumns > 0 && stickyColumns <= cells.length) {
      // cumulativeLeft is now the sum of all sticky cell widths
      const totalStickyWidth = cumulativeLeft;

      // Set CSS variable on the scroll wrapper (with defensive guard against NaN/Infinity)
      if (scrollContainerRef.current?.parentElement && Number.isFinite(totalStickyWidth)) {
        scrollContainerRef.current.parentElement.style.setProperty(
          '--dt-sticky-width',
          `${String(totalStickyWidth)}px`
        );
      }
    }
  }, [stickyColumns]);

  // Use ResizeObserver to measure sticky offsets when table layout changes
  // ResizeObserver fires on initial observe, so no separate initial call needed
  useEffect(() => {
    if (!theadRef.current || stickyColumns <= 0) return;

    const observer = new ResizeObserver(() => {
      measureStickyOffsets();
    });

    // Observe the thead element - this triggers an initial callback
    observer.observe(theadRef.current);

    return () => {
      observer.disconnect();
    };
  }, [measureStickyOffsets, stickyColumns]);

  // Update scroll state on mount and when data changes
  useEffect(() => {
    updateScrollState();

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, data]);

  // Build effective columns (prepend row number if enabled)
  // Fixed width prevents table auto-layout from varying the column size,
  // which would shift sticky offsets for subsequent columns on resize.
  const effectiveColumns: ColumnDef<TData>[] = showRowNumbers
    ? [
        {
          id: '__rowNumber',
          header: '#',
          align: 'center',
          width: '20px',
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

    const cells = effectiveColumns.map((column, colIndex) => {
      const value = getValue(row, column.accessor);
      const cellClassFn = column.cellClassName;
      const cellClass =
        typeof cellClassFn === 'function'
          ? cellClassFn(value, row, index)
          : cellClassFn ?? '';

      const isSticky = colIndex < stickyColumns;
      const stickyLeft = isSticky ? stickyOffsets[colIndex] : undefined;
      // Only mark as null if column has an accessor (data columns, not computed/action columns)
      const isNullValue = column.accessor !== undefined && (value === null || value === undefined);

      return (
        <td
          key={column.id}
          className={`
            ${getAlignClass(column.align)}
            ${(column.mono || column.type === 'mono') ? 'dt-cell--mono' : ''}
            ${column.type === 'number' ? 'dt-cell--number' : ''}
            ${isSticky ? 'dt-sticky-col' : ''}
            ${colIndex === stickyColumns - 1 ? 'dt-sticky-col-last' : ''}
            ${isNullValue ? 'dt-cell--null' : ''}
            ${cellClass}
          `.trim()}
          style={{
            ...(stickyLeft !== undefined && { left: stickyLeft }),
            ...(isSticky && column.width && { width: column.width, minWidth: column.width, maxWidth: column.width }),
          }}
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
          data-row-key={String(rowKey)}
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
        data-row-key={String(rowKey)}
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

      {/* Table with scroll wrapper for shadow indicators */}
      <div
        className="dt-scroll-wrapper"
        data-can-scroll={canScroll}
        data-can-scroll-left={canScrollLeft}
        data-can-scroll-right={canScrollRight}
      >
        <div
          ref={scrollContainerRef}
          className="dt-scroll-container"
          onScroll={updateScrollState}
        >
          <table className="dt-table" aria-label={ariaLabel}>
            <thead ref={theadRef}>
              <tr>
                {effectiveColumns.map((column, colIndex) => {
                  const isSticky = colIndex < stickyColumns;
                  const stickyLeft = isSticky ? stickyOffsets[colIndex] : undefined;

                  return (
                    <th
                      key={column.id}
                      className={`
                        ${getAlignClass(column.align)}
                        ${column.headerClassName ?? ''}
                        ${isSticky ? 'dt-sticky-col' : ''}
                        ${colIndex === stickyColumns - 1 ? 'dt-sticky-col-last' : ''}
                      `.trim()}
                      style={{
                        ...(column.width && {
                          width: column.width,
                          ...(isSticky && { minWidth: column.width, maxWidth: column.width }),
                        }),
                        ...(stickyLeft !== undefined && { left: stickyLeft }),
                      }}
                    >
                      {column.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            {renderTbody()}
          </table>
        </div>
      </div>
    </FadeIn>
  );
}
