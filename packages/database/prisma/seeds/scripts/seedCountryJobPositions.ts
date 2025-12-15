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

type JobPositionData = {
  name: string;
  country_iso_code: string;
};

export async function seedCountryJobPositions(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country job positions...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  // Read country job positions
  const jobPositionsData: JobPositionData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "country_job_positions.json", dataset),
      "utf-8"
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

  console.log(`✓ Ensured ${jobPositionsData.length} job positions exist`);
}
