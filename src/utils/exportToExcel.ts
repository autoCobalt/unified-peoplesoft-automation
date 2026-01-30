/**
 * Excel Export Utility
 *
 * Generates and downloads .xlsx files from table data using SheetJS.
 * All values are exported as strings to preserve leading zeros in IDs
 * (EMPLID, POSITION_NBR, etc.).
 */

import * as XLSX from 'xlsx';

export interface ExcelColumn {
  /** Column header text in the Excel file */
  header: string;
  /** Key to access the value from each record */
  accessor: string;
}

/**
 * Export records to an Excel (.xlsx) file and trigger a browser download.
 *
 * @param records - Array of data objects to export
 * @param columns - Column definitions specifying headers and accessors
 * @param fileName - File name without extension
 */
export function exportToExcel(
  records: Record<string, unknown>[],
  columns: ExcelColumn[],
  fileName: string,
): void {
  // Map records to plain objects using only the specified columns
  const headers = columns.map(c => c.header);
  const rows = records.map(record =>
    columns.map(col => {
      const value = record[col.accessor];
      // Replace null/undefined with empty strings
      if (value == null) return '';
      // Stringify primitives; for objects (shouldn't occur), use JSON
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value as string | number | boolean);
    }),
  );

  // Create worksheet from array-of-arrays (header row + data rows)
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Force all data cells to text type so Excel preserves leading zeros
  // (e.g., POSITION_NBR "00000000" stays "00000000" instead of becoming 0).
  // Row 0 is headers; data starts at row 1.
  const totalRows = rows.length + 1; // +1 for header row
  const totalCols = columns.length;
  for (let r = 1; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef] as XLSX.CellObject | undefined;
      if (cell) {
        cell.t = 's';
        cell.v = String(cell.v);
        cell.z = '@';
      }
    }
  }

  // Auto-size columns based on header length and max value length
  ws['!cols'] = columns.map((col, i) => {
    let maxLen = col.header.length;
    for (const row of rows) {
      const cellLen = row[i].length;
      if (cellLen > maxLen) maxLen = cellLen;
    }
    // Add padding (2 chars) and cap at 50
    return { wch: Math.min(maxLen + 2, 50) };
  });

  // Create workbook and trigger download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
