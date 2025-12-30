import { type PrismaClient } from "@/index.js";
import { z } from "zod";
import {
  checkForDuplicates,
  type SeedsDataset,
} from "@/prisma/seeds/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedSubcategories(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding subcategories...");

  // Flatten subcategories from all categories, keeping reference to all ancestor entities
  const subcategoriesData = nestedData.flatMap((methodology) =>
    methodology.categories.flatMap((category) =>
      category.subcategories.map((subcategory) => ({
        country_iso_code: methodology.country_iso_code,
        methodology_version_name: methodology.name,
        category_name: category.name,
        name: subcategory.name,
        description: subcategory.description,
        examples: subcategory.examples,
      }))
    )
  );

  // Check the data has no duplicates based on methodology and category_name and name
  checkForDuplicates(subcategoriesData, [
    "country_iso_code",
    "methodology_version_name",
    "category_name",
    "name",
  ]);

  // Fetch categories with their methodology versions and countries to map by full path
  const categories = await prisma.category.findMany({
    include: {
      methodology_version: {
        include: {
          country: true,
        },
      },
    },
  });

  // Create a map of categories by country_iso_code, methodology_version_name, and category name
  const categoriesByFullPath = new Map(
    categories.map((category) => [
      `${category.methodology_version.country.iso_code}:${category.methodology_version.name}:${category.name}`,
      category,
    ])
  );

  // Prepare subcategories data
  const subcategoriesToCreate = subcategoriesData.map((subcategory) => {
    const category = categoriesByFullPath.get(
      `${subcategory.country_iso_code}:${subcategory.methodology_version_name}:${subcategory.category_name}`
    );
    if (!category) {
      throw new Error(
        `Category '${subcategory.category_name}' not found for methodology '${subcategory.methodology_version_name}' in country '${subcategory.country_iso_code}' for dataset ${dataset}`
      );
    }

    return {
      category_id: category.id,
      name: subcategory.name,
      description: subcategory.description || null,
      examples: subcategory.examples || null,
    };
  });

  // Batch create subcategories (skips duplicates)
  await prisma.subcategory.createMany({
    data: subcategoriesToCreate,
    skipDuplicates: true,
  });

  // Verify all subcategories were created
  const subcategories = await prisma.subcategory.findMany();

  if (subcategories.length !== subcategoriesData.length)
    throw new Error(
      `Expected ${subcategoriesData.length} subcategories but found ${subcategories.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${subcategoriesData.length} subcategories exist for dataset ${dataset}`
  );
}
