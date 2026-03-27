import * as XLSX from "xlsx";
import type { GetReductionPlanResponse } from "@repo/types";

export function exportReductionPlanToExcel(
  data: GetReductionPlanResponse,
  filename = "plan-de-reduccion.xlsx"
) {
  const wb = XLSX.utils.book_new();

  for (const category of data.categories) {
    const rows: string[][] = [
      ["Subcategoría", "Iniciativa", "Descripción Iniciativa"],
    ];

    for (const sub of category.subcategories) {
      if (sub.initiatives.length === 0) {
        rows.push([sub.name, "", ""]);
        continue;
      }

      for (const initiative of sub.initiatives) {
        rows.push([sub.name, initiative.title, initiative.description]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws["!cols"] = [{ wch: 30 }, { wch: 35 }, { wch: 55 }];

    const sheetName = category.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  if (wb.SheetNames.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["No hay datos disponibles"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Sin datos");
  }

  XLSX.writeFile(wb, filename);
}
