import { type PrismaClient } from "@/index.js";
import { z } from "zod";
import {
  checkForDuplicates,
  type SeedsDataset,
} from "@/prisma/seeds/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedMethodologies(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding methodologies...");

  // Extract only methodology-level data (without nested categories)
  const methodologiesData = nestedData.map((methodology) => ({
    countryIsoCode: methodology.countryIsoCode,
    name: methodology.name,
    description: methodology.description,
    statusCode: methodology.statusCode,
  }));

  // Check the data has no duplicates based on countryIsoCode and name
  checkForDuplicates(methodologiesData, ["countryIsoCode", "name"]);

  // Fetch countries to map isoCode to id
  const countries = await prisma.country.findMany();
  const countriesByIsoCode = new Map(
    countries.map((country) => [country.isoCode, country])
  );

  // Fetch status catalog entity entries to map code to id
  const statusCatalogEntries = await prisma.statusCatalog.findMany({
    where: {
      scope: "ENTITY",
    },
  });
  const statusByCode = new Map(
    statusCatalogEntries.map((status) => [status.code, status])
  );

  // Prepare methodologies data
  const methodologiesToCreate = methodologiesData.map((methodology) => {
    const country = countriesByIsoCode.get(methodology.countryIsoCode);
    if (!country) {
      throw new Error(
        `Country with isoCode '${methodology.countryIsoCode}' not found for dataset ${dataset}`
      );
    }

    const status = statusByCode.get(methodology.statusCode);
    if (!status) {
      throw new Error(
        `Status with code '${methodology.statusCode}' not found for dataset ${dataset}`
      );
    }

    return {
      countryId: country.id,
      name: methodology.name,
      description: methodology.description || null,
      statusId: status.id,
    };
  });

  // Batch create methodologies (skips duplicates)
  await prisma.methodologyVersion.createMany({
    data: methodologiesToCreate,
    skipDuplicates: true,
  });

  // Verify all methodologies were created
  const methodologies = await prisma.methodologyVersion.findMany();

  if (methodologies.length !== methodologiesData.length)
    throw new Error(
      `Expected ${methodologiesData.length} methodologies but found ${methodologies.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${methodologiesData.length} methodologies exist for dataset ${dataset}`
  );
}
