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

type RoleData = {
  name: string;
  description: string;
};

export async function seedAllRoles(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding all roles...");

  // Read organization roles
  const organizationRolesData: RoleData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "organization_roles.json", dataset),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on name
  checkForDuplicates(organizationRolesData, ["name"]);

  // Read system roles
  const systemRolesData: RoleData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "system_roles.json", dataset),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on name
  checkForDuplicates(systemRolesData, ["name"]);

  // Combine all roles
  const allRolesData = [...organizationRolesData, ...systemRolesData];

  // Batch create all roles (skips duplicates)
  await prisma.role.createMany({
    data: allRolesData,
    skipDuplicates: true,
  });

  // Verify all roles were created
  const allRoles = await prisma.role.findMany();

  if (allRoles.length !== allRolesData.length)
    throw new Error(
      `Expected ${allRolesData.length} roles but found ${allRoles.length}`
    );

  console.log(
    `✓ Ensured ${allRolesData.length} roles exist (${organizationRolesData.length} organization + ${systemRolesData.length} system)`
  );
}
