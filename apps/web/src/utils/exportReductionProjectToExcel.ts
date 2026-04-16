import ExcelJS from "exceljs";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { downloadWorkbook, sanitizeExcelSheetName } from "@/services/excel";
import { formatDateToDDMMYYYY } from "@repo/utils";
import { apiClient } from "@/api/http";
import { getReductionProjectStatusLabel } from "./reductionProject";

export async function exportReductionProjectToExcel(projectId: string) {
  const project = await apiClient
    .get(`reduction-projects/${projectId}`)
    .json<GetReductionProjectByIdResponse>();

  const filename = `${sanitizeExcelSheetName(project.name)}-proyecto-de-reduccion.xlsx`;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Proyecto de Reducción");

  worksheet.columns = [
    { header: "Campo", key: "field", width: 30 },
    { header: "Valor", key: "value", width: 50 },
  ];
  worksheet.getRow(1).font = { bold: true };

  const rows = [
    ["Nombre", project.name],
    ["Descripción", project.description],
    ["Año de Reducción", project.year?.toString() ?? "—"],
    [
      "Fecha de Implementación",
      formatDateToDDMMYYYY(project.implementationDate),
    ],
    ["Escenario Base (tCO₂e)", project.baselineScenario],
    ["Escenario Proyecto (tCO₂e)", project.projectScenario],
    ["Reducción (tCO₂e)", project.baselineScenario - project.projectScenario],
    ["GWP Utilizado", project.gwpUsed ?? "—"],
    ["GEI Considerados", project.consideredGei.join(", ") || "—"],
    ["Reportado en Otro Lugar", project.reportedElsewhere ? "Sí" : "No"],
    ["Detalle Reporte Externo", project.reportedElsewhereDescription ?? "—"],
    ["Estado", getReductionProjectStatusLabel(project.status)],
    ["Fecha de Creación", formatDateToDDMMYYYY(project.createdAt)],
  ];

  for (const [field, value] of rows) {
    worksheet.addRow({ field, value });
  }

  await downloadWorkbook(workbook, filename);
}
