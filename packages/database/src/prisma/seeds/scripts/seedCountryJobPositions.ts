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

type JobPositionData = (Pick<Prisma.CountryJobPositionCreateInput, "name"> & {
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
})[];

const JobPositionDataSchema: z.ZodType<JobPositionData> = z.array(
  z.object({
    name: z.string().min(1),
    countryIsoCode: z.string().min(1),
  })
);

export async function seedCountryJobPositions(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country job positions...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  // Read country job positions
  const jobPositionsData = JobPositionDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "country_job_positions.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicated based on countryIsoCode and name
  checkForDuplicates(jobPositionsData, ["countryIsoCode", "name"]);

  // Upsert each job position by (countryId, name). The compound unique key fully
  // determines the row; there are no additional fields to propagate on re-run.
  for (const jp of jobPositionsData) {
    const country = countryByIso.get(jp.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${jp.countryIsoCode}' not found in dataset ${dataset}`
      );
    await prisma.countryJobPosition.upsert({
      where: { countryId_name: { countryId: country.id, name: jp.name } },
      update: {},
      create: { name: jp.name, countryId: country.id },
    });
  }

  console.log(
    `✓ Ensured ${jobPositionsData.length} job positions exist for dataset ${dataset}`
  );
}
