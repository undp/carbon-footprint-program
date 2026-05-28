import {
  type PrismaClient,
  SubcategoryRecommendationStatus,
} from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { generateSeedDataPath, type SeedsDataset } from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DataSchema = z.array(
  z.object({
    countryIsoCode: z.string().min(1),
    sectorName: z.string().min(1),
    subsectorName: z.string().min(1).optional(),
    subcategoryNames: z.array(z.string().min(1)).min(1),
  })
);

export async function seedSubcategoryRecommendations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding subcategory recommendations...");

  const raw = DataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(
          __dirname,
          "subcategory_recommendations.json",
          dataset
        ),
        "utf-8"
      )
    )
  );

  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  const sectors = await prisma.countrySector.findMany();
  const sectorMap = new Map(
    sectors.map((s) => [`${s.countryId}_${s.name}`, s])
  );

  const subsectors = await prisma.countrySubsector.findMany();
  const subsectorMap = new Map(
    subsectors.map((ss) => [`${ss.countrySectorId}_${ss.name}`, ss])
  );

  const subcategories = await prisma.subcategory.findMany();
  const subcategoryByName = new Map(subcategories.map((sc) => [sc.name, sc]));

  const recommendationsToCreate: {
    subcategoryId: bigint;
    sectorId: bigint;
    subsectorId: bigint | null;
  }[] = [];

  for (const entry of raw) {
    const country = countryByIso.get(entry.countryIsoCode);
    if (!country) throw new Error(`Country not found: ${entry.countryIsoCode}`);

    const sector = sectorMap.get(`${country.id}_${entry.sectorName}`);
    if (!sector)
      throw new Error(
        `Sector not found: '${entry.sectorName}' for country '${entry.countryIsoCode}'`
      );

    let subsectorId: bigint | null = null;
    if (entry.subsectorName) {
      const subsector = subsectorMap.get(`${sector.id}_${entry.subsectorName}`);
      if (!subsector)
        throw new Error(
          `Subsector not found: '${entry.subsectorName}' in sector '${entry.sectorName}'`
        );
      subsectorId = subsector.id;
    }

    for (const subcategoryName of entry.subcategoryNames) {
      const subcategory = subcategoryByName.get(subcategoryName);
      if (!subcategory)
        throw new Error(`Subcategory not found: '${subcategoryName}'`);
      recommendationsToCreate.push({
        subcategoryId: subcategory.id,
        sectorId: sector.id,
        subsectorId,
      });
    }
  }

  // Upsert by (subcategoryId, sectorId, subsectorId). No mutable fields to
  // propagate; findFirst + create is enough and also handles NULL subsector
  // correctly (the partial unique index treats NULLs as distinct).
  for (const rec of recommendationsToCreate) {
    const existing = await prisma.subcategoryRecommendation.findFirst({
      where: {
        subcategoryId: rec.subcategoryId,
        sectorId: rec.sectorId,
        subsectorId: rec.subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.subcategoryRecommendation.create({
        data: { ...rec, status: SubcategoryRecommendationStatus.ACTIVE },
      });
    }
  }

  console.log(
    `✓ Seeded ${recommendationsToCreate.length} subcategory recommendations`
  );
}
