import ExcelJS from "exceljs";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { downloadWorkbook, sanitizeFilenamePart } from "@/services/excel";
import { formatDateToDDMMYYYY } from "@repo/utils";
import { getReductionProjectStatusLabel } from "./reductionProject";
import { VOCAB } from "@/config/vocab";

export async function exportReductionProjectToExcel(
  project: GetReductionProjectByIdResponse,
  organizationName: string
) {
  const sanitizedName = sanitizeFilenamePart(project.name);
  const filename = `${sanitizedName}-proyecto-de-reduccion.xlsx`;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Proyecto de Reducción");

  worksheet.columns = [
    { header: "Campo", key: "field", width: 30 },
    { header: "Valor", key: "value", width: 50 },
  ];
  worksheet.getRow(1).font = { bold: true };

  const rows = [
    ["Nombre", project.name],
    [`Nombre ${VOCAB.organization.noun.singular}`, organizationName],
    ["Descripción", project.description],
    ["Año de Reducción", project.year?.toString() ?? "—"],
    [
      "Fecha de Implementación",
      formatDateToDDMMYYYY(project.implementationDate),
    ],
    ["Escenario Base (tCO₂e)", project.baselineScenario],
    ["Escenario Proyecto (tCO₂e)", project.projectScenario],
    ["Reducción (tCO₂e)", project.baselineScenario - project.projectScenario],
    ["PCG Utilizado", project.gwpUsed ?? "—"],
    ["GEI Considerados", project.consideredGei.join(", ") || "—"],
    ["Reportado en Otra Iniciativa", project.reportedElsewhere ? "Sí" : "No"],
    ["Detalle Reporte Externo", project.reportedElsewhereDescription ?? "—"],
    ["Estado", getReductionProjectStatusLabel(project.status)],
    ["Fecha de Creación", formatDateToDDMMYYYY(project.createdAt)],
  ];

  for (const [field, value] of rows) {
    worksheet.addRow({ field, value });
  }

  await downloadWorkbook(workbook, filename);
}
