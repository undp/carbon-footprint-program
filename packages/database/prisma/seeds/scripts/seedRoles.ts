import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { checkForDuplicates } from "../../utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type RoleData = {
  name: string;
  description: string;
};

async function upsertRoles(prisma: PrismaClient, data: RoleData[]) {
  return Promise.all(
    data.map((d) =>
      prisma.role.upsert({
        where: { name: d.name },
        update: { description: d.description },
        create: {
          name: d.name,
          description: d.description,
        },
      })
    )
  );
}

export async function seedRoles(prisma: PrismaClient) {
  console.log("Seeding roles...");

  // Read organization roles
  const organizationRolesData: RoleData[] = JSON.parse(
    readFileSync(join(__dirname, "../data/organization_roles.json"), "utf-8")
  );

  // Check the data has no duplicated based on name
  checkForDuplicates(organizationRolesData, ["name"]);

  // Read system roles
  const systemRolesData: RoleData[] = JSON.parse(
    readFileSync(join(__dirname, "../data/system_roles.json"), "utf-8")
  );

  // Check the data has no duplicated based on name
  checkForDuplicates(systemRolesData, ["name"]);

  // Seed organization roles
  const organizationRoles = await upsertRoles(prisma, organizationRolesData);

  // Bulk insert organization_role entries
  await prisma.organization_role.createMany({
    data: organizationRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  console.log(
    `✓ Created ${organizationRoles.length} organization roles: ${organizationRoles.map((r) => r.name).join(", ")}`
  );

  // Seed system roles
  const systemRoles = await upsertRoles(prisma, systemRolesData);

  // Bulk insert system_role entries
  await prisma.system_role.createMany({
    data: systemRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  console.log(
    `✓ Created ${systemRoles.length} system roles: ${systemRoles.map((r) => r.name).join(", ")}`
  );

  console.log("✓ Roles seeded successfully!");
}
