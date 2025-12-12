import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedEnvironment,
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
  environment: SeedEnvironment
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
        environment
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

  let totalSectors = 0;
  let totalSubsectors = 0;

  // Process each country's sectors and subsectors
  for (const item of countrySectorSubsectorsData) {
    const country = countryByIso.get(item.country_iso_code);
    if (!country) {
      throw new Error(`Country '${item.country_iso_code}' not found`);
    }

    // Create or update the sector
    const sector = await prisma.country_sector.upsert({
      where: {
        country_id_name: {
          country_id: country.id,
          name: item.sector,
        },
      },
      update: {},
      create: {
        country_id: country.id,
        name: item.sector,
      },
    });

    totalSectors++;

    // Create or update subsectors for this sector
    await Promise.all(
      item.subsectors.map((subsectorName) =>
        prisma.country_subsector.upsert({
          where: {
            country_sector_id_name: {
              country_sector_id: sector.id,
              name: subsectorName,
            },
          },
          update: {},
          create: {
            country_sector_id: sector.id,
            name: subsectorName,
          },
        })
      )
    );

    totalSubsectors += item.subsectors.length;
  }

  console.log(`✓ Ensured ${totalSectors} sectors exist`);
  console.log(`✓ Ensured ${totalSubsectors} subsectors exist`);
  console.log("✓ Country sectors and subsectors seeded successfully!");
}
