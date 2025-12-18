import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";
import type { RoleData } from "./seedAllRoles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RoleDataSchema: z.ZodType<RoleData> = z.array(
  z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
);

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

  // Bulk insert organization_role entries
  await prisma.organization_role.createMany({
    data: organizationRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  // Verify all organization_role entries were created
  const organizationRoleEntries = await prisma.organization_role.findMany();

  if (organizationRoleEntries.length !== organizationRoles.length)
    throw new Error(
      `Expected ${organizationRoles.length} organization_role entries but found ${organizationRoleEntries.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${organizationRolesData.length} organization role entries exist: ${organizationRoles.map((r) => r.name).join(", ")} for dataset ${dataset}`
  );
}
