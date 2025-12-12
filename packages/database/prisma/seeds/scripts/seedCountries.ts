import { type PrismaClient } from "../../../index.js";
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

type CountryData = {
  name: string;
  iso_code: string;
};

export async function seedCountries(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding countries...");

  // Read countries
  const countriesData: CountryData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "countries.json", dataset),
      "utf-8"
    )
  );

  // Check the data has no duplicated based iso_code
  checkForDuplicates(countriesData, ["iso_code"]);

  // Seed countries
  const countries = await Promise.all(
    countriesData.map((country) =>
      prisma.country.upsert({
        where: { iso_code: country.iso_code },
        update: {
          name: country.name,
        },
        create: {
          name: country.name,
          iso_code: country.iso_code,
        },
      })
    )
  );

  console.log(`✓ Ensured ${countries.length} countries exist`);

  return countries;
}
