import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import {
  MethodologyVersionStatus,
  type GetMethodologyExportResponse,
} from "@repo/types";
import { downloadBlob } from "@/utils/files";
import {
  buildMethodologyWorkbook,
  exportMethodologyToExcel,
} from "./exportMethodologyToExcel";

// Only the leaf browser-download primitive is stubbed; every workbook-building
// helper (display, sanitize*, formatter, downloadBuffer) runs for real so the
// assertions below reflect the true rendered bytes.
vi.mock("@/utils/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/files")>();
  return { ...actual, downloadBlob: vi.fn() };
});

const NUMBER_FORMAT = "0.##########";
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const SHEET_NAMES = [
  "Metodología",
  "Categorías",
  "Subcategorías",
  "Dimensiones",
  "Variables",
  "Factores de emisión",
] as const;

// A fully-populated methodology exercising every branch: two categories, a
// subcategory with units/dimensions/values/factors, a numeric factor with both
// dimension values + a non-numeric factor with none, and a second (barren)
// subcategory whose empty collections hit the "-" / no-row fallbacks.
const fullMethodology: GetMethodologyExportResponse = {
  id: "1",
  name: "Metodología nacional",
  description: "Descripción de la metodología",
  regulation: "Norma 123",
  version: "v1.0",
  status: MethodologyVersionStatus.PUBLISHED,
  categories: [
    {
      id: "10",
      name: "Energía",
      position: 1,
      synonyms: "Combustión, Electricidad",
      description: "Emisiones de energía",
      subcategories: [
        {
          id: "100",
          name: "Electricidad",
          description: "Consumo eléctrico",
          measurementUnits: [
            { id: "1000", name: "kWh", abbreviation: "kWh" },
            { id: "1001", name: "MWh", abbreviation: "MWh" },
          ],
          dimensions: [
            {
              id: "200",
              name: "Combustible",
              position: 1,
              isRequired: true,
              values: [
                { id: "300", value: "Diésel" },
                { id: "301", value: "Gasolina" },
              ],
            },
            {
              id: "201",
              name: "Región",
              position: 2,
              isRequired: false,
              values: [{ id: "302", value: "Norte" }],
            },
          ],
          emissionFactors: [
            {
              id: "400",
              source: "IPCC 2006",
              value: "2.5",
              gasDetails: {
                CO2_FOSSIL: 2.5,
                CH4: 0.001,
                N2O: 0.002,
                HFC: 0,
                PFC: 0,
                SF6: 0,
                NF3: 0,
              },
              dimensionValue1: { id: "300", value: "Diésel" },
              dimensionValue2: { id: "302", value: "Norte" },
              rateMeasurementUnit: {
                id: "500",
                name: "Kilogramo por kilovatio hora",
                abbreviation: "kg/kWh",
              },
            },
            {
              id: "401",
              // Empty source → display "-"; non-numeric value → kept as text.
              source: "",
              value: "N/A",
              gasDetails: {
                CO2_FOSSIL: 0,
                CH4: 0,
                N2O: 0,
                HFC: 0,
                PFC: 0,
                SF6: 0,
                NF3: 0,
              },
              // Both null → dimension columns render "-".
              dimensionValue1: null,
              dimensionValue2: null,
              rateMeasurementUnit: {
                id: "501",
                name: "Kilogramo por megavatio hora",
                abbreviation: "kg/MWh",
              },
            },
          ],
        },
      ],
    },
    {
      id: "11",
      name: "Transporte",
      position: 2,
      synonyms: "Movilidad",
      description: "Emisiones de transporte",
      subcategories: [
        {
          id: "101",
          name: "Terrestre",
          description: "Vehículos terrestres",
          // Empty units → join("") → display "-"; no dims/factors → no rows.
          measurementUnits: [],
          dimensions: [],
          emissionFactors: [],
        },
      ],
    },
  ],
};

// No categories at all: every collection-backed sheet keeps just its header.
const emptyMethodology: GetMethodologyExportResponse = {
  id: "2",
  name: "Metodología vacía",
  description: "",
  regulation: "Norma vacía",
  version: "v0",
  status: MethodologyVersionStatus.UNPUBLISHED,
  categories: [],
};

