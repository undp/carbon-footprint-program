import ExcelJS from "exceljs";
import {
  MethodologyVersionStatus,
  type GetMethodologyExportResponse,
} from "@repo/types";
import {
  display,
  downloadBuffer,
  sanitizeExcelSheetName,
  sanitizeFilenamePart,
} from "@/services/excel";
import { formatter } from "./formatting";

const METHODOLOGY_STATUS_LABELS: Record<MethodologyVersionStatus, string> = {
  [MethodologyVersionStatus.PUBLISHED]: "Activa",
  [MethodologyVersionStatus.UNPUBLISHED]: "Inactiva",
  [MethodologyVersionStatus.DELETED]: "Eliminada",
};

type Methodology = GetMethodologyExportResponse;
type Category = Methodology["categories"][number];

type SheetColumn = Partial<ExcelJS.Column> & { key: string };

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12 };

function buildFilename(name: string): string {
  const sanitized = sanitizeFilenamePart(name);
  const dateStamp = formatter.dateForFileName();

  return `${sanitized}-${dateStamp}.xlsx`;
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: SheetColumn[]
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(sanitizeExcelSheetName(name));
  sheet.columns = columns;
  sheet.getRow(1).font = HEADER_FONT;
  return sheet;
}

function buildMethodologySheet(
  workbook: ExcelJS.Workbook,
  methodology: Methodology
): void {
  const sheet = addSheet(workbook, "Metodología", [
    { header: "Nombre", key: "name", width: 30 },
    { header: "Descripción", key: "description", width: 60 },
    { header: "Normativa", key: "regulation", width: 25 },
    { header: "Versión", key: "version", width: 15 },
    { header: "Estado", key: "status", width: 15 },
  ]);
  sheet.addRow({
    name: display(methodology.name),
    description: display(methodology.description),
    regulation: display(methodology.regulation),
    version: display(methodology.version),
    status: METHODOLOGY_STATUS_LABELS[methodology.status],
  });
}

function fillCategoriesSheet(
  sheet: ExcelJS.Worksheet,
  categories: Category[]
): void {
  for (const category of categories) {
    sheet.addRow({
      position: category.position,
      name: display(category.name),
      synonyms: display(category.synonyms),
      description: display(category.description),
    });
  }
}

function fillSubcategoriesSheet(
  sheet: ExcelJS.Worksheet,
  categories: Category[]
): void {
  for (const category of categories) {
    for (const subcategory of category.subcategories) {
      sheet.addRow({
        category: display(category.name),
        subcategory: display(subcategory.name),
        description: display(subcategory.description),
        measurementUnits: display(
          subcategory.measurementUnits.map((u) => u.name).join(", ")
        ),
      });
    }
  }
}

function fillDimensionsSheet(
  sheet: ExcelJS.Worksheet,
  categories: Category[]
): void {
  for (const category of categories) {
    for (const subcategory of category.subcategories) {
      for (const dimension of subcategory.dimensions) {
        sheet.addRow({
          category: display(category.name),
          subcategory: display(subcategory.name),
          position: dimension.position,
          name: display(dimension.name),
          isRequired: dimension.isRequired ? "Sí" : "No",
        });
      }
    }
  }
}

function fillVariablesSheet(
  sheet: ExcelJS.Worksheet,
  categories: Category[]
): void {
  for (const category of categories) {
    for (const subcategory of category.subcategories) {
      for (const dimension of subcategory.dimensions) {
        for (const value of dimension.values) {
          sheet.addRow({
            category: display(category.name),
            subcategory: display(subcategory.name),
            dimension: display(dimension.name),
            value: display(value.value),
          });
        }
      }
    }
  }
}

const NUMBER_FORMAT = "0.##########";
const GAS_DETAIL_KEYS = [
  "co2Fossil",
  "ch4",
  "n2o",
  "hfc",
  "pfc",
  "sf6",
  "nf3",
] as const;

