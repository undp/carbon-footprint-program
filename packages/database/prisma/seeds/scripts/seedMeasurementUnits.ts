import { type PrismaClient, Magnitude } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { checkForDuplicates, generateSeedDataPath } from "../utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MeasurementUnitData = {
  magnitude: string;
  name: string;
  abbreviation: string;
  base_factor: number;
  is_base: boolean;
};

type RateMeasurementUnitData = {
  name: string;
  abbreviation: string;
};

export async function seedMeasurementUnits(
  prisma: PrismaClient,
  environment: "base" | "testing"
) {
  console.log("Seeding measurement units...");

  // Read measurement units
  const measurementUnitsData: MeasurementUnitData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "measurement_units.json", environment),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on abbreviation
  checkForDuplicates(measurementUnitsData, ["abbreviation"]);

  // Seed measurement units
  const measurementUnits = await Promise.all(
    measurementUnitsData.map((mu) =>
      prisma.measurement_unit.upsert({
        where: { abbreviation: mu.abbreviation },
        update: {
          magnitude: mu.magnitude.toUpperCase() as Magnitude,
          name: mu.name,
          base_factor: mu.base_factor,
          is_base: mu.is_base,
        },
        create: {
          magnitude: mu.magnitude.toUpperCase() as Magnitude,
          name: mu.name,
          abbreviation: mu.abbreviation,
          base_factor: mu.base_factor,
          is_base: mu.is_base,
        },
      })
    )
  );

  console.log(
    `✓ Ensured ${measurementUnits.length} measurement units exist: ${measurementUnits.map((mu) => mu.abbreviation).join(", ")}`
  );

  const measurementUnitsByAbbreviation = new Map(
    measurementUnits.map((mu) => [mu.abbreviation, mu])
  );

  // Seed rate measurement units
  const rateMeasurementUnitsData: RateMeasurementUnitData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(
        __dirname,
        "rate_measurement_units.json",
        environment
      ),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on abbreviation
  checkForDuplicates(rateMeasurementUnitsData, ["abbreviation"]);

  const rateMeasurementUnits = await Promise.all(
    rateMeasurementUnitsData.map((rmu) => {
      const [upper, lower] = rmu.abbreviation.split("/");

      const numeratorMeasurementUnit =
        measurementUnitsByAbbreviation.get(upper);
      if (!numeratorMeasurementUnit) {
        throw new Error(`Numerator measurement unit '${upper}' not found`);
      }
      const denominatorMeasurementUnit =
        measurementUnitsByAbbreviation.get(lower);
      if (!denominatorMeasurementUnit) {
        throw new Error(`Denominator measurement unit '${lower}' not found`);
      }

      return prisma.rate_measurement_unit.upsert({
        where: { abbreviation: rmu.abbreviation },
        update: {
          name: rmu.name,
          numerator_measurement_unit_id: numeratorMeasurementUnit.id,
          denominator_measurement_unit_id: denominatorMeasurementUnit.id,
        },
        create: {
          name: rmu.name,
          abbreviation: rmu.abbreviation,
          numerator_measurement_unit_id: numeratorMeasurementUnit.id,
          denominator_measurement_unit_id: denominatorMeasurementUnit.id,
        },
      });
    })
  );

  console.log(
    `✓ Ensured ${rateMeasurementUnits.length} rate measurement units exist: ${rateMeasurementUnits.map((rmu) => rmu.abbreviation).join(", ")}`
  );

  console.log("✓ Measurement units seeded successfully!");
}
