/**
 * useCellSelection Hook
 *
 * Provides Excel-like rectangular cell selection for DataTable.
 * Click-drag to select cells, Ctrl+C / Cmd+C to copy as TSV.
 *
 * Performance strategy:
 * - During drag: imperative DOM manipulation (classList + inline boxShadow) → zero re-renders
 * - On mouseup: commit final selection to React state → one clean re-render
 * - Auto-scrolls horizontally when cursor is near scroll container edges
 */

import { useState, useRef, useEffect, useCallback, type RefObject, type CSSProperties } from 'react';

/* ==============================================
   Types
   ============================================== */

interface CellCoord {
  row: number;
  col: number;
}

interface CellSelection {
  start: CellCoord;
  end: CellCoord;
}

interface UseCellSelectionOptions {
  /** Whether cell selection is enabled */
  enabled: boolean;
  /** Ref to the .dt-scroll-container for auto-scrolling */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

interface UseCellSelectionReturn {
  /** Ref to attach to the <table> element */
  tableRef: RefObject<HTMLTableElement | null>;
  /** Current committed selection (null when nothing selected) */
  selection: CellSelection | null;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Get CSS class for a cell based on selection state */
  getCellSelectionClass: (row: number, col: number) => string;
  /** Get inline style for a cell's selection border (box-shadow) */
  getCellSelectionStyle: (row: number, col: number) => CSSProperties | undefined;
}

/* ==============================================
   Constants
   ============================================== */

/** Interactive elements that should not trigger cell selection */
const INTERACTIVE_SELECTOR = 'input, button, a, select, textarea, label';

/** Pixels from scroll container edge to trigger auto-scroll */
const AUTO_SCROLL_ZONE = 40;

/** Pixels to scroll per animation frame during auto-scroll */
const AUTO_SCROLL_SPEED = 8;

/** Border width for selection outline */
const BORDER_WIDTH = '2px';

/** CSS variable for selection border color */
const BORDER_COLOR = 'var(--accent-primary)';

/* ==============================================
   Helpers
   ============================================== */

/** Normalize a selection so start <= end for both axes */
function normalizeSelection(sel: CellSelection): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  return {
    minRow: Math.min(sel.start.row, sel.end.row),
    maxRow: Math.max(sel.start.row, sel.end.row),
    minCol: Math.min(sel.start.col, sel.end.col),
    maxCol: Math.max(sel.start.col, sel.end.col),
  };
}

/** Check if a cell is within a normalized selection rectangle */
function isCellInSelection(row: number, col: number, minRow: number, maxRow: number, minCol: number, maxCol: number): boolean {
  return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
}

/** Build an inset box-shadow string for a cell's selection border edges */
function buildBoxShadow(isTop: boolean, isRight: boolean, isBottom: boolean, isLeft: boolean): string {
  const shadows: string[] = [];
  if (isTop) shadows.push(`inset 0 ${BORDER_WIDTH} 0 0 ${BORDER_COLOR}`);
  if (isBottom) shadows.push(`inset 0 -${BORDER_WIDTH} 0 0 ${BORDER_COLOR}`);
  if (isLeft) shadows.push(`inset ${BORDER_WIDTH} 0 0 0 ${BORDER_COLOR}`);
  if (isRight) shadows.push(`inset -${BORDER_WIDTH} 0 0 0 ${BORDER_COLOR}`);
  return shadows.join(', ');
}

/** Find the closest <td> ancestor (or self) with data-cell-row/data-cell-col */
function findCellFromEvent(target: EventTarget | null): { row: number; col: number } | null {
  if (!target || !(target instanceof HTMLElement)) return null;
  const td = target.closest<HTMLTableCellElement>('td[data-cell-row][data-cell-col]');
  if (!td) return null;

  const row = parseInt(td.dataset.cellRow ?? '', 10);
  const col = parseInt(td.dataset.cellCol ?? '', 10);
  if (isNaN(row) || isNaN(col)) return null;

  return { row, col };
}

/** Get all selected <td> elements from the table within a selection rectangle */
function getSelectedCells(table: HTMLTableElement, sel: CellSelection): HTMLTableCellElement[][] {
  const { minRow, maxRow, minCol, maxCol } = normalizeSelection(sel);
  const rows: HTMLTableCellElement[][] = [];

  for (let r = minRow; r <= maxRow; r++) {
    const rowCells: HTMLTableCellElement[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      const td = table.querySelector<HTMLTableCellElement>(
        `td[data-cell-row="${String(r)}"][data-cell-col="${String(c)}"]`
      );
      if (td) rowCells.push(td);
    }
    if (rowCells.length > 0) rows.push(rowCells);
  }

  return rows;
}

/* ==============================================
   Imperative DOM Helpers (operate on a table ref)
   ============================================== */

