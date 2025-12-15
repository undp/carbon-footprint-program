import { type PrismaClient, Magnitude } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

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
  dataset: SeedsDataset
) {
  console.log("Seeding measurement units...");

  // Read measurement units
  const measurementUnitsData: MeasurementUnitData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "measurement_units.json", dataset),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on abbreviation
  checkForDuplicates(measurementUnitsData, ["abbreviation"]);

  // Prepare measurement units data
  const measurementUnitsToCreate = measurementUnitsData.map((mu) => ({
    magnitude: mu.magnitude.toUpperCase() as Magnitude,
    name: mu.name,
    abbreviation: mu.abbreviation,
    base_factor: mu.base_factor,
    is_base: mu.is_base,
  }));

  // Batch create measurement units (skips duplicates)
  await prisma.measurement_unit.createMany({
    data: measurementUnitsToCreate,
    skipDuplicates: true,
  });

  // Fetch all measurement units to use for rate measurement units
  const measurementUnits = await prisma.measurement_unit.findMany({
    where: {
      abbreviation: { in: measurementUnitsData.map((mu) => mu.abbreviation) },
    },
  });

  console.log(
    `✓ Ensured ${measurementUnitsData.length} measurement units exist: ${measurementUnits.map((mu) => mu.abbreviation).join(", ")}`
  );

  const measurementUnitsByAbbreviation = new Map(
    measurementUnits.map((mu) => [mu.abbreviation, mu])
  );

  // Seed rate measurement units
  const rateMeasurementUnitsData: RateMeasurementUnitData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "rate_measurement_units.json", dataset),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on abbreviation
  checkForDuplicates(rateMeasurementUnitsData, ["abbreviation"]);

  // Prepare rate measurement units data
  const rateMeasurementUnitsToCreate = rateMeasurementUnitsData.map((rmu) => {
    const parts = rmu.abbreviation.split("/").map((p) => p.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        `Invalid rate measurement unit abbreviation '${rmu.abbreviation}'. Expected format 'NUM/DEN'`
      );
    }
    const [upper, lower] = parts;

    const numeratorMeasurementUnit = measurementUnitsByAbbreviation.get(upper);
    if (!numeratorMeasurementUnit) {
      throw new Error(
        `Numerator measurement unit '${upper}' not found in dataset ${dataset}`
      );
    }
    const denominatorMeasurementUnit =
      measurementUnitsByAbbreviation.get(lower);
    if (!denominatorMeasurementUnit) {
      throw new Error(
        `Denominator measurement unit '${lower}' not found in dataset ${dataset}`
      );
    }

    return {
      name: rmu.name,
      abbreviation: rmu.abbreviation,
      numerator_measurement_unit_id: numeratorMeasurementUnit.id,
      denominator_measurement_unit_id: denominatorMeasurementUnit.id,
    };
  });

  // Batch create rate measurement units (skips duplicates)
  await prisma.rate_measurement_unit.createMany({
    data: rateMeasurementUnitsToCreate,
    skipDuplicates: true,
  });

  console.log(
    `✓ Ensured ${rateMeasurementUnitsData.length} rate measurement units exist: ${rateMeasurementUnitsToCreate.map((rmu) => rmu.abbreviation).join(", ")}`
  );

  console.log("✓ Measurement units seeded successfully!");
}
