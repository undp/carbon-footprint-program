import { type PrismaClient, Magnitude } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MeasurementUnitData = {
  magnitude: string;
  name: string;
  abbreviation: string;
  factor_base: number;
  is_base: boolean;
};

type RateMeasurementUnitData = {
  name: string;
  abbreviation: string;
  numerator_measurement_unit_id: number;
  denominator_measurement_unit_id: number;
};

export async function seedMeasurementUnits(prisma: PrismaClient) {
  console.log("Seeding measurement units...");

  // Read measurement units
  const measurementUnitsData: MeasurementUnitData[] = JSON.parse(
    readFileSync(join(__dirname, "data/measurement_units.json"), "utf-8")
  );

  // Seed measurement units
  const measurementUnits = await Promise.all(
    measurementUnitsData.map((mu) =>
      prisma.measurement_unit.upsert({
        where: { abbreviation: mu.abbreviation },
        update: {
          magnitude: mu.magnitude.toUpperCase() as Magnitude,
          name: mu.name,
          factor_base: mu.factor_base,
          is_base: mu.is_base,
        },
        create: {
          magnitude: mu.magnitude.toUpperCase() as Magnitude,
          name: mu.name,
          abbreviation: mu.abbreviation,
          factor_base: mu.factor_base,
          is_base: mu.is_base,
        },
      })
    )
  );

  console.log(
    `✓ Created ${measurementUnits.length} measurement units: ${measurementUnits.map((mu) => mu.abbreviation).join(", ")}`
  );

  // Seed rate measurement units
  const rateMeasurementUnitsData: RateMeasurementUnitData[] = JSON.parse(
    readFileSync(join(__dirname, "data/rate_measurement_units.json"), "utf-8")
  );

  const rateMeasurementUnits = await Promise.all(
    rateMeasurementUnitsData.map((rmu) => {
      const [upper, lower] = rmu.abbreviation.split("/");

      const numeratorMeasurementUnit = measurementUnits.find(
        (mu) => mu.abbreviation === upper
      );
      if (!numeratorMeasurementUnit) {
        throw new Error(`Numerator measurement unit '${upper}' not found`);
      }

      const denominatorMeasurementUnit = measurementUnits.find(
        (mu) => mu.abbreviation === lower
      );
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
    `✓ Created ${rateMeasurementUnits.length} rate measurement units: ${rateMeasurementUnits.map((rmu) => rmu.abbreviation).join(", ")}`
  );

  console.log("✓ Measurement units seeded successfully!");
}
