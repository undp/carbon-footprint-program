import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  describeConversionCollision,
  findConversionCollisions,
  generateSeedDataPath,
  type RateUnitMagnitudes,
  type SeededFactor,
  type SeedsDataset,
} from "@/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

const scriptsDir = dirname(dirname(fileURLToPath(import.meta.url)));

const MeasurementUnitsSchema = z.array(
  z.object({ abbreviation: z.string(), magnitudeCode: z.string() })
);
const RateMeasurementUnitsSchema = z.array(
  z.object({ abbreviation: z.string() })
);

const readSeedJson = (fileName: string, dataset: SeedsDataset): unknown =>
  JSON.parse(
    readFileSync(generateSeedDataPath(scriptsDir, fileName, dataset), "utf-8")
  );

/**
 * Resolves each rate unit's numerator and denominator magnitudes the way
 * `seedMeasurementUnits` resolves its measurement units: by splitting the
 * abbreviation on `/`.
 */
function loadMagnitudesByRateUnit(
  dataset: SeedsDataset
): Map<string, RateUnitMagnitudes> {
  const magnitudeByUnit = new Map(
    MeasurementUnitsSchema.parse(
      readSeedJson("measurement_units.json", dataset)
    ).map((unit) => [unit.abbreviation, unit.magnitudeCode])
  );
  const magnitudeOf = (abbreviation: string): string => {
    const magnitude = magnitudeByUnit.get(abbreviation);
    if (!magnitude) {
      throw new Error(`Unknown measurement unit '${abbreviation}'`);
    }
    return magnitude;
  };

  return new Map(
    RateMeasurementUnitsSchema.parse(
      readSeedJson("rate_measurement_units.json", dataset)
    ).map(({ abbreviation }) => {
      const [numerator = "", denominator = ""] = abbreviation
        .split("/")
        .map((part) => part.trim());
      return [
        abbreviation,
        {
          numerator: magnitudeOf(numerator),
          denominator: magnitudeOf(denominator),
        },
      ];
    })
  );
}

function loadSeededFactors(dataset: SeedsDataset): SeededFactor[] {
  return FullMethodologyDataSchema.parse(
    readSeedJson("methodologies.json", dataset)
  ).flatMap((methodology) =>
    methodology.categories.flatMap((category) =>
      category.subcategories.flatMap((subcategory) =>
        (subcategory.emissionFactors ?? []).map((factor) => ({
          subcategory: `${subcategory.name} (${methodology.countryIsoCode}, ${methodology.name}, ${category.name})`,
          dimensionValue1: factor.dimensionValue1?.valueName ?? null,
          dimensionValue2: factor.dimensionValue2?.valueName ?? null,
          rateMeasurementUnitAbbreviation:
            factor.rateMeasurementUnitAbbreviation,
          source: factor.source,
          year: factor.year,
        }))
      )
    )
  );
}

describe.each<SeedsDataset>(["base", "testing"])(
  "seeded emission factors (%s)",
  (dataset) => {
    it("never give capture two candidates through unit conversion", () => {
      const collisions = findConversionCollisions(
        loadSeededFactors(dataset),
        loadMagnitudesByRateUnit(dataset)
      );

      expect(collisions.map(describeConversionCollision)).toEqual([]);
    });
  }
);
