import { type PrismaClient, type Prisma } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type OrganizationMainActivityData = {
  country_iso_code: Prisma.countryCreateInput["iso_code"];
  sector: Prisma.country_sectorCreateInput["name"] | null;
  main_activities: Prisma.organization_main_activityCreateManyInput["name"][];
}[];

export async function seedOrganizationMainActivities(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding organization main activities...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  // Get all sectors from database
  const sectors = await prisma.country_sector.findMany();
  const sectorMap = new Map(
    sectors.map((s) => [`${s.country_id}_${s.name}`, s])
  );

  // Read organization main activities data
  const organizationMainActivitiesData: OrganizationMainActivityData =
    JSON.parse(
      readFileSync(
        generateSeedDataPath(
          __dirname,
          "organization_main_activities.json",
          dataset
        ),
        "utf-8"
      )
    );

  // Check for duplicates
  for (const item of organizationMainActivitiesData) {
    checkForPrimitiveDuplicates(
      item.main_activities,
      `main_activities in ${item.country_iso_code} - ${item.sector || "Generic"}`
    );
  }

  // Prepare main activities data
  const mainActivitiesToCreate: Pick<
    Prisma.organization_main_activityCreateManyInput,
    "name" | "country_sector_id" | "country_subsector_id"
  >[] = [];

  for (const item of organizationMainActivitiesData) {
    const country = countryByIso.get(item.country_iso_code);
    if (!country)
      throw new Error(
        `Country '${item.country_iso_code}' not found in dataset ${dataset}`
      );

    let sectorId: bigint | null = null;

    if (item.sector) {
      const sector = sectorMap.get(`${country.id}_${item.sector}`);
      if (!sector)
        throw new Error(
          `Sector '${item.sector}' not found for country '${item.country_iso_code}' in dataset ${dataset}`
        );
      sectorId = sector.id;
    }

    for (const activityName of item.main_activities) {
      mainActivitiesToCreate.push({
        name: activityName,
        country_sector_id: sectorId,
        country_subsector_id: null,
      });
    }
  }

  // Batch create main activities (skips duplicates thanks to NULLS NOT DISTINCT unique index)
  await prisma.organization_main_activity.createMany({
    data: mainActivitiesToCreate,
    skipDuplicates: true,
  });

  // Verify all main activities were created
  const mainActivities = await prisma.organization_main_activity.findMany();

  if (mainActivities.length !== mainActivitiesToCreate.length)
    throw new Error(
      `Expected ${mainActivitiesToCreate.length} main activities but found ${mainActivities.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${mainActivitiesToCreate.length} organization main activities exist for dataset ${dataset}`
  );
  console.log("✓ Organization main activities seeded successfully!");
}
