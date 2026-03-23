import type { GetReductionProjectByIdResponse } from "@repo/types";
import { exportToExcel } from "./exportToExcel";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En Revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  OBJECTED: "Objetado",
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatBoolean = (value: boolean): string => (value ? "Sí" : "No");

/**
 * Exports a single reduction project detail to an .xlsx file with two sheets:
 * - "Identificación": general project fields
 * - "Reporte de Reducciones": annual reduction/baseline/project values
 */
export function exportReductionProjectToExcel(
  project: GetReductionProjectByIdResponse
): void {
  const identificationSheet = [
    { Campo: "ID", Valor: project.id },
    { Campo: "Nombre del proyecto", Valor: project.name },
    { Campo: "Estado", Valor: STATUS_LABELS[project.status] ?? project.status },
    { Campo: "Descripción", Valor: project.description ?? "-" },
    { Campo: "Fecha de implementación", Valor: formatDate(project.implementationDate) },
    { Campo: "PCG utilizado", Valor: project.pcg ?? "-" },
    {
      Campo: "GEI considerados",
      Valor: project.selectedGases.length > 0 ? project.selectedGases.join(", ") : "-",
    },
    {
      Campo: "Reportado en otra iniciativa",
      Valor: formatBoolean(project.reportedInOtherInitiative),
    },
    {
      Campo: "Descripción otra iniciativa / NDC",
      Valor: project.otherInitiativeDescription ?? "-",
    },
    { Campo: "Fecha de creación", Valor: formatDate(project.createdAt) },
    {
      Campo: "Última actualización",
      Valor: formatDate(project.updatedAt ?? undefined),
    },
  ];

  const reportsSheet = project.reports.map((r) => ({
    "Año de reducción": r.reductionYear,
    "Escenario base (tCO₂e)": r.baselineValue,
    "Escenario proyecto (tCO₂e)": r.projectValue,
    "Reducción (tCO₂e)": r.reductionValue,
  }));

  exportToExcel(
    [
      {
        sheetName: "Identificación",
        rows: identificationSheet,
        columnWidths: { Campo: 36, Valor: 48 },
      },
      {
        sheetName: "Reporte de Reducciones",
        rows: reportsSheet,
        columnWidths: {
          "Año de reducción": 20,
          "Escenario base (tCO₂e)": 26,
          "Escenario proyecto (tCO₂e)": 28,
          "Reducción (tCO₂e)": 22,
        },
      },
    ],
    `proyecto-reduccion-${project.id}`
  );
}
