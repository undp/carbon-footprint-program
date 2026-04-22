import { type PrismaClient } from "@/index.js";
import { z } from "zod";
import {
  checkForDuplicates,
  type SeedsDataset,
} from "@/prisma/seeds/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedCategories(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding categories...");

  // Flatten categories from all methodologies, keeping reference to methodology
  const categoriesData = nestedData.flatMap((methodology) =>
    methodology.categories.map((category) => ({
      countryIsoCode: methodology.countryIsoCode,
      methodologyVersionName: methodology.name,
      name: category.name,
      synonyms: category.synonyms,
      icon: category.icon,
      color: category.color,
      description: category.description,
      position: category.position,
    }))
  );
  // Check the data has no duplicates based on methodologyVersionName and name
  checkForDuplicates(categoriesData, [
    "countryIsoCode",
    "methodologyVersionName",
    "name",
  ]);

  // Fetch methodology versions with their countries
  const methodologyVersions = await prisma.methodologyVersion.findMany({
    include: {
      country: true,
    },
  });

  // Create a map of methodology versions by countryIsoCode and name
  const methodologyVersionsByCountryAndName = new Map(
    methodologyVersions.map((mv) => [`${mv.country.isoCode}:${mv.name}`, mv])
  );

  // Prepare categories data
  const categoriesToCreate = categoriesData.map((category) => {
    // Find methodology version by country and name
    const methodologyVersion = methodologyVersionsByCountryAndName.get(
      `${category.countryIsoCode}:${category.methodologyVersionName}`
    );
    if (!methodologyVersion) {
      throw new Error(
        `Methodology version '${category.methodologyVersionName}' not found for country '${category.countryIsoCode}' in dataset ${dataset}`
      );
    }

    return {
      methodologyVersionId: methodologyVersion.id,
      name: category.name,
      synonyms: category.synonyms,
      description: category.description,
      icon: category.icon,
      color: category.color,
      position: category.position,
    };
  });

  // Batch create categories (skips duplicates)
  await prisma.category.createMany({
    data: categoriesToCreate,
    skipDuplicates: true,
  });

  // Verify all categories were created
  const categories = await prisma.category.findMany();

  if (categories.length !== categoriesData.length)
    throw new Error(
      `Expected ${categoriesData.length} categories but found ${categories.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${categoriesData.length} categories exist for dataset ${dataset}`
  );
}
