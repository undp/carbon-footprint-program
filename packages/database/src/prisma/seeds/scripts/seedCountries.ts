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

type CountryData = Pick<Prisma.CountryCreateInput, "name" | "isoCode">[];

const CountryDataSchema: z.ZodType<CountryData> = z.array(
  z.object({
    name: z.string().min(1),
    isoCode: z.string().min(1),
  })
);

export async function seedCountries(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding countries...");

  // Read countries
  const countriesData = CountryDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "countries.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicated based isoCode
  checkForDuplicates(countriesData, ["isoCode"]);

  // Upsert each country by isoCode so re-running the seed propagates name changes
  // to existing rows without creating duplicates.
  for (const { name, isoCode } of countriesData) {
    await prisma.country.upsert({
      where: { isoCode },
      update: { name },
      create: { name, isoCode },
    });
  }

  console.log(
    `✓ Ensured ${countriesData.length} countries exist for dataset ${dataset}`
  );
}
