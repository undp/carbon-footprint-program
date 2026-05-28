import {
  type PrismaClient,
  type Prisma,
  CountryOrganizationSizeStatus,
} from "../../../index.js";
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

  // Group seed entries per country, preserving JSON order. `position` is derived
  // from that order so JSON authors control the default ordering shown in the
  // admin maintainer.
  const sizesByCountryId = new Map<
    bigint,
    { name: string; position: number }[]
  >();
  for (const os of organizationSizesData) {
    const country = countryByIso.get(os.countryIsoCode);
    if (!country)
      throw new Error(
        `Country '${os.countryIsoCode}' not found in dataset ${dataset}`
      );
    const list = sizesByCountryId.get(country.id) ?? [];
    list.push({ name: os.name, position: list.length + 1 });
    sizesByCountryId.set(country.id, list);
  }

  // Per-country transaction: re-running the seed must propagate name/position
  // changes to existing rows without creating duplicates. The partial unique
  // index on (country_id, position) WHERE status <> 'DELETED' forbids transient
  // collisions during reordering, so existing active rows are shifted to a high
  // position range first and then assigned their final positions.
  for (const [countryId, sizes] of sizesByCountryId) {
    const shiftOffset = sizes.length + 1_000_000;
    await prisma.$transaction(async (tx) => {
      await tx.countryOrganizationSize.updateMany({
        where: { countryId, status: CountryOrganizationSizeStatus.ACTIVE },
        data: { position: { increment: shiftOffset } },
      });

      for (const { name, position } of sizes) {
        const { count } = await tx.countryOrganizationSize.updateMany({
          where: {
            countryId,
            name,
            status: CountryOrganizationSizeStatus.ACTIVE,
          },
          data: { position },
        });
        if (count === 0) {
          await tx.countryOrganizationSize.create({
            data: {
              countryId,
              name,
              position,
              status: CountryOrganizationSizeStatus.ACTIVE,
            },
          });
        }
      }
    });
  }

  console.log(
    `✓ Ensured ${organizationSizesData.length} organization sizes exist for dataset ${dataset}`
  );
}
