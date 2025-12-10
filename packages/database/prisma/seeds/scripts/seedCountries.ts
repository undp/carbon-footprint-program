import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkForDuplicates } from "../../utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CountryData = {
  name: string;
  iso_code: string;
  active_methodology_version_id: number | null;
};

export async function seedCountries(prisma: PrismaClient) {
  console.log("Seeding countries...");

  // Read countries
  const countriesData: CountryData[] = JSON.parse(
    readFileSync(join(__dirname, "../data/countries.json"), "utf-8")
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
          active_methodology_version_id: country.active_methodology_version_id,
        },
        create: {
          name: country.name,
          iso_code: country.iso_code,
          active_methodology_version_id: country.active_methodology_version_id,
        },
      })
    )
  );

  console.log(`✓ Created ${countries.length} countries`);

  return countries;
}