/** Clear all imperative selection styles from a table */
function clearImperativeStyles(table: HTMLTableElement | null): void {
  if (!table) return;
  const selectedCells = table.querySelectorAll('.dt-cell--selected');
  for (const cell of selectedCells) {
    cell.classList.remove('dt-cell--selected');
    (cell as HTMLElement).style.boxShadow = '';
  }
}

/** Apply imperative selection styles for a given selection rectangle */
function applyImperativeStyles(table: HTMLTableElement | null, sel: CellSelection): void {
  if (!table) return;
  const { minRow, maxRow, minCol, maxCol } = normalizeSelection(sel);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const td = table.querySelector<HTMLElement>(
        `td[data-cell-row="${String(r)}"][data-cell-col="${String(c)}"]`
      );
      if (!td) continue;

      td.classList.add('dt-cell--selected');
      td.style.boxShadow = buildBoxShadow(
        r === minRow,
        c === maxCol,
        r === maxRow,
        c === minCol,
      );
    }
  }
}

/* ==============================================
   Hook Implementation
   ============================================== */

export function useCellSelection({ enabled, scrollContainerRef }: UseCellSelectionOptions): UseCellSelectionReturn {
  const tableRef = useRef<HTMLTableElement>(null);

  // React state — only updated on mouseup for final render
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for drag state (no re-renders during drag)
  const anchorRef = useRef<CellCoord | null>(null);
  const currentRef = useRef<CellCoord | null>(null);
  const draggingRef = useRef(false);
  const autoScrollRAF = useRef<number | null>(null);

  // Stable refs for document-level event handlers.
  // These allow handlers to reference each other (and themselves for cleanup)
  // without triggering the React Compiler's "accessed before declared" rule.
  const mouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpRef = useRef<(() => void) | null>(null);

  /** Stop auto-scrolling */
  const stopAutoScroll = useCallback(() => {
    if (autoScrollRAF.current !== null) {
      cancelAnimationFrame(autoScrollRAF.current);
      autoScrollRAF.current = null;
    }
  }, []);

  /** Clear selection state entirely */
  const clearSelection = useCallback(() => {
    clearImperativeStyles(tableRef.current);
    setSelection(null);
    anchorRef.current = null;
    currentRef.current = null;
  }, []);

  // Mousemove handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !anchorRef.current) return;

    // Find cell under cursor
    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    const cellInfo = findCellFromEvent(elementUnderCursor);

    if (cellInfo) {
      const { row, col } = cellInfo;
      const prev = currentRef.current;

      // Only update if cell changed
      if (!prev || prev.row !== row || prev.col !== col) {
        currentRef.current = { row, col };
        const table = tableRef.current;
        clearImperativeStyles(table);
        applyImperativeStyles(table, { start: anchorRef.current, end: { row, col } });
      }
    }

    // Auto-scroll when near edges of scroll container
    const container = scrollContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const distFromLeft = e.clientX - rect.left;
      const distFromRight = rect.right - e.clientX;

      stopAutoScroll();

      if (distFromLeft < AUTO_SCROLL_ZONE && container.scrollLeft > 0) {
        const scroll = () => {
          container.scrollLeft -= AUTO_SCROLL_SPEED;
          if (draggingRef.current && container.scrollLeft > 0) {
            autoScrollRAF.current = requestAnimationFrame(scroll);
          }
        };
        autoScrollRAF.current = requestAnimationFrame(scroll);
      } else if (distFromRight < AUTO_SCROLL_ZONE && container.scrollLeft < container.scrollWidth - container.clientWidth) {
        const scroll = () => {
          container.scrollLeft += AUTO_SCROLL_SPEED;
          if (draggingRef.current && container.scrollLeft < container.scrollWidth - container.clientWidth) {
            autoScrollRAF.current = requestAnimationFrame(scroll);
          }
        };
        autoScrollRAF.current = requestAnimationFrame(scroll);
      }
    }
  }, [scrollContainerRef, stopAutoScroll]);

  // Mouseup handler — removes document listeners via refs (avoids self-reference)
  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    setIsDragging(false);
    stopAutoScroll();

    // Remove selecting class from table
    tableRef.current?.classList.remove('dt-table--selecting');

    // Remove document listeners via stable refs
    if (mouseMoveRef.current) {
      document.removeEventListener('mousemove', mouseMoveRef.current);
    }
    if (mouseUpRef.current) {
      document.removeEventListener('mouseup', mouseUpRef.current);
    }

    // Commit final selection to React state
    const anchor = anchorRef.current;
    const current = currentRef.current;

    if (anchor && current) {
      // Clear imperative styles — React state will handle rendering
      clearImperativeStyles(tableRef.current);
      setSelection({ start: anchor, end: current });
    }
  }, [stopAutoScroll]);

  // Keep refs in sync with latest callback instances (must be in effect, not render)
  useEffect(() => {
    mouseMoveRef.current = handleMouseMove;
    mouseUpRef.current = handleMouseUp;
  }, [handleMouseMove, handleMouseUp]);

  // Mousedown handler (event delegation on table)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!enabled) return;

    // Skip if target is an interactive element
    if (e.target instanceof HTMLElement && e.target.closest(INTERACTIVE_SELECTOR)) return;

    // Only left mouse button
    if (e.button !== 0) return;

    const cellInfo = findCellFromEvent(e.target);
    if (!cellInfo) return;

    // Prevent native text selection
    e.preventDefault();
    window.getSelection()?.removeAllRanges();

    const { row, col } = cellInfo;
    anchorRef.current = { row, col };
    currentRef.current = { row, col };
    draggingRef.current = true;
    setIsDragging(true);

    // Add selecting class to table
    tableRef.current?.classList.add('dt-table--selecting');

    // Clear previous and apply initial single-cell selection
    const table = tableRef.current;
    clearImperativeStyles(table);
    applyImperativeStyles(table, { start: { row, col }, end: { row, col } });

    // Attach document-level listeners for drag
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enabled, handleMouseMove, handleMouseUp]);

  // Ctrl+C / Cmd+C handler — copy selection as TSV
  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (e: KeyboardEvent) => {
      // Only when we have a committed selection
      const sel = selection;
      if (!sel) return;

      // Check for Ctrl+C or Cmd+C
      const isCopyShortcut = (e.ctrlKey || e.metaKey) && e.key === 'c';
      if (!isCopyShortcut) return;

      // Don't intercept if focus is in an input/textarea
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;

      const table = tableRef.current;
      if (!table) return;

      e.preventDefault();

      // Read innerText from each cell in the selection rectangle
      const cellRows = getSelectedCells(table, sel);
      const tsv = cellRows
        .map(rowCells => rowCells.map(td => td.innerText.trim()).join('\t'))
        .join('\n');

      void navigator.clipboard.writeText(tsv);
    };

    document.addEventListener('keydown', handleCopy);
    return () => { document.removeEventListener('keydown', handleCopy); };
  }, [enabled, selection]);

  // Escape key and click-outside handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selection) {
        clearSelection();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!selection) return;
      const table = tableRef.current;
      if (!table) return;

      // Check if click is inside this table's tbody
      const tbody = table.querySelector('tbody');
      if (tbody && !tbody.contains(e.target as Node)) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Use capture phase so we clear before other click handlers fire
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [enabled, selection, clearSelection]);

  // Window blur — end drag if user leaves the window
  useEffect(() => {
    if (!enabled) return;

    const handleBlur = () => {
      if (draggingRef.current) {
        handleMouseUp();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => { window.removeEventListener('blur', handleBlur); };
  }, [enabled, handleMouseUp]);

  // Attach mousedown listener to table via event delegation
  useEffect(() => {
    if (!enabled) return;

    const table = tableRef.current;
    if (!table) return;

    table.addEventListener('mousedown', handleMouseDown);
    return () => { table.removeEventListener('mousedown', handleMouseDown); };
  }, [enabled, handleMouseDown]);

  // Clear selection when the hook becomes disabled.
  // Cleanup runs when `enabled` transitions from true → false.
  useEffect(() => {
    if (!enabled) return;
    const table = tableRef.current;
    return () => {
      clearImperativeStyles(table);
      setSelection(null);
      anchorRef.current = null;
      currentRef.current = null;
    };
  }, [enabled]);

  // Get CSS class for a cell based on committed selection
  const getCellSelectionClass = useCallback((row: number, col: number): string => {
    if (!selection) return '';
    const { minRow, maxRow, minCol, maxCol } = normalizeSelection(selection);
    return isCellInSelection(row, col, minRow, maxRow, minCol, maxCol)
      ? ' dt-cell--selected'
      : '';
  }, [selection]);

  // Get inline style for a cell's selection border
  const getCellSelectionStyle = useCallback((row: number, col: number): CSSProperties | undefined => {
    if (!selection) return undefined;
    const { minRow, maxRow, minCol, maxCol } = normalizeSelection(selection);
    if (!isCellInSelection(row, col, minRow, maxRow, minCol, maxCol)) return undefined;

    const shadow = buildBoxShadow(
      row === minRow,
      col === maxCol,
      row === maxRow,
      col === minCol,
    );

    return shadow ? { boxShadow: shadow } : undefined;
  }, [selection]);

  return {
    tableRef,
    selection,
    isDragging,
    getCellSelectionClass,
    getCellSelectionStyle,
  };
}
