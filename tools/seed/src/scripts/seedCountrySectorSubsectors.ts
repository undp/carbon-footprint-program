import { type PrismaClient, type Prisma } from "@repo/database";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CountrySectorSubsectorData = {
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
  sector: Prisma.CountrySectorCreateInput["name"];
  subsectors: Prisma.CountrySubsectorCreateInput["name"][];
}[];

const CountrySectorSubsectorDataSchema: z.ZodType<CountrySectorSubsectorData> =
  z.array(
    z.object({
      countryIsoCode: z.string().min(1),
      sector: z.string().min(1),
      subsectors: z.array(z.string().min(1)),
    })
  );

export async function seedCountrySectorSubsectors(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country sectors and subsectors...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  // Read country sector subsectors
  const countrySectorSubsectorsData = CountrySectorSubsectorDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(
          __dirname,
          "country_sector_subsectors.json",
          dataset
        ),
        "utf-8"
      )
    )
  );

  checkForDuplicates(countrySectorSubsectorsData, ["countryIsoCode", "sector"]);
  for (const item of countrySectorSubsectorsData) {
    checkForPrimitiveDuplicates(
      item.subsectors,
      `subsectors in ${item.countryIsoCode} - ${item.sector}`
    );
  }

  // Prepare sectors data with countryId
  const sectorsToCreate = countrySectorSubsectorsData.map((item) => {
    const country = countryByIso.get(item.countryIsoCode);
    if (!country) {
      throw new Error(
        `Country '${item.countryIsoCode}' not found in dataset ${dataset}`
      );
    }
    return {
      countryId: country.id,
      name: item.sector,
    };
  });

  // Batch create sectors (skips duplicates)
  await prisma.countrySector.createMany({
    data: sectorsToCreate,
    skipDuplicates: true,
  });

  // Fetch all sectors to get their IDs for subsectors
  const sectors = await prisma.countrySector.findMany();

  // Verify all sectors were created
  if (sectors.length !== sectorsToCreate.length)
    throw new Error(
      `Expected ${sectorsToCreate.length} sectors but found ${sectors.length} for dataset ${dataset}`
    );

  // Create a map for quick sector lookup
  const sectorMap = new Map(
    sectors.map((s) => [`${s.countryId}_${s.name}`, s])
  );

  // Prepare subsectors data
  const subsectorsToCreate: { countrySectorId: bigint; name: string }[] = [];
  for (const item of countrySectorSubsectorsData) {
    const country = countryByIso.get(item.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${item.countryIsoCode}' not found in dataset ${dataset}`
      );

    const sector = sectorMap.get(`${country.id}_${item.sector}`);
    if (!sector)
      throw new Error(
        `Sector '${item.sector}' not found for country '${item.countryIsoCode}' in dataset ${dataset}`
      );

    for (const subsectorName of item.subsectors) {
      subsectorsToCreate.push({
        countrySectorId: sector.id,
        name: subsectorName,
      });
    }
  }

  // Batch create subsectors (skips duplicates)
  await prisma.countrySubsector.createMany({
    data: subsectorsToCreate,
    skipDuplicates: true,
  });

  // Verify all subsectors were created
  const subsectors = await prisma.countrySubsector.findMany();

  if (subsectors.length !== subsectorsToCreate.length)
    throw new Error(
      `Expected ${subsectorsToCreate.length} subsectors but found ${subsectors.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${sectorsToCreate.length} sectors exist for dataset ${dataset}`
  );
  console.log(
    `✓ Ensured ${subsectorsToCreate.length} subsectors exist for dataset ${dataset}`
  );
  console.log("✓ Country sectors and subsectors seeded successfully!");
}
