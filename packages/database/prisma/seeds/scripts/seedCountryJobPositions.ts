import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedEnvironment,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type JobPositionData = {
  name: string;
  country_iso_code: string;
};

export async function seedCountryJobPositions(
  prisma: PrismaClient,
  environment: SeedEnvironment
) {
  console.log("Seeding country job positions...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  // Read country job positions
  const jobPositionsData: JobPositionData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(
        __dirname,
        "country_job_positions.json",
        environment
      ),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on country_iso_code and name
  checkForDuplicates(jobPositionsData, ["country_iso_code", "name"]);

  // Seed job positions
  const jobPositions = await Promise.all(
    jobPositionsData.map((jp) => {
      const country = countryByIso.get(jp.country_iso_code);
      if (!country) {
        throw new Error(`Country '${jp.country_iso_code}' not found`);
      }
      return prisma.country_job_position.upsert({
        where: { country_id_name: { country_id: country.id, name: jp.name } },
        update: {},
        create: { name: jp.name, country_id: country.id },
      });
    })
  );

  console.log(`✓ Ensured ${jobPositions.length} job positions exist`);

  return jobPositions;
}
