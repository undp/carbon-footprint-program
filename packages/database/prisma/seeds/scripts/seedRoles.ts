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

export async function seedRoles(prisma: PrismaClient, dataset: SeedsDataset) {
  console.log("Seeding roles...");

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

  // Batch create organization roles (skips duplicates)
  await prisma.role.createMany({
    data: organizationRolesData,
    skipDuplicates: true,
  });

  // Fetch organization roles to get their IDs
  const organizationRoles = await prisma.role.findMany({
    where: {
      name: { in: organizationRolesData.map((r) => r.name) },
    },
  });

  // Bulk insert organization_role entries
  await prisma.organization_role.createMany({
    data: organizationRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  console.log(
    `✓ Ensured ${organizationRolesData.length} organization roles exist: ${organizationRoles.map((r) => r.name).join(", ")}`
  );

  // Batch create system roles (skips duplicates)
  await prisma.role.createMany({
    data: systemRolesData,
    skipDuplicates: true,
  });

  // Fetch system roles to get their IDs
  const systemRoles = await prisma.role.findMany({
    where: {
      name: { in: systemRolesData.map((r) => r.name) },
    },
  });

  // Bulk insert system_role entries
  await prisma.system_role.createMany({
    data: systemRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  console.log(
    `✓ Ensured ${systemRolesData.length} system roles exist: ${systemRoles.map((r) => r.name).join(", ")}`
  );

  console.log("✓ Roles seeded successfully!");
}
