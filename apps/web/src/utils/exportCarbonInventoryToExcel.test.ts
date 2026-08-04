import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type {
  GetEmissionsDetailedSummaryResponse,
  GetEmissionFactorsResponse,
} from "@repo/types";
import { formatter } from "@/utils/formatting";
import { buildCarbonInventoryWorkbook } from "./exportCarbonInventoryToExcel";

// Types are derived from the real response shapes (via indexed access) so the
// fixtures stay valid against the contract without re-declaring the schemas.
type Summary = GetEmissionsDetailedSummaryResponse;
type InventoryAttributes = Summary["inventoryAttributes"];
type Category = Summary["categories"][number];
type Subcategory = Category["subcategories"][number];
type EmissionLine = Subcategory["lines"][number];
type Factors = GetEmissionFactorsResponse;
type Factor = Factors[number];

const makeLine = (overrides: Partial<EmissionLine> = {}): EmissionLine => ({
  lineId: "line-1",
  emissionSource: "Diésel",
  measurementUnitName: "Litros",
  quantity: 100,
  factorValue: 2.68,
  factorSource: "IPCC 2006",
  emissions: 0.268,
  comment: "Comentario de prueba",
  ...overrides,
});

const makeSubcategory = (
  overrides: Partial<Subcategory> = {}
): Subcategory => ({
  id: "sub-1",
  name: "Estacionaria",
  description: "Combustión estacionaria",
  icon: "FLAME",
  hasLines: true,
  lines: [makeLine()],
  subtotal: 0.268,
  percentage: 1,
  hasIncompleteLines: false,
  ...overrides,
});

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat-1",
  name: "Combustión",
  synonyms: "Alcance 1",
  position: 1,
  icon: "FACTORY",
  color: "#FF6600",
  subcategories: [makeSubcategory()],
  subtotal: 0.268,
  percentage: 1,
  ghgBreakdown: null,
  hasIncompleteLines: false,
  ...overrides,
});

const makeInventoryAttributes = (
  overrides: Partial<InventoryAttributes> = {}
): InventoryAttributes => ({
  name: "Medición 2024",
  companyName: "Acme S.A.",
  countryName: "Chile",
  sectorName: "Industria",
  subsectorName: "Manufactura",
  sizeName: "Grande",
  mainActivityName: "Producción",
  mainActivityQuantity: 5,
  ...overrides,
});

const makeSummary = (overrides: Partial<Summary> = {}): Summary => ({
  inventoryAttributes: makeInventoryAttributes(),
  totalEmissions: 0.268,
  equivalence: null,
  categories: [makeCategory()],
  ...overrides,
});

const makeFactor = (overrides: Partial<Factor> = {}): Factor => ({
  id: "factor-1",
  categoryName: "Energía",
  categorySynonyms: "Alcance 2",
  categoryPosition: 2,
  categoryColor: "#0066FF",
  subcategoryName: "Electricidad",
  activityParameter: "Consumo eléctrico",
  factorValue: 0.5,
  rateUnit: "kg CO₂e/kWh",
  gasBreakdownLines: [{ value: 0.5, gas: "CO₂" }],
  factorSource: "SEN",
  factorSourceDetail: "Red nacional",
  ...overrides,
});

// Build the workbook and read the produced buffer back with a fresh instance,
// so the assertions run against the serialized-then-parsed spreadsheet exactly
// as a consumer would open it.
async function buildAndLoad(
  year: number | null,
  summary: Summary,
  factors: Factors,
  attachmentCount: number
): Promise<ExcelJS.Workbook> {
  const buffer = await buildCarbonInventoryWorkbook(
    year,
    summary,
    factors,
    attachmentCount
  );
  const workbook = new ExcelJS.Workbook();
  // exceljs's `load` accepts the ArrayBuffer the builder returns at runtime.
  await workbook.xlsx.load(buffer);
  return workbook;
}

function sheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) throw new Error(`Missing worksheet: ${name}`);
  return worksheet;
}

// The "Resumen" sheet is a plain label/value grid; look a row up by its label
// cell rather than hard-coding row indices.
function resumenValue(
  worksheet: ExcelJS.Worksheet,
  label: string
): ExcelJS.CellValue | undefined {
  let value: ExcelJS.CellValue | undefined;
  worksheet.eachRow((row) => {
    if (row.getCell(1).value === label) {
      value = row.getCell(2).value;
    }
  });
  return value;
}

