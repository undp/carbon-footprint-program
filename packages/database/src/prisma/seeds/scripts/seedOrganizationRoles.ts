import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";
import { RoleDataSchema } from "./shared.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function seedOrganizationRoles(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding organization role entries...");

  // Read organization roles
  const organizationRolesData = RoleDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "organization_roles.json", dataset),
        "utf-8"
      )
    )
  );

  // Check the data has no duplicated based on name
  checkForDuplicates(organizationRolesData, ["name"]);

  // Fetch organization roles to get their IDs
  const organizationRoles = await prisma.role.findMany({
    where: {
      name: { in: organizationRolesData.map((r) => r.name) },
    },
  });

  // Verify all organization roles exist
  if (organizationRoles.length !== organizationRolesData.length)
    throw new Error(
      `Expected ${organizationRolesData.length} organization roles but found ${organizationRoles.length} for dataset ${dataset}`
    );

  // Bulk insert organizationRole entries
  await prisma.organizationRole.createMany({
    data: organizationRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  // Verify all organizationRole entries were created
  const organizationRoleEntries = await prisma.organizationRole.findMany();

  if (organizationRoleEntries.length !== organizationRoles.length)
    throw new Error(
      `Expected ${organizationRoles.length} organizationRole entries but found ${organizationRoleEntries.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${organizationRolesData.length} organization role entries exist: ${organizationRoles.map((r) => r.name).join(", ")} for dataset ${dataset}`
  );
}
