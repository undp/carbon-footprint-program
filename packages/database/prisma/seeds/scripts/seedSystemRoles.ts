import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  checkForDuplicates,
  generateSeedDataPath,
  type SeedsDataset,
} from "../utils/index.js";
import type { RoleData } from "./seedAllRoles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function seedSystemRoles(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding system role entries...");

  // Read system roles
  const systemRolesData: RoleData = JSON.parse(
    readFileSync(
      generateSeedDataPath(__dirname, "system_roles.json", dataset),
      "utf-8"
    )
  );

  // Check the data has no duplicated based on name
  checkForDuplicates(systemRolesData, ["name"]);

  // Fetch system roles to get their IDs
  const systemRoles = await prisma.role.findMany({
    where: {
      name: { in: systemRolesData.map((r) => r.name) },
    },
  });

  // Verify all system roles exist
  if (systemRoles.length !== systemRolesData.length)
    throw new Error(
      `Expected ${systemRolesData.length} system roles but found ${systemRoles.length}`
    );

  // Bulk insert system_role entries
  await prisma.system_role.createMany({
    data: systemRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  // Verify all system_role entries were created
  const systemRoleEntries = await prisma.system_role.findMany();

  if (systemRoleEntries.length !== systemRoles.length)
    throw new Error(
      `Expected ${systemRoles.length} system_role entries but found ${systemRoleEntries.length}`
    );

  console.log(
    `✓ Ensured ${systemRolesData.length} system role entries exist: ${systemRoles.map((r) => r.name).join(", ")} for dataset ${dataset}`
  );
}
