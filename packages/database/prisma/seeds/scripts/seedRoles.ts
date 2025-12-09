import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type RoleData = {
  name: string;
  description: string;
};

export async function seedRoles(prisma: PrismaClient) {
  console.log("Seeding roles...");

  // Read organization roles
  const organizationRolesData: RoleData[] = JSON.parse(
    readFileSync(join(__dirname, "../data/organization_roles.json"), "utf-8")
  );

  // Read system roles
  const systemRolesData: RoleData[] = JSON.parse(
    readFileSync(join(__dirname, "../data/system_roles.json"), "utf-8")
  );

  // Seed organization roles
  const organizationRoles = await Promise.all(
    organizationRolesData.map((roleData) =>
      prisma.role.upsert({
        where: { name: roleData.name },
        update: { description: roleData.description },
        create: {
          name: roleData.name,
          description: roleData.description,
        },
      })
    )
  );

  // Bulk insert organization_role entries
  await prisma.organization_role.createMany({
    data: organizationRoles.map((role) => ({ id: role.id })),
    skipDuplicates: true,
  });

  console.log(
    `✓ Created ${organizationRoles.length} organization roles: ${organizationRoles.map((r) => r.name).join(", ")}`
  );

  // Seed system roles
  const systemRoles = await Promise.all(
    systemRolesData.map((roleData) =>
      prisma.role.upsert({
        where: { name: roleData.name },
        update: { description: roleData.description },
        create: {
          name: roleData.name,
          description: roleData.description,
        },
      })
    )
  );

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
