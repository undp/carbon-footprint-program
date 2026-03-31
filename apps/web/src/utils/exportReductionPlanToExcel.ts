import ExcelJS from "exceljs";
import type { GetReductionPlanResponse } from "@repo/types";
import { downloadWorkbook } from "@/services/excel";

export async function exportReductionPlanToExcel(
  data: GetReductionPlanResponse,
  filename = "plan-de-reduccion.xlsx"
) {
  const workbook = new ExcelJS.Workbook();

  for (const category of data.categories) {
    const sheetName = category.name.slice(0, 31);
    const worksheet = workbook.addWorksheet(sheetName);

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
