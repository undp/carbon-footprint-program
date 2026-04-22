import { SubcategoryStatus, type PrismaClient } from "@/index.js";
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
        icon: subcategory.icon,
        description: subcategory.description,
        allowedMeasurementUnitsAbbreviations:
          subcategory.allowedMeasurementUnitsAbbreviations ?? [],
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
      icon: subcategory.icon,
      status: SubcategoryStatus.ACTIVE,
      description: subcategory.description,
    };
  });

  // Batch create subcategories (skips duplicates)
  await prisma.subcategory.createMany({
    data: subcategoriesToCreate,
    skipDuplicates: true,
  });

  // Verify all subcategories were created
  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: {
        include: {
          methodologyVersion: {
            include: {
              country: true,
            },
          },
        },
      },
    },
  });

  if (subcategories.length !== subcategoriesData.length)
    throw new Error(
      `Expected ${subcategoriesData.length} subcategories but found ${subcategories.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${subcategoriesData.length} subcategories exist for dataset ${dataset}`
  );

  // Create SubcategoryMeasurementUnit records
  console.log("   Seeding subcategory measurement units...");

  // Fetch all measurement units by abbreviation
  const measurementUnits = await prisma.measurementUnit.findMany();
  const measurementUnitsByAbbreviation = new Map(
    measurementUnits.map((mu) => [mu.abbreviation, mu])
  );

  // Create a map of subcategories by full path for lookup
  const subcategoriesByFullPath = new Map(
    subcategories.map((subcategory) => [
      `${subcategory.category.methodologyVersion.country.isoCode}:${subcategory.category.methodologyVersion.name}:${subcategory.category.name}:${subcategory.name}`,
      subcategory,
    ])
  );

  // Prepare SubcategoryMeasurementUnit records
  const subcategoryMeasurementUnitsToCreate: {
    subcategoryId: bigint;
    measurementUnitId: bigint;
  }[] = [];

  for (const subcategoryData of subcategoriesData) {
    const subcategory = subcategoriesByFullPath.get(
      `${subcategoryData.countryIsoCode}:${subcategoryData.methodologyVersionName}:${subcategoryData.categoryName}:${subcategoryData.name}`
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory '${subcategoryData.name}' not found for category '${subcategoryData.categoryName}' in methodology '${subcategoryData.methodologyVersionName}' for dataset ${dataset}`
      );
    }

    for (const abbreviation of subcategoryData.allowedMeasurementUnitsAbbreviations) {
      const measurementUnit = measurementUnitsByAbbreviation.get(abbreviation);
      if (!measurementUnit) {
        throw new Error(
          `Measurement unit with abbreviation '${abbreviation}' not found for subcategory '${subcategoryData.name}' in dataset ${dataset}`
        );
      }

      subcategoryMeasurementUnitsToCreate.push({
        subcategoryId: subcategory.id,
        measurementUnitId: measurementUnit.id,
      });
    }
  }

  // Batch create SubcategoryMeasurementUnit records (skips duplicates)
  await prisma.subcategoryMeasurementUnit.createMany({
    data: subcategoryMeasurementUnitsToCreate,
    skipDuplicates: true,
  });

  console.log(
    `   ✓ Ensured ${subcategoryMeasurementUnitsToCreate.length} subcategory measurement units exist for dataset ${dataset}`
  );
}
