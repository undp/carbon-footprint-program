import ExcelJS from "exceljs";
import type {
  GetEmissionsDetailedSummaryResponse,
  GetEmissionFactorsResponse,
} from "@repo/types";
import {
  downloadWorkbook,
  sanitizeExcelSheetName,
  display,
  addBoldRow,
  applyNumberFormat,
  applyBorderTopBottom,
  BASE_FONT_SIZE,
} from "@/services/excel";

const NUM_FMT_DECIMAL = "#,##0.00";
const NUM_FMT_PERCENT = "0.0%";
const CATEGORY_FONT_SIZE = 14;

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  summaryData: GetEmissionsDetailedSummaryResponse,
  year: number | null
) {
  const worksheet = workbook.addWorksheet("Resumen");

  worksheet.columns = [
    { width: 35 },
    { width: 18 },
    { width: 15 },
    { width: 22 },
    { width: 18 },
    { width: 20 },
  ];

  const { inventoryAttributes, totalEmissions, equivalence, categories } =
    summaryData;

  // Inventory attributes
  const attributes: [string, string | number][] = [
    ["Nombre organización", display(inventoryAttributes.companyName)],
    ["País", display(inventoryAttributes.countryName)],
    ["Rubro", display(inventoryAttributes.sectorName)],
    ["Tamaño", display(inventoryAttributes.sizeName)],
    ["Sedes", display(inventoryAttributes.branchCount)],
    ["Medición", display(inventoryAttributes.name)],
    ["Año", display(year)],
    [
      "Actividad principal",
      display(
        inventoryAttributes.mainActivityName
          ? inventoryAttributes.mainActivityQuantity
            ? `${inventoryAttributes.mainActivityName} (${inventoryAttributes.mainActivityQuantity})`
            : inventoryAttributes.mainActivityName
          : null
      ),
    ],
  ];

  for (const [label, value] of attributes) {
    const row = worksheet.addRow([label, value]);
    row.getCell(1).font = { bold: true, size: BASE_FONT_SIZE };
    row.getCell(2).font = { size: BASE_FONT_SIZE };
  }

  // Empty row
  worksheet.addRow([]);

  // Total emissions
  const totalRow = addBoldRow(worksheet, ["Total emisiones", totalEmissions]);
  applyNumberFormat(totalRow, 2, NUM_FMT_DECIMAL);

  // Equivalence (optional)
  if (equivalence) {
    const eqRow = worksheet.addRow([
      "Equivalencia",
      equivalence.rate,
      `kg CO₂e/${equivalence.activityName}`,
    ]);
    eqRow.font = { size: BASE_FONT_SIZE };
    applyNumberFormat(eqRow, 2, NUM_FMT_DECIMAL);
  }

  // Empty row
  worksheet.addRow([]);

  // Categories
  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position
  );

  for (const category of sortedCategories) {
    const categoryLabel = category.synonyms
      ? `${category.name} (${category.synonyms})`
      : category.name;

    // Category header row
    const catRow = addBoldRow(worksheet, [
      categoryLabel,
      "-",
      "-",
      "-",
      category.subtotal,
      category.percentage,
    ]);
    catRow.font = { bold: true, size: CATEGORY_FONT_SIZE };
    applyNumberFormat(catRow, 5, NUM_FMT_DECIMAL);
    applyNumberFormat(catRow, 6, NUM_FMT_PERCENT);

    for (const subcategory of category.subcategories) {
      // Subcategory row
      const subRow = addBoldRow(worksheet, [
        display(subcategory.name),
        "-",
        "-",
        "-",
        subcategory.subtotal,
        subcategory.percentage,
      ]);
      applyNumberFormat(subRow, 5, NUM_FMT_DECIMAL);
      applyNumberFormat(subRow, 6, NUM_FMT_PERCENT);
      applyBorderTopBottom(subRow, 6);

      if (subcategory.hasLines && subcategory.lines.length > 0) {
        // Lines table header
        const headerRow = worksheet.addRow([
          "Fuente de emisión",
          "Unidad",
          "Cantidad",
          "Factor kgCO₂e/unidad",
          "Fuente factor",
          "Emisiones (tCO₂e)",
        ]);
        headerRow.font = { bold: true, italic: true, size: BASE_FONT_SIZE };

        // Line data rows
        for (const line of subcategory.lines) {
          const lineRow = worksheet.addRow([
            display(line.emissionSource),
            display(line.measurementUnitName),
            display(line.quantity),
            display(line.factorValue),
            display(line.factorSource),
            display(line.emissions),
          ]);
          lineRow.font = { size: BASE_FONT_SIZE };
          applyNumberFormat(lineRow, 3, NUM_FMT_DECIMAL);
          applyNumberFormat(lineRow, 4, NUM_FMT_DECIMAL);
          applyNumberFormat(lineRow, 6, NUM_FMT_DECIMAL);
        }
      }
    }

    // Empty row between categories
    worksheet.addRow([]);
  }
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

  // Header
  addBoldRow(worksheet, [
    "Categoría / Alcance",
    "Sub-categoría",
    "Parámetros de actividad",
    "Factor (Kg CO₂e/unidad)",
    "Fuente",
  ]);

  for (const factor of factorsData) {
    const categoryLabel = factor.categorySynonyms
      ? `${factor.categoryName} (${factor.categorySynonyms})`
      : factor.categoryName;

    const source = factor.factorSourceDetail
      ? `${factor.factorSource} - ${factor.factorSourceDetail}`
      : factor.factorSource;

    const row = worksheet.addRow([
      display(categoryLabel),
      display(factor.subcategoryName),
      display(factor.activityParameter),
      display(factor.factorLabel),
      display(source),
    ]);
    row.font = { size: BASE_FONT_SIZE };
  }
}

export async function exportCarbonInventoryToExcel(
  inventoryName: string | null,
  year: number | null,
  summaryData: GetEmissionsDetailedSummaryResponse,
  factorsData: GetEmissionFactorsResponse
) {
  const workbook = new ExcelJS.Workbook();

  buildSummarySheet(workbook, summaryData, year);
  buildFactorsSheet(workbook, factorsData);

  const safeName = sanitizeExcelSheetName(inventoryName ?? "huella");
  const yearSuffix = year != null ? `-${year}` : "";
  const filename = `${safeName}${yearSuffix}-resumen-emisiones.xlsx`;
  await downloadWorkbook(workbook, filename);
}
