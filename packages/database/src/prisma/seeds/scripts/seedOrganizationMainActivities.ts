import {
  type PrismaClient,
  type Prisma,
  OrganizationMainActivityStatus,
} from "../../../index.js";
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

  // Upsert each row by (name, countrySectorId, countrySubsectorId) against the
  // partial unique index (NULLS NOT DISTINCT) so re-runs are idempotent. There
  // are no extra non-key fields to propagate today.
  for (const item of mainActivitiesToCreate) {
    const countrySectorId = item.countrySectorId ?? null;
    const countrySubsectorId = item.countrySubsectorId ?? null;
    const existing = await prisma.organizationMainActivity.findFirst({
      where: {
        name: item.name,
        countrySectorId,
        countrySubsectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.organizationMainActivity.create({
        data: {
          name: item.name,
          countrySectorId,
          countrySubsectorId,
          status: OrganizationMainActivityStatus.ACTIVE,
        },
      });
    }
  }

  console.log(
    `✓ Ensured ${mainActivitiesToCreate.length} organization main activities exist for dataset ${dataset}`
  );
  console.log("✓ Organization main activities seeded successfully!");
}
