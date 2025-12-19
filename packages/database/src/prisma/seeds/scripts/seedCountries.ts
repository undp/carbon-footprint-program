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

type CountryData = Pick<Prisma.countryCreateInput, "name" | "iso_code">[];

const CountryDataSchema: z.ZodType<CountryData> = z.array(
  z.object({
    name: z.string().min(1),
    iso_code: z.string().min(1),
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

  // Check the data has no duplicated based iso_code
  checkForDuplicates(countriesData, ["iso_code"]);

  // Batch create countries (skips duplicates)
  await prisma.country.createMany({
    data: countriesData.map((country) => ({
      name: country.name,
      iso_code: country.iso_code,
    })),
    skipDuplicates: true,
  });

  // Verify all countries were created
  const countries = await prisma.country.findMany();

  if (countries.length !== countriesData.length)
    throw new Error(
      `Expected ${countriesData.length} countries but found ${countries.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${countriesData.length} countries exist for dataset ${dataset}`
  );
}
