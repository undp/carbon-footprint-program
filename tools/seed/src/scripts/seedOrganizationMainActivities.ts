import { type PrismaClient, type Prisma } from "@repo/database";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForPrimitiveDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type OrganizationMainActivityData = {
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
  sector: Prisma.CountrySectorCreateInput["name"] | null;
  mainActivities: Prisma.OrganizationMainActivityCreateManyInput["name"][];
}[];

const OrganizationMainActivityDataSchema: z.ZodType<OrganizationMainActivityData> =
  z.array(
    z.object({
      countryIsoCode: z.string().min(1),
      sector: z.string().min(1).nullable(),
      mainActivities: z.array(z.string().min(1)),
    })
  );

export async function seedOrganizationMainActivities(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding organization main activities...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  // Get all sectors from database
  const sectors = await prisma.countrySector.findMany();
  const sectorMap = new Map(
    sectors.map((s) => [`${s.countryId}_${s.name}`, s])
  );

  // Read organization main activities data
  const organizationMainActivitiesData =
    OrganizationMainActivityDataSchema.parse(
      JSON.parse(
        readFileSync(
          generateSeedDataPath(
            __dirname,
            "organization_main_activities.json",
            dataset
          ),
          "utf-8"
        )
      )
    );

  // Check for duplicates
  for (const item of organizationMainActivitiesData) {
    checkForPrimitiveDuplicates(
      item.mainActivities,
      `mainActivities in ${item.countryIsoCode} - ${item.sector || "Generic"}`
    );
  }

  // Prepare main activities data
  const mainActivitiesToCreate: Pick<
    Prisma.OrganizationMainActivityCreateManyInput,
    "name" | "countrySectorId" | "countrySubsectorId"
  >[] = [];

  for (const item of organizationMainActivitiesData) {
    const country = countryByIso.get(item.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${item.countryIsoCode}' not found in dataset ${dataset}`
      );

    let sectorId: bigint | null = null;

    if (item.sector) {
      const sector = sectorMap.get(`${country.id}_${item.sector}`);
      if (!sector)
        throw new Error(
          `Sector '${item.sector}' not found for country '${item.countryIsoCode}' in dataset ${dataset}`
        );
      sectorId = sector.id;
    }

    for (const activityName of item.mainActivities) {
      mainActivitiesToCreate.push({
        name: activityName,
        countrySectorId: sectorId,
        countrySubsectorId: null,
      });
    }
  }

  // Batch create main activities (skips duplicates thanks to NULLS NOT DISTINCT unique index)
  await prisma.organizationMainActivity.createMany({
    data: mainActivitiesToCreate,
    skipDuplicates: true,
  });

  // Verify all main activities were created
  const mainActivities = await prisma.organizationMainActivity.findMany();

  if (mainActivities.length !== mainActivitiesToCreate.length)
    throw new Error(
      `Expected ${mainActivitiesToCreate.length} main activities but found ${mainActivities.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${mainActivitiesToCreate.length} organization main activities exist for dataset ${dataset}`
  );
  console.log("✓ Organization main activities seeded successfully!");
}
