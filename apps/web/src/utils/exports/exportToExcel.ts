import * as XLSX from "xlsx";

type CellValue = string | number | boolean | null | undefined;

export type ExcelSheetData = {
  sheetName: string;
  rows: Record<string, CellValue>[];
  /** Optional column width overrides (key = header label) */
  columnWidths?: Record<string, number>;
};

/**
 * Generates and triggers a browser download for an .xlsx file.
 *
 * @param sheets - One or more sheets to include in the workbook
 * @param fileName - File name without extension (e.g. "reporte-proyecto")
 */
export function exportToExcel(sheets: ExcelSheetData[], fileName: string): void {
  const wb = XLSX.utils.book_new();

  for (const { sheetName, rows, columnWidths } of sheets) {
    if (rows.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([[]]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      continue;
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Apply column widths
    const headers = Object.keys(rows[0]);
    ws["!cols"] = headers.map((header) => ({
      wch: columnWidths?.[header] ?? Math.max(header.length + 2, 14),
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
