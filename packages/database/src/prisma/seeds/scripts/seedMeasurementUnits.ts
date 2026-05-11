import { type PrismaClient, type Prisma } from "../../../index.js";
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

type MeasurementUnitData = (Pick<
  Prisma.MeasurementUnitCreateInput,
  "name" | "abbreviation" | "baseFactor" | "isBase"
> & { magnitudeCode: string })[];

const MeasurementUnitDataSchema: z.ZodType<MeasurementUnitData> = z.array(
  z.object({
    magnitudeCode: z.string().min(1),
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

  // Build code → id map. seedMagnitudes (called earlier in seed.ts) must have
  // already populated the magnitude table.
  const magnitudes = await prisma.magnitude.findMany({
    select: { id: true, code: true },
  });
  const magnitudeIdByCode = new Map(magnitudes.map((m) => [m.code, m.id]));

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
  const measurementUnitsToCreate = measurementUnitsData.map((mu) => {
    const magnitudeId = magnitudeIdByCode.get(mu.magnitudeCode);
    if (!magnitudeId) {
      throw new Error(
        `Unknown magnitudeCode '${mu.magnitudeCode}' for measurement unit '${mu.abbreviation}' in dataset ${dataset}. Add it to SYSTEM_MAGNITUDES or seed it explicitly.`
      );
    }
    return {
      magnitudeId,
      name: mu.name,
      abbreviation: mu.abbreviation,
      baseFactor: mu.baseFactor,
      isBase: mu.isBase,
    };
  });

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

  // Assert canonical RMU coverage: every MU must have a canonical kg/<MU.abbreviation> RMU
  const kgMu = await prisma.measurementUnit.findUnique({
    where: { abbreviation: "kg" },
  });
  if (!kgMu) {
    throw new Error(
      `Canonical RMU coverage check failed for dataset ${dataset}: no MeasurementUnit with abbreviation "kg" found. The "kg" unit is required as the numerator for all canonical RMUs.`
    );
  }

  const allMus = await prisma.measurementUnit.findMany({
    select: { id: true, abbreviation: true },
  });
  const canonicalRmus = await prisma.rateMeasurementUnit.findMany({
    where: { numeratorMeasurementUnitId: kgMu.id },
    select: { denominatorMeasurementUnitId: true, abbreviation: true },
  });
  const canonicalRmuKeys = new Set(
    canonicalRmus.map(
      (r) => `${r.denominatorMeasurementUnitId.toString()}|${r.abbreviation}`
    )
  );
  const missingMusAbbrev = allMus.filter(
    (mu) => !canonicalRmuKeys.has(`${mu.id.toString()}|kg/${mu.abbreviation}`)
  );
  if (missingMusAbbrev.length > 0) {
    throw new Error(
      `Canonical RMU coverage check failed for dataset ${dataset}: the following MeasurementUnits are missing their canonical "kg/<abbreviation>" RateMeasurementUnit (matched by both denominatorMeasurementUnitId and abbreviation): ${missingMusAbbrev.map((mu) => `${mu.abbreviation} (id=${mu.id}, expected RMU abbreviation="kg/${mu.abbreviation}")`).join(", ")}`
    );
  }

  console.log("✓ Measurement units seeded successfully!");
}