function fillEmissionFactorsSheet(
  sheet: ExcelJS.Worksheet,
  categories: Category[]
): void {
  for (const category of categories) {
    for (const subcategory of category.subcategories) {
      for (const factor of subcategory.emissionFactors) {
        const numericValue = Number(factor.value);
        const row = sheet.addRow({
          category: display(category.name),
          subcategory: display(subcategory.name),
          dimension1: display(factor.dimensionValue1?.value ?? null),
          dimension2: display(factor.dimensionValue2?.value ?? null),
          value: Number.isFinite(numericValue) ? numericValue : factor.value,
          rateMeasurementUnit: display(factor.rateMeasurementUnit.abbreviation),
          source: display(factor.source),
          co2Fossil: factor.gasDetails.CO2_FOSSIL,
          ch4: factor.gasDetails.CH4,
          n2o: factor.gasDetails.N2O,
          hfc: factor.gasDetails.HFC,
          pfc: factor.gasDetails.PFC,
          sf6: factor.gasDetails.SF6,
          nf3: factor.gasDetails.NF3,
        });
        if (Number.isFinite(numericValue)) {
          row.getCell("value").numFmt = NUMBER_FORMAT;
        }
        for (const key of GAS_DETAIL_KEYS) {
          row.getCell(key).numFmt = NUMBER_FORMAT;
        }
      }
    }
  }
}

/**
 * Pure builder — produces the methodology workbook as an ArrayBuffer.
 * Shared between the maintainer's standalone download and the ZIP
 * orchestrator's `metodologia.xlsx` entry, so both render the exact same
 * workbook bytes.
 */
export async function buildMethodologyWorkbook(
  methodology: Methodology
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  buildMethodologySheet(workbook, methodology);

  const categoriesSheet = addSheet(workbook, "Categorías", [
    { header: "Posición", key: "position", width: 10 },
    { header: "Nombre", key: "name", width: 30 },
    { header: "Sinónimos", key: "synonyms", width: 40 },
    { header: "Descripción", key: "description", width: 60 },
  ]);
  fillCategoriesSheet(categoriesSheet, methodology.categories);

  const subcategoriesSheet = addSheet(workbook, "Subcategorías", [
    { header: "Categoría", key: "category", width: 30 },
    { header: "Nombre", key: "subcategory", width: 30 },
    { header: "Descripción", key: "description", width: 60 },
    { header: "Unidades aceptadas", key: "measurementUnits", width: 40 },
  ]);
  fillSubcategoriesSheet(subcategoriesSheet, methodology.categories);

  const dimensionsSheet = addSheet(workbook, "Dimensiones", [
    { header: "Categoría", key: "category", width: 30 },
    { header: "Subcategoría", key: "subcategory", width: 30 },
    { header: "Posición", key: "position", width: 10 },
    { header: "Nombre", key: "name", width: 30 },
    { header: "Requerido", key: "isRequired", width: 12 },
  ]);
  fillDimensionsSheet(dimensionsSheet, methodology.categories);

  const variablesSheet = addSheet(workbook, "Variables", [
    { header: "Categoría", key: "category", width: 30 },
    { header: "Subcategoría", key: "subcategory", width: 30 },
    { header: "Dimensión", key: "dimension", width: 30 },
    { header: "Valor", key: "value", width: 30 },
  ]);
  fillVariablesSheet(variablesSheet, methodology.categories);

  const factorsSheet = addSheet(workbook, "Factores de emisión", [
    { header: "Categoría", key: "category", width: 30 },
    { header: "Subcategoría", key: "subcategory", width: 30 },
    { header: "Dimensión 1", key: "dimension1", width: 25 },
    { header: "Dimensión 2", key: "dimension2", width: 25 },
    { header: "Valor", key: "value", width: 18 },
    { header: "Unidad", key: "rateMeasurementUnit", width: 18 },
    { header: "Fuente", key: "source", width: 30 },
    { header: "CO₂ fósil", key: "co2Fossil", width: 12 },
    { header: "CH₄", key: "ch4", width: 12 },
    { header: "N₂O", key: "n2o", width: 12 },
    { header: "HFC", key: "hfc", width: 12 },
    { header: "PFC", key: "pfc", width: 12 },
    { header: "SF₆", key: "sf6", width: 12 },
    { header: "NF₃", key: "nf3", width: 12 },
  ]);
  fillEmissionFactorsSheet(factorsSheet, methodology.categories);

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

export async function exportMethodologyToExcel(
  methodology: Methodology
): Promise<void> {
  const buffer = await buildMethodologyWorkbook(methodology);
  downloadBuffer(buffer, buildFilename(methodology.name));
}
