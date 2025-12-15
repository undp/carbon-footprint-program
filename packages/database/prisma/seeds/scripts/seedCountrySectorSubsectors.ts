import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CountrySectorSubsectorData = {
  country_iso_code: string;
  sector: string;
  subsectors: string[];
};

export async function seedCountrySectorSubsectors(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country sectors and subsectors...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  // Read country sector subsectors
  const countrySectorSubsectorsData: CountrySectorSubsectorData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(
        __dirname,
        "country_sector_subsectors.json",
        dataset
      ),
      "utf-8"
    )
  );

  checkForDuplicates(countrySectorSubsectorsData, [
    "country_iso_code",
    "sector",
  ]);
  for (const item of countrySectorSubsectorsData) {
    checkForPrimitiveDuplicates(
      item.subsectors,
      `subsectors in ${item.country_iso_code} - ${item.sector}`
    );
  }

  // Prepare sectors data with country_id
  const sectorsToCreate = countrySectorSubsectorsData.map((item) => {
    const country = countryByIso.get(item.country_iso_code);
    if (!country) {
      throw new Error(
        `Country '${item.country_iso_code}' not found in dataset ${dataset}`
      );
    }
    return {
      country_id: country.id,
      name: item.sector,
    };
  });

  // Batch create sectors (skips duplicates)
  await prisma.country_sector.createMany({
    data: sectorsToCreate,
    skipDuplicates: true,
  });

  // Fetch all sectors to get their IDs for subsectors
  const sectors = await prisma.country_sector.findMany();

  // Verify all sectors were created
  if (sectors.length !== sectorsToCreate.length)
    throw new Error(
      `Expected ${sectorsToCreate.length} sectors but found ${sectors.length}`
    );

  // Create a map for quick sector lookup
  const sectorMap = new Map(
    sectors.map((s) => [`${s.country_id}_${s.name}`, s])
  );

  // Prepare subsectors data
  const subsectorsToCreate: { country_sector_id: bigint; name: string }[] = [];
  for (const item of countrySectorSubsectorsData) {
    const country = countryByIso.get(item.country_iso_code);
    if (!country)
      throw new Error(
        `Country '${item.country_iso_code}' not found in dataset ${dataset}`
      );

    const sector = sectorMap.get(`${country.id}_${item.sector}`);
    if (!sector)
      throw new Error(
        `Sector '${item.sector}' not found for country '${item.country_iso_code}' in dataset ${dataset}`
      );

    for (const subsectorName of item.subsectors) {
      subsectorsToCreate.push({
        country_sector_id: sector.id,
        name: subsectorName,
      });
    }
  }

  // Batch create subsectors (skips duplicates)
  await prisma.country_subsector.createMany({
    data: subsectorsToCreate,
    skipDuplicates: true,
  });

  // Verify all subsectors were created
  const subsectors = await prisma.country_subsector.findMany();

  if (subsectors.length !== subsectorsToCreate.length)
    throw new Error(
      `Expected ${subsectorsToCreate.length} subsectors but found ${subsectors.length}`
    );

  console.log(`✓ Ensured ${sectorsToCreate.length} sectors exist`);
  console.log(`✓ Ensured ${subsectorsToCreate.length} subsectors exist`);
  console.log("✓ Country sectors and subsectors seeded successfully!");
}