describe("buildCarbonInventoryWorkbook", () => {
  it("produces the three named worksheets in order", async () => {
    const workbook = await buildAndLoad(2024, makeSummary(), [makeFactor()], 3);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Resumen",
      "Detalle emisiones",
      "Factores utilizados",
    ]);
  });
});

describe("buildCarbonInventoryWorkbook — Resumen sheet", () => {
  it("writes the inventory attributes as bold-labelled rows", async () => {
    const workbook = await buildAndLoad(2024, makeSummary(), [makeFactor()], 3);
    const worksheet = sheet(workbook, "Resumen");

    expect(resumenValue(worksheet, "Nombre organización")).toBe("Acme S.A.");
    expect(resumenValue(worksheet, "País")).toBe("Chile");
    expect(resumenValue(worksheet, "Rubro")).toBe("Industria");
    expect(resumenValue(worksheet, "Sub-rubro")).toBe("Manufactura");
    expect(resumenValue(worksheet, "Tamaño")).toBe("Grande");
    expect(resumenValue(worksheet, "Medición")).toBe("Medición 2024");
    expect(resumenValue(worksheet, "Año")).toBe(2024);
    // mainActivityName + mainActivityQuantity → "name (quantity)".
    expect(resumenValue(worksheet, "Actividad principal")).toBe(
      "Producción (5)"
    );
    expect(resumenValue(worksheet, "Archivos adjuntos")).toBe(3);

    // The label column is bold (styling survives the buffer round-trip).
    const labelRow = worksheet.getRow(1);
    expect(labelRow.getCell(1).font?.bold).toBe(true);
  });

  it("renders the main activity name only when the quantity is null", async () => {
    const summary = makeSummary({
      inventoryAttributes: makeInventoryAttributes({
        mainActivityName: "Producción",
        mainActivityQuantity: null,
      }),
    });

    const workbook = await buildAndLoad(2024, summary, [makeFactor()], 0);
    const worksheet = sheet(workbook, "Resumen");

    expect(resumenValue(worksheet, "Actividad principal")).toBe("Producción");
    expect(resumenValue(worksheet, "Archivos adjuntos")).toBe(0);
  });

  it("falls back to '-' for a missing main activity and a null year", async () => {
    const summary = makeSummary({
      inventoryAttributes: makeInventoryAttributes({
        mainActivityName: null,
        mainActivityQuantity: null,
      }),
    });

    const workbook = await buildAndLoad(null, summary, [makeFactor()], 1);
    const worksheet = sheet(workbook, "Resumen");

    expect(resumenValue(worksheet, "Año")).toBe("-");
    expect(resumenValue(worksheet, "Actividad principal")).toBe("-");
  });
});

