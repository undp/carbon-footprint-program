import type ExcelJS from "exceljs";

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
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Defer revocation to ensure download starts
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
  anchor.remove();
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
