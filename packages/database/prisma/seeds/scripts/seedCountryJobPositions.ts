import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type JobPositionData = {
  name: string;
  country_iso_code: string;
};

export async function seedCountryJobPositions(prisma: PrismaClient) {
  console.log("Seeding country job positions...");

  // Get all countries from database
  const countries = await prisma.country.findMany();

  // Read country job positions
  const jobPositionsData: JobPositionData[] = JSON.parse(
    readFileSync(join(__dirname, "data/country_job_positions.json"), "utf-8")
  );

  // Seed job positions
  const jobPositions = await Promise.all(
    jobPositionsData.map((jp) => {
      const country = countries.find((c) => c.iso_code === jp.country_iso_code);
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

  console.log(`✓ Created ${jobPositions.length} job positions`);

  return jobPositions;
}