describe("buildCarbonInventoryWorkbook — Detalle emisiones sheet", () => {
  it("sorts categories by position and applies the synonyms/display rules", async () => {
    // Provided out of position order to prove the sheet sorts by `position`.
    const catByPosition2 = makeCategory({
      id: "cat-a",
      name: "Energía",
      synonyms: "Alcance 2",
      position: 2,
      subcategories: [
        makeSubcategory({
          id: "sub-a",
          name: "Electricidad",
          lines: [
            makeLine({
              lineId: "line-a",
              measurementUnitName: null,
              factorSource: null,
              comment: null,
            }),
          ],
        }),
      ],
    });
    const catByPosition1 = makeCategory({
      id: "cat-b",
      name: "Combustión",
      synonyms: "", // falsy synonyms → category name only
      position: 1,
      subcategories: [
        makeSubcategory({
          id: "sub-b",
          lines: [makeLine({ lineId: "line-b" })],
        }),
      ],
    });
    const summary = makeSummary({
      categories: [catByPosition2, catByPosition1],
    });

    const workbook = await buildAndLoad(2024, summary, [makeFactor()], 0);
    const worksheet = sheet(workbook, "Detalle emisiones");

    // Header row.
    const header = worksheet.getRow(1);
    expect(header.getCell(1).value).toBe("Item ID");
    expect(header.getCell(2).value).toBe("Categoría");
    expect(header.getCell(6).value).toBe("Cantidad");
    expect(header.getCell(9).value).toBe("Emisiones (tCO₂e)");
    expect(header.getCell(10).value).toBe("Comentario");

    // Row 2: position-1 category (no synonyms), fully populated line.
    const row2 = worksheet.getRow(2);
    expect(row2.getCell(1).value).toBe("line-b");
    expect(row2.getCell(2).value).toBe("Combustión");
    expect(row2.getCell(3).value).toBe("Estacionaria");
    expect(row2.getCell(4).value).toBe("Diésel");
    expect(row2.getCell(5).value).toBe("Litros");
    expect(row2.getCell(6).value).toBe(100);
    expect(row2.getCell(7).value).toBe(2.68);
    expect(row2.getCell(8).value).toBe("IPCC 2006");
    expect(row2.getCell(9).value).toBe(0.268);
    expect(row2.getCell(10).value).toBe("Comentario de prueba");

    // Row 3: position-2 category (with synonyms), null fields → "-".
    const row3 = worksheet.getRow(3);
    expect(row3.getCell(1).value).toBe("line-a");
    expect(row3.getCell(2).value).toBe("Energía (Alcance 2)");
    expect(row3.getCell(5).value).toBe("-");
    expect(row3.getCell(8).value).toBe("-");
    expect(row3.getCell(10).value).toBe("-");
  });

  it("writes the 'Sin datos de emisiones' fallback when there are no lines", async () => {
    const workbook = await buildAndLoad(
      2024,
      makeSummary({ categories: [] }),
      [makeFactor()],
      0
    );
    const worksheet = sheet(workbook, "Detalle emisiones");

    expect(worksheet.getRow(1).getCell(1).value).toBe("Sin datos de emisiones");
  });
});

describe("buildCarbonInventoryWorkbook — Factores utilizados sheet", () => {
  it("renders factor rows with synonyms and source-detail variants", async () => {
    const withSynonymsAndDetail = makeFactor();
    const withoutSynonymsOrDetail = makeFactor({
      id: "factor-2",
      categoryName: "Combustión",
      categorySynonyms: "", // falsy → category name only
      subcategoryName: "Estacionaria",
      activityParameter: "Consumo diésel",
      factorValue: 2.68,
      rateUnit: "kg CO₂e/L",
      factorSource: "IPCC",
      factorSourceDetail: null, // → source without the detail suffix
    });

    const workbook = await buildAndLoad(
      2024,
      makeSummary(),
      [withSynonymsAndDetail, withoutSynonymsOrDetail],
      0
    );
    const worksheet = sheet(workbook, "Factores utilizados");

    // Header row.
    const header = worksheet.getRow(1);
    expect(header.getCell(1).value).toBe("Categoría / Alcance");
    expect(header.getCell(2).value).toBe("Sub-categoría");
    expect(header.getCell(3).value).toBe("Parámetros de actividad");
    expect(header.getCell(4).value).toBe("Factor (Kg CO₂e/unidad)");
    expect(header.getCell(5).value).toBe("Fuente");

    // Row 2: synonyms present + source detail present.
    const row2 = worksheet.getRow(2);
    expect(row2.getCell(1).value).toBe("Energía (Alcance 2)");
    expect(row2.getCell(2).value).toBe("Electricidad");
    expect(row2.getCell(3).value).toBe("Consumo eléctrico");
    expect(row2.getCell(4).value).toBe(
      `${formatter.emissionFactor(0.5)} kg CO₂e/kWh`
    );
    expect(row2.getCell(5).value).toBe("SEN - Red nacional");

    // Row 3: no synonyms + no source detail.
    const row3 = worksheet.getRow(3);
    expect(row3.getCell(1).value).toBe("Combustión");
    expect(row3.getCell(4).value).toBe(
      `${formatter.emissionFactor(2.68)} kg CO₂e/L`
    );
    expect(row3.getCell(5).value).toBe("IPCC");
  });

  it("writes the 'Sin factores utilizados' fallback when there are no factors", async () => {
    const workbook = await buildAndLoad(2024, makeSummary(), [], 0);
    const worksheet = sheet(workbook, "Factores utilizados");

    expect(worksheet.getRow(1).getCell(1).value).toBe(
      "Sin factores utilizados"
    );
  });
});
