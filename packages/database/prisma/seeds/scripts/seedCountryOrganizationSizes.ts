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

type OrganizationSizeData = {
  name: string;
  country_iso_code: string;
};

export async function seedCountryOrganizationSizes(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country organization sizes...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.iso_code, c]));

  // Read country organization sizes
  const organizationSizesData: OrganizationSizeData[] = JSON.parse(
    readFileSync(
      generateSeedDataPath(
        __dirname,
        "country_organization_size.json",
        dataset
      ),
      "utf-8"
    )
  );

  checkForDuplicates(organizationSizesData, ["country_iso_code", "name"]);

  // Prepare organization sizes data with country_id
  const organizationSizesToCreate = organizationSizesData.map((os) => {
    const country = countryByIso.get(os.country_iso_code);
    if (!country)
      throw new Error(
        `Country '${os.country_iso_code}' not found in dataset ${dataset}`
      );
    return { name: os.name, country_id: country.id };
  });

  // Batch create organization sizes (skips duplicates)
  await prisma.country_organization_size.createMany({
    data: organizationSizesToCreate,
    skipDuplicates: true,
  });

  console.log(
    `✓ Ensured ${organizationSizesData.length} organization sizes exist`
  );
}
