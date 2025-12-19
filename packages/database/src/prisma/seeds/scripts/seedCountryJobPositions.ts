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

type JobPositionData = (Pick<Prisma.country_job_positionCreateInput, "name"> & {
  country_iso_code: Prisma.countryCreateInput["iso_code"];
})[];

const JobPositionDataSchema: z.ZodType<JobPositionData> = z.array(
  z.object({
    name: z.string().min(1),
    country_iso_code: z.string().min(1),
  })
);

export async function seedCountryJobPositions(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country job positions...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  // Read country job positions
  const jobPositionsData = JobPositionDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "country_job_positions.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicated based on country_iso_code and name
  checkForDuplicates(jobPositionsData, ["country_iso_code", "name"]);

  // Prepare job positions data with country_id
  const jobPositionsToCreate = jobPositionsData.map((jp) => {
    const country = countryByIso.get(jp.country_iso_code);
    if (!country)
      throw new Error(
        `Country '${jp.country_iso_code}' not found in dataset ${dataset}`
      );
    return { name: jp.name, country_id: country.id };
  });

  // Batch create job positions (skips duplicates)
  await prisma.country_job_position.createMany({
    data: jobPositionsToCreate,
    skipDuplicates: true,
  });

  // Verify all job positions were created
  const jobPositions = await prisma.country_job_position.findMany();

  if (jobPositions.length !== jobPositionsData.length)
    throw new Error(
      `Expected ${jobPositionsData.length} job positions but found ${jobPositions.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${jobPositionsData.length} job positions exist for dataset ${dataset}`
  );
}
