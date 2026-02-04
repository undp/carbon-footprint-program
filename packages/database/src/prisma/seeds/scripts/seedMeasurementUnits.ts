import { type PrismaClient, type Prisma, Magnitude } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MeasurementUnitData = Pick<
  Prisma.MeasurementUnitCreateInput,
  "magnitude" | "name" | "abbreviation" | "baseFactor" | "isBase"
>[];

const MeasurementUnitDataSchema: z.ZodType<MeasurementUnitData> = z.array(
  z.object({
    magnitude: z.enum(Magnitude),
    name: z.string().min(1),
    abbreviation: z.string().min(1),
    baseFactor: z.number(),
    isBase: z.boolean(),
  })
);

type RateMeasurementUnitData = Pick<
  Prisma.RateMeasurementUnitCreateInput,
  "name" | "abbreviation"
>[];

const RateMeasurementUnitDataSchema: z.ZodType<RateMeasurementUnitData> =
  z.array(
    z.object({
      name: z.string().min(1),
      abbreviation: z.string().min(1),
    })
  );

export async function seedMeasurementUnits(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding measurement units...");

  // Read measurement units
  const measurementUnitsData = MeasurementUnitDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "measurement_units.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicated based on abbreviation
  checkForDuplicates(measurementUnitsData, ["abbreviation"]);

  // Prepare measurement units data
  const measurementUnitsToCreate = measurementUnitsData.map((mu) => ({
    magnitude: mu.magnitude.toUpperCase() as Magnitude,
    name: mu.name,
    abbreviation: mu.abbreviation,
    baseFactor: mu.baseFactor,
    isBase: mu.isBase,
  }));

  // Batch create measurement units (skips duplicates)
  await prisma.measurementUnit.createMany({
    data: measurementUnitsToCreate,
    skipDuplicates: true,
  });

  // Fetch all measurement units to use for rate measurement units
  const measurementUnits = await prisma.measurementUnit.findMany();

  // Verify all measurement units were created
  if (measurementUnits.length !== measurementUnitsData.length)
    throw new Error(
      `Expected ${measurementUnitsData.length} measurement units but found ${measurementUnits.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${measurementUnitsData.length} measurement units exist: ${measurementUnits.map((mu) => mu.abbreviation).join(", ")} for dataset ${dataset}`
  );

  const measurementUnitsByAbbreviation = new Map(
    measurementUnits.map((mu) => [mu.abbreviation, mu])
  );

  // Seed rate measurement units
  const rateMeasurementUnitsData = RateMeasurementUnitDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "rate_measurement_units.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicated based on abbreviation
  checkForDuplicates(rateMeasurementUnitsData, ["abbreviation"]);

  // Prepare rate measurement units data
  const rateMeasurementUnitsToCreate = rateMeasurementUnitsData.map((rmu) => {
    const parts = rmu.abbreviation.split("/").map((p) => p.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        `Invalid rate measurement unit abbreviation '${rmu.abbreviation}'. Expected format 'NUM/DEN' for dataset ${dataset}`
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
      numeratorMeasurementUnitId: numeratorMeasurementUnit.id,
      denominatorMeasurementUnitId: denominatorMeasurementUnit.id,
    };
  });

  // Batch create rate measurement units (skips duplicates)
  await prisma.rateMeasurementUnit.createMany({
    data: rateMeasurementUnitsToCreate,
    skipDuplicates: true,
  });

  // Verify all rate measurement units were created
  const rateMeasurementUnits = await prisma.rateMeasurementUnit.findMany();

  if (rateMeasurementUnits.length !== rateMeasurementUnitsData.length)
    throw new Error(
      `Expected ${rateMeasurementUnitsData.length} rate measurement units but found ${rateMeasurementUnits.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${rateMeasurementUnitsData.length} rate measurement units exist: ${rateMeasurementUnitsToCreate.map((rmu) => rmu.abbreviation).join(", ")} for dataset ${dataset}`
  );

  console.log("✓ Measurement units seeded successfully!");
}