async function loadWorkbook(
  methodology: GetMethodologyExportResponse
): Promise<ExcelJS.Workbook> {
  const buffer = await buildMethodologyWorkbook(methodology);
  const workbook = new ExcelJS.Workbook();
  // exceljs's `load` accepts the ArrayBuffer the builder returns at runtime.
  await workbook.xlsx.load(buffer);
  return workbook;
}

function getSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) throw new Error(`Missing worksheet: ${name}`);
  return worksheet;
}

describe("buildMethodologyWorkbook", () => {
  it("creates exactly the six expected worksheets", async () => {
    const workbook = await loadWorkbook(fullMethodology);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      ...SHEET_NAMES,
    ]);
  });

  it("writes the methodology attributes with headers and a status label", async () => {
    const workbook = await loadWorkbook(fullMethodology);
    const sheet = getSheet(workbook, "Metodología");

    expect(sheet.getRow(1).values).toEqual([
      undefined,
      "Nombre",
      "Descripción",
      "Normativa",
      "Versión",
      "Estado",
    ]);
    const dataRow = sheet.getRow(2);
    expect(dataRow.getCell(1).value).toBe("Metodología nacional");
    expect(dataRow.getCell(2).value).toBe("Descripción de la metodología");
    expect(dataRow.getCell(3).value).toBe("Norma 123");
    expect(dataRow.getCell(4).value).toBe("v1.0");
    expect(dataRow.getCell(5).value).toBe("Activa");
  });

  it.each<[MethodologyVersionStatus, string]>([
    [MethodologyVersionStatus.PUBLISHED, "Activa"],
    [MethodologyVersionStatus.UNPUBLISHED, "Inactiva"],
    [MethodologyVersionStatus.DELETED, "Eliminada"],
  ])("maps the %s status to its chip label", async (status, label) => {
    const workbook = await loadWorkbook({ ...fullMethodology, status });
    expect(getSheet(workbook, "Metodología").getRow(2).getCell(5).value).toBe(
      label
    );
  });

  it("renders '-' for an empty methodology description", async () => {
    const workbook = await loadWorkbook(emptyMethodology);
    const dataRow = getSheet(workbook, "Metodología").getRow(2);
    expect(dataRow.getCell(2).value).toBe("-");
    expect(dataRow.getCell(5).value).toBe("Inactiva");
  });

  it("lists categories with position, name, synonyms and description", async () => {
    const sheet = getSheet(await loadWorkbook(fullMethodology), "Categorías");

    expect(sheet.getRow(1).values).toEqual([
      undefined,
      "Posición",
      "Nombre",
      "Sinónimos",
      "Descripción",
    ]);
    expect(sheet.getRow(2).getCell(1).value).toBe(1);
    expect(sheet.getRow(2).getCell(2).value).toBe("Energía");
    expect(sheet.getRow(2).getCell(3).value).toBe("Combustión, Electricidad");
    expect(sheet.getRow(2).getCell(4).value).toBe("Emisiones de energía");
    expect(sheet.getRow(3).getCell(1).value).toBe(2);
    expect(sheet.getRow(3).getCell(2).value).toBe("Transporte");
    expect(sheet.rowCount).toBe(3);
  });

  it("lists subcategories and joins the accepted measurement unit names", async () => {
    const sheet = getSheet(
      await loadWorkbook(fullMethodology),
      "Subcategorías"
    );

    expect(sheet.getRow(2).getCell(1).value).toBe("Energía");
    expect(sheet.getRow(2).getCell(2).value).toBe("Electricidad");
    expect(sheet.getRow(2).getCell(3).value).toBe("Consumo eléctrico");
    expect(sheet.getRow(2).getCell(4).value).toBe("kWh, MWh");
  });

  it("renders '-' when a subcategory has no measurement units", async () => {
    const sheet = getSheet(
      await loadWorkbook(fullMethodology),
      "Subcategorías"
    );
    // Second subcategory row belongs to the barren "Terrestre" subcategory.
    expect(sheet.getRow(3).getCell(2).value).toBe("Terrestre");
    expect(sheet.getRow(3).getCell(4).value).toBe("-");
  });

  it("lists dimensions with Sí/No for the required flag", async () => {
    const sheet = getSheet(await loadWorkbook(fullMethodology), "Dimensiones");

    expect(sheet.getRow(2).getCell(4).value).toBe("Combustible");
    expect(sheet.getRow(2).getCell(5).value).toBe("Sí");
    expect(sheet.getRow(3).getCell(4).value).toBe("Región");
    expect(sheet.getRow(3).getCell(5).value).toBe("No");
    // Only the two dimensions of the populated subcategory produce rows.
    expect(sheet.rowCount).toBe(3);
  });

  it("flattens every dimension value into the Variables sheet", async () => {
    const sheet = getSheet(await loadWorkbook(fullMethodology), "Variables");

    expect(sheet.getRow(2).getCell(3).value).toBe("Combustible");
    expect(sheet.getRow(2).getCell(4).value).toBe("Diésel");
    expect(sheet.getRow(3).getCell(4).value).toBe("Gasolina");
    expect(sheet.getRow(4).getCell(3).value).toBe("Región");
    expect(sheet.getRow(4).getCell(4).value).toBe("Norte");
    expect(sheet.rowCount).toBe(4);
  });

  it("writes a numeric emission factor with the decimal number format", async () => {
    const sheet = getSheet(
      await loadWorkbook(fullMethodology),
      "Factores de emisión"
    );
    const row = sheet.getRow(2);

    expect(row.getCell(1).value).toBe("Energía");
    expect(row.getCell(2).value).toBe("Electricidad");
    expect(row.getCell(3).value).toBe("Diésel");
    expect(row.getCell(4).value).toBe("Norte");
    expect(row.getCell(5).value).toBe(2.5);
    expect(row.getCell(5).numFmt).toBe(NUMBER_FORMAT);
    expect(row.getCell(6).value).toBe("kg/kWh");
    expect(row.getCell(7).value).toBe("IPCC 2006");
  });

  it("applies the number format to every gas-detail column", async () => {
    const sheet = getSheet(
      await loadWorkbook(fullMethodology),
      "Factores de emisión"
    );
    const row = sheet.getRow(2);

    expect(row.getCell(8).value).toBe(2.5); // CO₂ fósil
    expect(row.getCell(9).value).toBe(0.001); // CH₄
    for (let col = 8; col <= 14; col++) {
      expect(row.getCell(col).numFmt).toBe(NUMBER_FORMAT);
    }
  });

  it("keeps a non-numeric factor value as text and renders '-' fallbacks", async () => {
    const sheet = getSheet(
      await loadWorkbook(fullMethodology),
      "Factores de emisión"
    );
    const row = sheet.getRow(3);

    expect(row.getCell(3).value).toBe("-"); // dimensionValue1 null
    expect(row.getCell(4).value).toBe("-"); // dimensionValue2 null
    expect(row.getCell(5).value).toBe("N/A"); // non-numeric value kept verbatim
    expect(row.getCell(5).numFmt).not.toBe(NUMBER_FORMAT);
    expect(row.getCell(6).value).toBe("kg/MWh");
    expect(row.getCell(7).value).toBe("-"); // empty source
    // Only the two factors of the populated subcategory produce rows.
    expect(sheet.rowCount).toBe(3);
  });

  it("keeps every sheet header-only when there are no categories", async () => {
    const workbook = await loadWorkbook(emptyMethodology);

    for (const name of ["Categorías", "Subcategorías", "Variables"] as const) {
      const sheet = getSheet(workbook, name);
      expect(sheet.rowCount).toBe(1);
      expect(sheet.getRow(2).getCell(1).value).toBeNull();
    }
    // The Metodología sheet always carries its single attribute row.
    expect(getSheet(workbook, "Metodología").rowCount).toBe(2);
  });
});

describe("exportMethodologyToExcel", () => {
  beforeEach(() => {
    vi.mocked(downloadBlob).mockClear();
  });

  it("builds the workbook and triggers a sanitized, dated .xlsx download", async () => {
    await exportMethodologyToExcel({
      ...fullMethodology,
      name: "Plan / 2026",
    });

    expect(downloadBlob).toHaveBeenCalledOnce();
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(XLSX_MIME);
    // "/" is sanitized to "-" and the DD-MM-YYYY stamp is appended.
    expect(filename).toMatch(/^Plan - 2026-\d{2}-\d{2}-\d{4}\.xlsx$/);
  });
});
