import { type PrismaClient } from "@/index.js";
import { z } from "zod";
import {
  checkForDuplicates,
  type SeedsDataset,
} from "@/prisma/seeds/utils/index.js";
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
        (subcategory.emission_factor_dimensions || []).map((dimension) => ({
          country_iso_code: methodology.country_iso_code,
          methodology_version_name: methodology.name,
          category_name: category.name,
          subcategory_name: subcategory.name,
          code: dimension.code,
          name: dimension.name,
          position: dimension.position,
          is_required: dimension.is_required,
          values: dimension.values,
        }))
      )
    )
  );

  // Check the data has no duplicates based on full path and code
  checkForDuplicates(dimensionsData, [
    "country_iso_code",
    "methodology_version_name",
    "category_name",
    "subcategory_name",
    "code",
  ]);

  // Fetch subcategories with their full path to map by full path
  const subcategories = await prisma.subcategory.findMany({
    include: {
      category: {
        include: {
          methodology_version: {
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
      `${subcategory.category.methodology_version.country.iso_code}:${subcategory.category.methodology_version.name}:${subcategory.category.name}:${subcategory.name}`,
      subcategory,
    ])
  );

  // Prepare dimensions data
  const dimensionsToCreate = dimensionsData.map((dimension) => {
    const subcategory = subcategoriesByFullPath.get(
      `${dimension.country_iso_code}:${dimension.methodology_version_name}:${dimension.category_name}:${dimension.subcategory_name}`
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory '${dimension.subcategory_name}' not found for category '${dimension.category_name}' in methodology '${dimension.methodology_version_name}' in country '${dimension.country_iso_code}' for dataset ${dataset}`
      );
    }

    return {
      subcategory_id: subcategory.id,
      code: dimension.code,
      name: dimension.name,
      position: dimension.position,
      is_required: dimension.is_required,
    };
  });

  // Batch create dimensions (skips duplicates)
  await prisma.emission_factor_dimension.createMany({
    data: dimensionsToCreate,
    skipDuplicates: true,
  });

  // Verify all dimensions were created
  const dimensions = await prisma.emission_factor_dimension.findMany({
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

  // Create a map of dimensions by subcategory_id and code
  const dimensionsBySubcategoryAndCode = new Map(
    dimensions.map((dim) => [`${dim.subcategory_id}:${dim.code}`, dim])
  );

  // First pass: create all values without parent relationships
  const allValuesToCreate: {
    dimension_id: bigint;
    value: string;
    parent_value_info?: {
      dimension_code: string;
      value_name: string;
    };
    subcategory_full_path: string;
  }[] = [];

  for (const dimensionData of dimensionsData) {
    const subcategory = subcategoriesByFullPath.get(
      `${dimensionData.country_iso_code}:${dimensionData.methodology_version_name}:${dimensionData.category_name}:${dimensionData.subcategory_name}`
    );
    if (!subcategory) {
      throw new Error(
        `[seedEmissionFactorDimensions] Subcategory lookup failed. ` +
          `Lookup key: "${dimensionData.country_iso_code}:${dimensionData.methodology_version_name}:${dimensionData.category_name}:${dimensionData.subcategory_name}". ` +
          `Identifying fields: country_iso_code="${dimensionData.country_iso_code}", ` +
          `methodology_version_name="${dimensionData.methodology_version_name}", ` +
          `category_name="${dimensionData.category_name}", ` +
          `subcategory_name="${dimensionData.subcategory_name}", ` +
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
          `Identifying fields: country_iso_code="${dimensionData.country_iso_code}", ` +
          `methodology_version_name="${dimensionData.methodology_version_name}", ` +
          `category_name="${dimensionData.category_name}", ` +
          `subcategory_name="${dimensionData.subcategory_name}", ` +
          `code="${dimensionData.code}", ` +
          `subcategory_id="${subcategory.id}". ` +
          `Dataset: ${dataset}`
      );
    }

    for (const valueData of dimensionData.values) {
      const valueEntry: {
        dimension_id: bigint;
        value: string;
        parent_value_info?: {
          dimension_code: string;
          value_name: string;
        };
        subcategory_full_path: string;
      } = {
        dimension_id: dimension.id,
        value: valueData.name,
        subcategory_full_path: `${dimensionData.country_iso_code}:${dimensionData.methodology_version_name}:${dimensionData.category_name}:${dimensionData.subcategory_name}`,
      };
      if (valueData.parent_value) {
        valueEntry.parent_value_info = valueData.parent_value;
      }
      allValuesToCreate.push(valueEntry);
    }
  }

  // Create values without parent relationships first
  await prisma.emission_factor_dimension_value.createMany({
    data: allValuesToCreate.map((v) => ({
      dimension_id: v.dimension_id,
      value: v.value,
      parent_value_id: null,
    })),
    skipDuplicates: true,
  });

  // Fetch all created dimension values
  const dimensionValues = await prisma.emission_factor_dimension_value.findMany(
    {
      include: {
        dimension: {
          include: {
            subcategory: true,
          },
        },
      },
    }
  );

  // Create a map of dimension values by dimension_id and value name
  const valuesByDimensionAndName = new Map(
    dimensionValues.map((val) => [`${val.dimension_id}:${val.value}`, val])
  );

  // Second pass: update parent relationships
  // Parent values must be in the same subcategory, so we use the subcategory_full_path
  let updatedCount = 0;
  for (const valueToUpdate of allValuesToCreate) {
    if (!valueToUpdate.parent_value_info) continue;

    // Find the subcategory for this value
    const subcategory = subcategoriesByFullPath.get(
      valueToUpdate.subcategory_full_path
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory not found for value '${valueToUpdate.value}' with path '${valueToUpdate.subcategory_full_path}'`
      );
    }

    // Find the parent dimension within the same subcategory
    const parentDimension = dimensionsBySubcategoryAndCode.get(
      `${subcategory.id}:${valueToUpdate.parent_value_info.dimension_code}`
    );

    if (!parentDimension) {
      throw new Error(
        `Parent dimension '${valueToUpdate.parent_value_info.dimension_code}' not found in subcategory '${valueToUpdate.subcategory_full_path}' for value '${valueToUpdate.value}'`
      );
    }

    // Find the parent value within the parent dimension
    const parentValue = valuesByDimensionAndName.get(
      `${parentDimension.id}:${valueToUpdate.parent_value_info.value_name}`
    );

    if (!parentValue) {
      throw new Error(
        `Parent value '${valueToUpdate.parent_value_info.value_name}' not found in dimension '${valueToUpdate.parent_value_info.dimension_code}' in subcategory '${valueToUpdate.subcategory_full_path}'`
      );
    }

    // Find the current value to update
    const currentValue = valuesByDimensionAndName.get(
      `${valueToUpdate.dimension_id}:${valueToUpdate.value}`
    );

    if (currentValue) {
      await prisma.emission_factor_dimension_value.update({
        where: { id: currentValue.id },
        data: { parent_value_id: parentValue.id },
      });
      updatedCount++;
    }
  }

  console.log(
    `   ✓ Ensured ${dimensionValues.length} emission factor dimension values exist (${updatedCount} with parent relationships) for dataset ${dataset}`
  );
}
