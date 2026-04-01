import ExcelJS from "exceljs";
import type { GetReductionPlanResponse } from "@repo/types";
import { downloadWorkbook, sanitizeExcelSheetName } from "@/services/excel";

export async function exportReductionPlanToExcel(
  inventoryName: string,
  data: GetReductionPlanResponse
) {
  const filename = `${sanitizeExcelSheetName(inventoryName)}-plan-de-reduccion.xlsx`;
  const workbook = new ExcelJS.Workbook();

  for (const category of data.categories) {
    const sanitizedSheetName = sanitizeExcelSheetName(category.name);
    const worksheet = workbook.addWorksheet(sanitizedSheetName);

    // Add headers
    worksheet.columns = [
      { header: "Subcategoría", key: "subcategory", width: 30 },
      { header: "Iniciativa", key: "initiative", width: 35 },
      { header: "Descripción Iniciativa", key: "description", width: 55 },
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };

    for (const sub of category.subcategories) {
      for (const initiative of sub.initiatives) {
        worksheet.addRow({
          subcategory: sub.name,
          initiative: initiative.title,
          description: initiative.description,
        });
      }
    }
  }

  if (workbook.worksheets.length === 0) {
    const worksheet = workbook.addWorksheet("Sin datos");
    worksheet.addRow(["No hay datos disponibles"]);
  }

  await downloadWorkbook(workbook, filename);
}
