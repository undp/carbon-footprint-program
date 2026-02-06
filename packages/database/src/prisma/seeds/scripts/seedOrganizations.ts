import { type PrismaClient, OrganizationStatus } from "../../../index.js";
import { readFileSync, existsSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { generateSeedDataPath, type SeedsDataset } from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type OrganizationData = { status: OrganizationStatus }[];

const OrganizationDataSchema: z.ZodType<OrganizationData> = z.array(
  z.object({
    status: z.enum(OrganizationStatus),
  })
);

export async function seedOrganizations(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding organizations...");

  const dataPath = generateSeedDataPath(
    __dirname,
    "organizations.json",
    dataset
  );

  if (!existsSync(dataPath)) {
    console.log(
      `No organizations data found for dataset ${dataset} at ${dataPath}. Skipping...`
    );
    return;
  }

  // Read organizations
  const organizationsData = OrganizationDataSchema.parse(
    JSON.parse(readFileSync(dataPath, "utf-8"))
  );

  if (organizationsData.length === 0) {
    console.log(`✓ No organizations to seed for dataset ${dataset}`);
    return;
  }

  // Look up first country's ID for countryId
  const country = await prisma.country.findFirst({ select: { id: true } });
  if (!country) {
    throw new Error(
      "No country found in database. Please ensure countries are seeded before organizations."
    );
  }

  // Batch create organizations (skips duplicates)
  await prisma.organization.createMany({
    data: organizationsData.map((org) => ({
      countryId: country.id,
      status: org.status,
    })),
    skipDuplicates: true,
  });

  // Verify all organizations were created
  const organizations = await prisma.organization.findMany();

  if (organizations.length !== organizationsData.length)
    throw new Error(
      `Expected ${organizationsData.length} organizations but found ${organizations.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${organizationsData.length} organizations exist for dataset ${dataset}`
  );
}
