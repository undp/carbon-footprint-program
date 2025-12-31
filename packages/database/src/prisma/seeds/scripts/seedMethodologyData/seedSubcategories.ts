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
        countryIsoCode: methodology.countryIsoCode,
        methodologyVersionName: methodology.name,
        categoryName: category.name,
        name: subcategory.name,
        description: subcategory.description,
        examples: subcategory.examples,
      }))
    )
  );

  // Check the data has no duplicates based on methodology and categoryName and name
  checkForDuplicates(subcategoriesData, [
    "countryIsoCode",
    "methodologyVersionName",
    "categoryName",
    "name",
  ]);

  // Fetch categories with their methodology versions and countries to map by full path
  const categories = await prisma.category.findMany({
    include: {
      methodologyVersion: {
        include: {
          country: true,
        },
      },
    },
  });

  // Create a map of categories by countryIsoCode, methodologyVersionName, and category name
  const categoriesByFullPath = new Map(
    categories.map((category) => [
      `${category.methodologyVersion.country.isoCode}:${category.methodologyVersion.name}:${category.name}`,
      category,
    ])
  );

  // Prepare subcategories data
  const subcategoriesToCreate = subcategoriesData.map((subcategory) => {
    const category = categoriesByFullPath.get(
      `${subcategory.countryIsoCode}:${subcategory.methodologyVersionName}:${subcategory.categoryName}`
    );
    if (!category) {
      throw new Error(
        `Category '${subcategory.categoryName}' not found for methodology '${subcategory.methodologyVersionName}' in country '${subcategory.countryIsoCode}' for dataset ${dataset}`
      );
    }

    return {
      categoryId: category.id,
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
