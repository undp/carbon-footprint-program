import { type PrismaClient } from "../../../../index.js";
import { z } from "zod";
import { checkForDuplicates, type SeedsDataset } from "../../utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedMethodologies(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding methodologies...");

  // Extract only methodology-level data (without nested categories)
  const methodologiesData = nestedData.map((methodology) => ({
    country_iso_code: methodology.country_iso_code,
    name: methodology.name,
    description: methodology.description,
    status_code: methodology.status_code,
  }));

  // Check the data has no duplicates based on country_iso_code and name
  checkForDuplicates(methodologiesData, ["country_iso_code", "name"]);

  // Fetch countries to map iso_code to id
  const countries = await prisma.country.findMany();
  const countriesByIsoCode = new Map(
    countries.map((country) => [country.iso_code, country])
  );

  // Fetch status catalog entity entries to map code to id
  const statusCatalogEntries = await prisma.status_catalog.findMany({
    where: {
      scope: "ENTITY",
    },
  });
  const statusByCode = new Map(
    statusCatalogEntries.map((status) => [status.code, status])
  );

  // Prepare methodologies data
  const methodologiesToCreate = methodologiesData.map((methodology) => {
    const country = countriesByIsoCode.get(methodology.country_iso_code);
    if (!country) {
      throw new Error(
        `Country with iso_code '${methodology.country_iso_code}' not found for dataset ${dataset}`
      );
    }

    const status = statusByCode.get(methodology.status_code);
    if (!status) {
      throw new Error(
        `Status with code '${methodology.status_code}' not found for dataset ${dataset}`
      );
    }

    return {
      country_id: country.id,
      name: methodology.name,
      description: methodology.description || null,
      status_id: status.id,
    };
  });

  // Batch create methodologies (skips duplicates)
  await prisma.methodology_version.createMany({
    data: methodologiesToCreate,
    skipDuplicates: true,
  });

  // Verify all methodologies were created
  const methodologies = await prisma.methodology_version.findMany();

  if (methodologies.length !== methodologiesData.length)
    throw new Error(
      `Expected ${methodologiesData.length} methodologies but found ${methodologies.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${methodologiesData.length} methodologies exist for dataset ${dataset}`
  );
}
