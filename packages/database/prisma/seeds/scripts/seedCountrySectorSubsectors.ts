import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  checkForPrimitiveDuplicates,
} from "../../utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CountrySectorSubsectorData = {
  country_iso_code: string;
  sector: string;
  subsectors: string[];
};

export async function seedCountrySectorSubsectors(prisma: PrismaClient) {
  console.log("Seeding country sectors and subsectors...");

  // Get all countries from database
  const countries = await prisma.country.findMany();

  // Read country sector subsectors
  const countrySectorSubsectorsData: CountrySectorSubsectorData[] = JSON.parse(
    readFileSync(
      join(__dirname, "../data/country_sector_subsectors.json"),
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
    const country = countries.find((c) => c.iso_code === item.country_iso_code);
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
    for (const subsectorName of item.subsectors) {
      await prisma.country_subsector.upsert({
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
      });

      totalSubsectors++;
    }
  }

  console.log(`✓ Created ${totalSectors} sectors`);
  console.log(`✓ Created ${totalSubsectors} subsectors`);
  console.log("✓ Country sectors and subsectors seeded successfully!");
}
