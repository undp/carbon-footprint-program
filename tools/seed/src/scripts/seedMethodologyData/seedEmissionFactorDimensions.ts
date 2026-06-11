import { type PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
} from "@repo/database/enums";
import { z } from "zod";
import { checkForDuplicates, type SeedsDataset } from "@/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedEmissionFactorDimensions(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding emission factor dimensions...");

  // Flatten dimensions from all subcategories, keeping reference to all ancestor entities
  const dimensionsData = nestedData.flatMap((methodology) =>
    methodology.categories.flatMap((category) =>
      category.subcategories.flatMap((subcategory) =>
        (subcategory.emissionFactorDimensions || []).map((dimension) => ({
          countryIsoCode: methodology.countryIsoCode,
          methodologyVersionName: methodology.name,
          categoryName: category.name,
          subcategoryName: subcategory.name,
          code: dimension.code,
          name: dimension.name,
          position: dimension.position,
          isRequired: dimension.isRequired,
          values: dimension.values,
        }))
      )
    )
  );

  // Check the data has no duplicates based on full path and code
  checkForDuplicates(dimensionsData, [
    "countryIsoCode",
    "methodologyVersionName",
    "categoryName",
    "subcategoryName",
    "code",
  ]);

  // Fetch subcategories with their full path to map by full path
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

  // Create a map of subcategories by full path (country:methodology:category:subcategory)
  const subcategoriesByFullPath = new Map(
    subcategories.map((subcategory) => [
      `${subcategory.category.methodologyVersion.country.isoCode}:${subcategory.category.methodologyVersion.name}:${subcategory.category.name}:${subcategory.name}`,
      subcategory,
    ])
  );

  // Prepare dimensions data
  const dimensionsToCreate = dimensionsData.map((dimension) => {
    const subcategory = subcategoriesByFullPath.get(
      `${dimension.countryIsoCode}:${dimension.methodologyVersionName}:${dimension.categoryName}:${dimension.subcategoryName}`
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory '${dimension.subcategoryName}' not found for category '${dimension.categoryName}' in methodology '${dimension.methodologyVersionName}' in country '${dimension.countryIsoCode}' for dataset ${dataset}`
      );
    }

    return {
      subcategoryId: subcategory.id,
      code: dimension.code,
      name: dimension.name,
      position: dimension.position,
      isRequired: dimension.isRequired,
      status: EmissionFactorDimensionStatus.ACTIVE,
    };
  });

  // Batch create dimensions (skips duplicates)
  await prisma.emissionFactorDimension.createMany({
    data: dimensionsToCreate,
    skipDuplicates: true,
  });

  // Verify all dimensions were created
  const dimensions = await prisma.emissionFactorDimension.findMany({
    where: {
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    include: {
      subcategory: true,
    },
  });

  if (dimensions.length !== dimensionsData.length)
    throw new Error(
      `Expected ${dimensionsData.length} emission factor dimensions but found ${dimensions.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${dimensionsData.length} emission factor dimensions exist for dataset ${dataset}`
  );

  // Now seed dimension values
  console.log("   Seeding emission factor dimension values...");

  // Create a map of dimensions by subcategoryId and code
  const dimensionsBySubcategoryAndCode = new Map(
    dimensions.map((dim) => [`${dim.subcategoryId}:${dim.code}`, dim])
  );

  // First pass: create all values without parent relationships
  const allValuesToCreate: {
    dimensionId: bigint;
    value: string;
    parentValueInfo?: {
      dimensionCode: string;
      valueName: string;
    };
    subcategoryFullPath: string;
  }[] = [];

  for (const dimensionData of dimensionsData) {
    const subcategory = subcategoriesByFullPath.get(
      `${dimensionData.countryIsoCode}:${dimensionData.methodologyVersionName}:${dimensionData.categoryName}:${dimensionData.subcategoryName}`
    );
    if (!subcategory) {
      throw new Error(
        `[seedEmissionFactorDimensions] Subcategory lookup failed. ` +
          `Lookup key: "${dimensionData.countryIsoCode}:${dimensionData.methodologyVersionName}:${dimensionData.categoryName}:${dimensionData.subcategoryName}". ` +
          `Identifying fields: countryIsoCode="${dimensionData.countryIsoCode}", ` +
          `methodologyVersionName="${dimensionData.methodologyVersionName}", ` +
          `categoryName="${dimensionData.categoryName}", ` +
          `subcategoryName="${dimensionData.subcategoryName}", ` +
          `code="${dimensionData.code}". ` +
          `Dataset: ${dataset}`
      );
    }

    const dimension = dimensionsBySubcategoryAndCode.get(
      `${subcategory.id}:${dimensionData.code}`
    );
    if (!dimension) {
      throw new Error(
        `[seedEmissionFactorDimensions] Dimension lookup failed. ` +
          `Lookup key: "${subcategory.id}:${dimensionData.code}". ` +
          `Identifying fields: countryIsoCode="${dimensionData.countryIsoCode}", ` +
          `methodologyVersionName="${dimensionData.methodologyVersionName}", ` +
          `categoryName="${dimensionData.categoryName}", ` +
          `subcategoryName="${dimensionData.subcategoryName}", ` +
          `code="${dimensionData.code}", ` +
          `subcategoryId="${subcategory.id}". ` +
          `Dataset: ${dataset}`
      );
    }

    for (const valueData of dimensionData.values) {
      const valueEntry: {
        dimensionId: bigint;
        value: string;
        parentValueInfo?: {
          dimensionCode: string;
          valueName: string;
        };
        subcategoryFullPath: string;
      } = {
        dimensionId: dimension.id,
        value: valueData.name,
        subcategoryFullPath: `${dimensionData.countryIsoCode}:${dimensionData.methodologyVersionName}:${dimensionData.categoryName}:${dimensionData.subcategoryName}`,
      };
      if (valueData.parentValue) {
        valueEntry.parentValueInfo = valueData.parentValue;
      }
      allValuesToCreate.push(valueEntry);
    }
  }

  // Create values without parent relationships first
  await prisma.emissionFactorDimensionValue.createMany({
    data: allValuesToCreate.map((v) => ({
      dimensionId: v.dimensionId,
      value: v.value,
      parentValueId: null,
      status: EmissionFactorDimensionValueStatus.ACTIVE,
    })),
    skipDuplicates: true,
  });

  // Fetch all created dimension values
  const dimensionValues = await prisma.emissionFactorDimensionValue.findMany({
    where: {
      status: EmissionFactorDimensionValueStatus.ACTIVE,
    },
    include: {
      dimension: {
        include: {
          subcategory: true,
        },
      },
    },
  });

  // Create a map of dimension values by dimensionId and value name
  const valuesByDimensionAndName = new Map(
    dimensionValues.map((val) => [`${val.dimensionId}:${val.value}`, val])
  );

  // Second pass: update parent relationships
  // Parent values must be in the same subcategory, so we use the subcategoryFullPath
  let updatedCount = 0;
  for (const valueToUpdate of allValuesToCreate) {
    if (!valueToUpdate.parentValueInfo) continue;

    // Find the subcategory for this value
    const subcategory = subcategoriesByFullPath.get(
      valueToUpdate.subcategoryFullPath
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory not found for value '${valueToUpdate.value}' with path '${valueToUpdate.subcategoryFullPath}'`
      );
    }

    // Find the parent dimension within the same subcategory
    const parentDimension = dimensionsBySubcategoryAndCode.get(
      `${subcategory.id}:${valueToUpdate.parentValueInfo.dimensionCode}`
    );

    if (!parentDimension) {
      throw new Error(
        `Parent dimension '${valueToUpdate.parentValueInfo.dimensionCode}' not found in subcategory '${valueToUpdate.subcategoryFullPath}' for value '${valueToUpdate.value}'`
      );
    }

    // Find the parent value within the parent dimension
    const parentValue = valuesByDimensionAndName.get(
      `${parentDimension.id}:${valueToUpdate.parentValueInfo.valueName}`
    );

    if (!parentValue) {
      throw new Error(
        `Parent value '${valueToUpdate.parentValueInfo.valueName}' not found in dimension '${valueToUpdate.parentValueInfo.dimensionCode}' in subcategory '${valueToUpdate.subcategoryFullPath}'`
      );
    }

    // Find the current value to update
    const currentValue = valuesByDimensionAndName.get(
      `${valueToUpdate.dimensionId}:${valueToUpdate.value}`
    );

    if (currentValue) {
      await prisma.emissionFactorDimensionValue.update({
        where: { id: currentValue.id },
        data: { parentValueId: parentValue.id },
      });
      updatedCount++;
    }
  }

  console.log(
    `   ✓ Ensured ${dimensionValues.length} emission factor dimension values exist (${updatedCount} with parent relationships) for dataset ${dataset}`
  );
}
