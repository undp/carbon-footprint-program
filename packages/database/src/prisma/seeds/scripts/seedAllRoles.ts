import { type PrismaClient, type Prisma } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type RoleData = Pick<Prisma.roleCreateInput, "name" | "description">[];

const RoleDataSchema: z.ZodType<RoleData> = z.array(
  z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  })
);

export async function seedAllRoles(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding all roles...");

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

  // Read system roles
  const systemRolesData = RoleDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(__dirname, "system_roles.json", dataset),
        "utf-8"
      )
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
      `Expected ${allRolesData.length} roles but found ${allRoles.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${allRolesData.length} roles exist (${organizationRolesData.length} organization + ${systemRolesData.length} system) for dataset ${dataset}`
  );
}
