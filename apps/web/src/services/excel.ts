import type ExcelJS from "exceljs";
import { downloadBlob } from "@/utils/files";

export const BASE_FONT_SIZE = 12;

export const BORDER_THIN: Partial<ExcelJS.Border> = { style: "thin" };

/** Normalizes null, undefined, and empty strings to "-". */
export function display(
  value: string | number | null | undefined
): string | number {
  if (value == null || value === "") return "-";
  return value;
}

export function addBoldRow(
  worksheet: ExcelJS.Worksheet,
  values: (string | number)[]
) {
  const row = worksheet.addRow(values);
  row.font = { bold: true, size: BASE_FONT_SIZE };
  return row;
}

export function applyNumberFormat(
  row: ExcelJS.Row,
  colIndex: number,
  format: string
) {
  const cell = row.getCell(colIndex);
  if (typeof cell.value === "number") {
    cell.numFmt = format;
  }
}

export function applyBorderTopBottom(row: ExcelJS.Row, colCount: number) {
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).border = { top: BORDER_THIN, bottom: BORDER_THIN };
  }
}

/**
 * Generates a buffer from an ExcelJS workbook and triggers a browser download.
 *
 * @param workbook - The ExcelJS workbook instance to download.
 * @param filename - The name of the file to be saved (including .xlsx extension).
 */
export const downloadWorkbook = async (
  workbook: ExcelJS.Workbook,
  filename: string
) => {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename);
};

/**
 * Triggers a browser download for a pre-built workbook buffer. Lets the
 * inventory and methodology workbook builders share the same download
 * primitive without reassembling the workbook.
 */
export const downloadBuffer = (buffer: ArrayBuffer, filename: string): void => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename);
};

export const sanitizeExcelSheetName = (name: string) => {
  // Excel sheet names cannot contain / \ ? * [ ] : and must be ≤31 chars
  return name.replace(/[/\\?*[\]:]/g, "-").slice(0, 31);
};

const FILENAME_FORBIDDEN = new RegExp(
  `[<>:"/\\\\|?*${String.fromCharCode(0)}-${String.fromCharCode(31)}]`,
  "g"
);

export const sanitizeFilenamePart = (name: string) => {
  // Remove characters forbidden in filenames on Windows/macOS/Linux and control chars
  return name.replace(FILENAME_FORBIDDEN, "-").replace(/\s+/g, " ").trim();
};
