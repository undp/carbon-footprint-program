import ExcelJS from "exceljs";
import type {
  GetEmissionsDetailedSummaryResponse,
  GetEmissionFactorsResponse,
} from "@repo/types";
import { display, BASE_FONT_SIZE } from "@/services/excel";

const NUM_FMT_DECIMAL = "#,##0.00";

/**
 * Emission factors need their own number format: with the shared
 * `#,##0.00` a factor of `0,056944` *displays* as `0,06` inside the
 * spreadsheet, reproducing there the very rounding this change removes from
 * the app. Two decimals are always shown (matching the app's floor) and up to
 * six are added only when the factor has them.
 */
const NUM_FMT_FACTOR = "#,##0.00####";

/**
 * Same factor format with the rate unit appended as literal text. The cell
 * keeps a plain number as its value — a spreadsheet formula can still
 * multiply it — while showing which unit that number is expressed in. It is
 * per cell and not in the column header because each factor row carries its
 * own rate unit (`kg CO₂e/L`, `kg CO₂e/kWh`, …).
 */
function factorNumFmtWithUnit(rateUnit: string | null | undefined): string {
  if (!rateUnit) return NUM_FMT_FACTOR;
  // Double quotes delimit literal text in a number format, so they cannot
  // appear inside one.
  return `${NUM_FMT_FACTOR}" ${rateUnit.replaceAll('"', "")}"`;
}

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
  worksheet.getColumn(7).numFmt = NUM_FMT_FACTOR;
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
      // Numeric, not a preformatted string: the reader must be able to
      // multiply this cell. The rate unit rides along in the cell's number
      // format (see `factorNumFmtWithUnit`).
      display(factor.factorValue),
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

  // Row 1 is the table header, so data rows start at 2 and keep the order of
  // `factorsData`.
  factorsData.forEach((factor, index) => {
    worksheet.getRow(index + 2).getCell(4).numFmt = factorNumFmtWithUnit(
      factor.rateUnit
    );
  });
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
