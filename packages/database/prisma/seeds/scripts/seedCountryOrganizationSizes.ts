import { type PrismaClient } from "../../../index.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type OrganizationSizeData = {
  name: string;
  country_iso_code: string;
};

export async function seedCountryOrganizationSizes(prisma: PrismaClient) {
  console.log("Seeding country organization sizes...");

  // Get all countries from database
  const countries = await prisma.country.findMany();

  // Read country organization sizes
  const organizationSizesData: OrganizationSizeData[] = JSON.parse(
    readFileSync(
      join(__dirname, "../data/country_organization_size.json"),
      "utf-8"
    )
  );

  // Seed organization sizes
  const organizationSizes = await Promise.all(
    organizationSizesData.map((os) => {
      const country = countries.find((c) => c.iso_code === os.country_iso_code);
      if (!country) {
        throw new Error(`Country '${os.country_iso_code}' not found`);
      }
      return prisma.country_organization_size.upsert({
        where: { country_id_name: { country_id: country.id, name: os.name } },
        update: {},
        create: { name: os.name, country_id: country.id },
      });
    })
  );

  console.log(`✓ Created ${organizationSizes.length} organization sizes`);

  return organizationSizes;
}
