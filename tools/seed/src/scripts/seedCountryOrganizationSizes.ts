import { type PrismaClient, type Prisma } from "@repo/database";
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

type OrganizationSizeData = (Pick<
  Prisma.CountryOrganizationSizeCreateInput,
  "name"
> & {
  countryIsoCode: Prisma.CountryCreateInput["isoCode"];
})[];

const OrganizationSizeDataSchema: z.ZodType<OrganizationSizeData> = z.array(
  z.object({
    name: z.string().min(1),
    countryIsoCode: z.string().min(1),
  })
);

export async function seedCountryOrganizationSizes(
  prisma: PrismaClient,
  dataset: SeedsDataset
) {
  console.log("Seeding country organization sizes...");

  // Get all countries from database
  const countries = await prisma.country.findMany();
  const countryByIso = new Map(countries.map((c) => [c.isoCode, c]));

  // Read country organization sizes
  const organizationSizesData = OrganizationSizeDataSchema.parse(
    JSON.parse(
      readFileSync(
        generateSeedDataPath(
          __dirname,
          "country_organization_size.json",
          dataset
        ),
        "utf-8"
      )
    )
  );

  checkForDuplicates(organizationSizesData, ["countryIsoCode", "name"]);

  // Prepare organization sizes data with countryId. `position` is assigned per-country
  // in the order the seed file declares them, so the JSON authors control the default
  // ordering presented in the admin maintainer.
  const positionByCountry = new Map<bigint, number>();
  const organizationSizesToCreate = organizationSizesData.map((os) => {
    const country = countryByIso.get(os.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${os.countryIsoCode}' not found in dataset ${dataset}`
      );
    const nextPosition = (positionByCountry.get(country.id) ?? 0) + 1;
    positionByCountry.set(country.id, nextPosition);
    return { name: os.name, countryId: country.id, position: nextPosition };
  });

  // Batch create organization sizes (skips duplicates)
  await prisma.countryOrganizationSize.createMany({
    data: organizationSizesToCreate,
    skipDuplicates: true,
  });

  // Verify all organization sizes were created
  const organizationSizes = await prisma.countryOrganizationSize.findMany();

  if (organizationSizes.length !== organizationSizesData.length)
    throw new Error(
      `Expected ${organizationSizesData.length} organization sizes but found ${organizationSizes.length} for dataset ${dataset}`
    );

  console.log(
    `✓ Ensured ${organizationSizesData.length} organization sizes exist for dataset ${dataset}`
  );
}
