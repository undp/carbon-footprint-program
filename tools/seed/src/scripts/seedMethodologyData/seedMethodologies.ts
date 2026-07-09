import { MethodologyVersionStatus, type PrismaClient } from "@repo/database";
import { z } from "zod";
import { checkForDuplicates, type SeedsDataset } from "@/utils/index.js";
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
    regulation: methodology.regulation,
    version: methodology.version,
  }));

  // Check the data has no duplicates based on countryIsoCode and name
  checkForDuplicates(methodologiesData, ["countryIsoCode", "name"]);

  // Fetch countries to map isoCode to id
  const countries = await prisma.country.findMany();
  const countriesByIsoCode = new Map(
    countries.map((country) => [country.isoCode, country])
  );

  // Prepare methodologies data
  const methodologiesToCreate = methodologiesData.map((methodology, index) => {
    const country = countriesByIsoCode.get(methodology.countryIsoCode);
    if (!country) {
      throw new Error(
        `Country with isoCode '${methodology.countryIsoCode}' not found for dataset ${dataset}`
      );
    }

    return {
      countryId: country.id,
      name: methodology.name,
      description: methodology.description,
      regulation: methodology.regulation,
      version: methodology.version,
      status:
        index === 0
          ? MethodologyVersionStatus.PUBLISHED
          : MethodologyVersionStatus.UNPUBLISHED,
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
