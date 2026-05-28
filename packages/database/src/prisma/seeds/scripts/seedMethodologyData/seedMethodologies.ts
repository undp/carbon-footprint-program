import { MethodologyVersionStatus, type PrismaClient } from "@/index.js";
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

  // Upsert by (countryId, name, version) against the partial unique index
  // scoped to non-DELETED rows. On update we propagate description/regulation
  // but leave `status` alone: publishing state is managed via the admin UI
  // after the initial seed.
  for (const [index, methodology] of methodologiesData.entries()) {
    const country = countriesByIsoCode.get(methodology.countryIsoCode);
    if (!country) {
      throw new Error(
        `Country with isoCode '${methodology.countryIsoCode}' not found for dataset ${dataset}`
      );
    }

    const { count } = await prisma.methodologyVersion.updateMany({
      where: {
        countryId: country.id,
        name: methodology.name,
        version: methodology.version,
        status: { not: MethodologyVersionStatus.DELETED },
      },
      data: {
        description: methodology.description,
        regulation: methodology.regulation,
      },
    });

    if (count === 0) {
      await prisma.methodologyVersion.create({
        data: {
          countryId: country.id,
          name: methodology.name,
          description: methodology.description,
          regulation: methodology.regulation,
          version: methodology.version,
          status:
            index === 0
              ? MethodologyVersionStatus.PUBLISHED
              : MethodologyVersionStatus.UNPUBLISHED,
        },
      });
    }
  }

  console.log(
    `   ✓ Ensured ${methodologiesData.length} methodologies exist for dataset ${dataset}`
  );
}
