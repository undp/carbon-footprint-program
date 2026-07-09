import ExcelJS from "exceljs";
import type {
  GetEmissionsDetailedSummaryResponse,
  GetEmissionFactorsResponse,
} from "@repo/types";
import { display, BASE_FONT_SIZE } from "@/services/excel";
import { formatter } from "@/utils/formatting";

const NUM_FMT_DECIMAL = "#,##0.00";

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  summaryData: GetEmissionsDetailedSummaryResponse,
  year: number | null,
  attachmentCount: number
) {
  const worksheet = workbook.addWorksheet("Resumen");

  worksheet.columns = [{ width: 35 }, { width: 40 }];

  const { inventoryAttributes } = summaryData;

  const attributes: [string, string | number][] = [
    ["Nombre organización", display(inventoryAttributes.companyName)],
    ["País", display(inventoryAttributes.countryName)],
    ["Rubro", display(inventoryAttributes.sectorName)],
    ["Sub-rubro", display(inventoryAttributes.subsectorName)],
    ["Tamaño", display(inventoryAttributes.sizeName)],
    ["Medición", display(inventoryAttributes.name)],
    ["Año", display(year)],
    [
      "Actividad principal",
      display(
        inventoryAttributes.mainActivityName
          ? inventoryAttributes.mainActivityQuantity != null
            ? `${inventoryAttributes.mainActivityName} (${inventoryAttributes.mainActivityQuantity})`
            : inventoryAttributes.mainActivityName
          : null
      ),
    ],
    ["Archivos adjuntos", attachmentCount],
  ];

  for (const [label, value] of attributes) {
    const row = worksheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, size: BASE_FONT_SIZE };
    row.getCell(2).font = { size: BASE_FONT_SIZE };
  }
}

function buildDetailTableSheet(
  workbook: ExcelJS.Workbook,
  summaryData: GetEmissionsDetailedSummaryResponse
) {
  const worksheet = workbook.addWorksheet("Detalle emisiones");

  // Item ID column at index 0 — same id is embedded in `archivos/` filenames
  // (as the `item-{lineId}` segment) so users can cross-reference a row with
  // its files.
  worksheet.columns = [
    { width: 12 },
    { width: 28 },
    { width: 28 },
    { width: 36 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
    { width: 28 },
    { width: 20 },
    { width: 40 },
  ];

  const sortedCategories = [...summaryData.categories].sort(
    (a, b) => a.position - b.position
  );

  const rows: (string | number | null)[][] = [];

  for (const category of sortedCategories) {
    const categoryLabel = category.synonyms
      ? `${category.name} (${category.synonyms})`
      : category.name;

    for (const subcategory of category.subcategories) {
      for (const line of subcategory.lines) {
        rows.push([
          line.lineId,
          categoryLabel,
          display(subcategory.name),
          display(line.emissionSource),
          display(line.measurementUnitName),
          line.quantity,
          line.factorValue,
          display(line.factorSource),
          line.emissions,
          display(line.comment),
        ]);
      }
    }
  }

  if (rows.length === 0) {
    const emptyRow = worksheet.addRow(["Sin datos de emisiones"]);
    emptyRow.font = { bold: true, size: BASE_FONT_SIZE };
    return;
  }

  worksheet.addTable({
    name: "DetalleEmisiones",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium2",
      showRowStripes: true,
    },
    columns: [
      { name: "Item ID", filterButton: true },
      { name: "Categoría", filterButton: true },
      { name: "Sub-categoría", filterButton: true },
      { name: "Fuente de emisión", filterButton: true },
      { name: "Unidad", filterButton: true },
      { name: "Cantidad", filterButton: true },
      { name: "Factor kgCO₂e/unidad", filterButton: true },
      { name: "Fuente factor", filterButton: true },
      { name: "Emisiones (tCO₂e)", filterButton: true },
      { name: "Comentario", filterButton: true },
    ],
    rows,
  });

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  worksheet.getColumn(6).numFmt = NUM_FMT_DECIMAL;
  worksheet.getColumn(7).numFmt = NUM_FMT_DECIMAL;
  worksheet.getColumn(9).numFmt = NUM_FMT_DECIMAL;
}

function buildFactorsSheet(
  workbook: ExcelJS.Workbook,
  factorsData: GetEmissionFactorsResponse
) {
  const worksheet = workbook.addWorksheet("Factores utilizados");

  worksheet.columns = [
    { width: 30 },
    { width: 25 },
    { width: 30 },
    { width: 30 },
    { width: 30 },
  ];

  const rows: (string | number)[][] = factorsData.map((factor) => {
    const categoryLabel = factor.categorySynonyms
      ? `${factor.categoryName} (${factor.categorySynonyms})`
      : factor.categoryName;

    const source = factor.factorSourceDetail
      ? `${factor.factorSource} - ${factor.factorSourceDetail}`
      : factor.factorSource;

    return [
      display(categoryLabel),
      display(factor.subcategoryName),
      display(factor.activityParameter),
      display(
        `${formatter.emissionFactor(factor.factorValue)} ${factor.rateUnit}`
      ),
      display(source),
    ];
  });

  if (rows.length === 0) {
    const emptyRow = worksheet.addRow(["Sin factores utilizados"]);
    emptyRow.font = { bold: true, size: BASE_FONT_SIZE };
    return;
  }

  worksheet.addTable({
    name: "FactoresUtilizados",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium2",
      showRowStripes: true,
    },
    columns: [
      { name: "Categoría / Alcance", filterButton: true },
      { name: "Sub-categoría", filterButton: true },
      { name: "Parámetros de actividad", filterButton: true },
      { name: "Factor (Kg CO₂e/unidad)", filterButton: true },
      { name: "Fuente", filterButton: true },
    ],
    rows,
  });

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

/**
 * Pure builder — assembles the inventory workbook and returns it as an
 * ArrayBuffer suitable for either downloading or streaming into a ZIP.
 */
export async function buildCarbonInventoryWorkbook(
  year: number | null,
  summaryData: GetEmissionsDetailedSummaryResponse,
  factorsData: GetEmissionFactorsResponse,
  attachmentCount: number
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  buildSummarySheet(workbook, summaryData, year, attachmentCount);
  buildDetailTableSheet(workbook, summaryData);
  buildFactorsSheet(workbook, factorsData);
  return workbook.xlsx.writeBuffer();
}
