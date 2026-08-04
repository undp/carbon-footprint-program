import { describe, expect, it } from "vitest";
import { buildCarbonInventoryZipReadme } from "./buildCarbonInventoryZipReadme";

// Fixed local-time instant (no Date.now / no UTC parsing) so `format` reads
// back stable wall-clock components regardless of the runner's timezone.
const GENERATED_AT = new Date(2024, 0, 15, 9, 30);
// Spanish long-date rendering date-fns produces for GENERATED_AT with the `es`
// locale: "d 'de' MMMM 'de' yyyy, HH:mm".
const GENERATED_STR = "15 de enero de 2024, 09:30";

// The invariant body (everything after the two header lines). Mirrored verbatim
// from the source so a copy edit forces a deliberate test update.
const BODY = `IMPORTANTE
Este resumen refleja lo mismo que ves en pantalla: incluye todas las
líneas y subcategorías activas del inventario, estén completas o
incompletas. Una línea queda incompleta cuando le falta algún dato
necesario para calcular sus emisiones: cantidad, unidad, fuente del
factor o valor del factor. En el modo manual, una subcategoría queda
incompleta mientras no se haya ingresado su total de emisiones.

Las líneas incompletas aparecen sin valor de emisiones. El total de
emisiones solo considera las líneas completas, por lo que puede aumentar
a medida que completes los datos pendientes.

Contenido:

- resumen-emisiones.xlsx
  Resumen detallado de emisiones, con desglose por categoría,
  subcategoría y línea (completas e incompletas). La columna "Item ID"
  identifica cada línea y se corresponde con el segmento "item-{id}" de
  los archivos en la carpeta archivos/.

- metodologia.xlsx
  Metodología aplicada al inventario (categorías, subcategorías,
  factores de emisión).

- archivos/
  Archivos de respaldo adjuntos a las líneas del inventario, tanto
  completas como incompletas.
`;

const expectedReadme = (header: string): string =>
  `${header}\nGenerado: ${GENERATED_STR}\n\n${BODY}`;

describe("buildCarbonInventoryZipReadme — full output", () => {
  it("renders the complete README for a named inventory with a year", () => {
    const result = buildCarbonInventoryZipReadme({
      inventoryName: "Inventario 2024",
      year: 2024,
      generatedAt: GENERATED_AT,
    });

    expect(result).toBe(
      expectedReadme("Huella de carbono — Inventario 2024 (2024)")
    );
  });

  it("trims surrounding whitespace from the inventory name", () => {
    const result = buildCarbonInventoryZipReadme({
      inventoryName: "  Planta Norte  ",
      year: 2023,
      generatedAt: GENERATED_AT,
    });

    expect(result).toBe(
      expectedReadme("Huella de carbono — Planta Norte (2023)")
    );
  });
});

describe("buildCarbonInventoryZipReadme — header fallbacks", () => {
  const firstLine = (input: {
    inventoryName: string | null;
    year: number | null;
  }): string =>
    buildCarbonInventoryZipReadme({
      ...input,
      generatedAt: GENERATED_AT,
    }).split("\n")[0];

  // Explicit tuple type: the columns mix string|null and number|null, so pin
  // the shape rather than rely on it.each's array-literal inference.
  const cases: ReadonlyArray<[string, string | null, number | null, string]> = [
    ["name and year present", "Sede Central", 2022, "Sede Central (2022)"],
    ["null name → sin nombre", null, 2022, "sin nombre (2022)"],
    ["empty name → sin nombre", "", 2022, "sin nombre (2022)"],
    ["whitespace name → sin nombre", "   ", 2022, "sin nombre (2022)"],
    ["null year → sin año", "Sede Central", null, "Sede Central (sin año)"],
    ["both null", null, null, "sin nombre (sin año)"],
    // `year ?? "sin año"` keeps 0 (a falsy but non-null year) rather than
    // replacing it, unlike the `||` fallback used for the name.
    ["year zero is preserved", "Sede Central", 0, "Sede Central (0)"],
  ];

  it.each(cases)(
    "builds the header for %s",
    (_label, inventoryName, year, tail) => {
      expect(firstLine({ inventoryName, year })).toBe(
        `Huella de carbono — ${tail}`
      );
    }
  );
});

describe("buildCarbonInventoryZipReadme — invariants", () => {
  it("renders the generated timestamp on the second line", () => {
    const line = buildCarbonInventoryZipReadme({
      inventoryName: "X",
      year: 2024,
      generatedAt: GENERATED_AT,
    }).split("\n")[1];

    expect(line).toBe(`Generado: ${GENERATED_STR}`);
  });

  it("keeps the body identical regardless of the header inputs", () => {
    const bodyOf = (input: {
      inventoryName: string | null;
      year: number | null;
    }): string => {
      const text = buildCarbonInventoryZipReadme({
        ...input,
        generatedAt: GENERATED_AT,
      });
      // Drop the two header lines; the remainder is the static body.
      return text.slice(text.indexOf("IMPORTANTE"));
    };

    expect(bodyOf({ inventoryName: "A", year: 2024 })).toBe(BODY);
    expect(bodyOf({ inventoryName: null, year: null })).toBe(BODY);
  });

  it("lists the three archive entries the ZIP contains", () => {
    const result = buildCarbonInventoryZipReadme({
      inventoryName: "X",
      year: 2024,
      generatedAt: GENERATED_AT,
    });

    expect(result).toContain("- resumen-emisiones.xlsx");
    expect(result).toContain("- metodologia.xlsx");
    expect(result).toContain("- archivos/");
  });
});
