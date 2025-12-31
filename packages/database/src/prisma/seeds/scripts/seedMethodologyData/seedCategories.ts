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
      country_iso_code: methodology.country_iso_code,
      methodology_version_name: methodology.name,
      name: category.name,
      position: category.position,
      synonyms: category.synonyms,
      description: category.description,
      examples: category.examples,
    }))
  );

  // Check the data has no duplicates based on methodology_version_name and name
  checkForDuplicates(categoriesData, [
    "country_iso_code",
    "methodology_version_name",
    "name",
  ]);

  // Fetch methodology versions with their countries
  const methodologyVersions = await prisma.methodology_version.findMany({
    include: {
      country: true,
    },
  });

  // Create a map of methodology versions by country_iso_code and name
  const methodologyVersionsByCountryAndName = new Map(
    methodologyVersions.map((mv) => [`${mv.country.iso_code}:${mv.name}`, mv])
  );

  // Prepare categories data
  const categoriesToCreate = categoriesData.map((category) => {
    // Find methodology version by country and name
    const methodologyVersion = methodologyVersionsByCountryAndName.get(
      `${category.country_iso_code}:${category.methodology_version_name}`
    );
    if (!methodologyVersion) {
      throw new Error(
        `Methodology version '${category.methodology_version_name}' not found for country '${category.country_iso_code}' in dataset ${dataset}`
      );
    }

    return {
      methodology_version_id: methodologyVersion.id,
      name: category.name,
      position: category.position,
      synonyms: category.synonyms || null,
      description: category.description || null,
      examples: category.examples || null,
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
