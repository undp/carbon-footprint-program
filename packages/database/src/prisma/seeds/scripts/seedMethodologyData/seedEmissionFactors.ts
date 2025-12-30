import { type PrismaClient } from "@/index.js";
import { z } from "zod";
import { type SeedsDataset } from "@/prisma/seeds/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export async function seedEmissionFactors(
  prisma: PrismaClient,
  nestedData: z.infer<typeof FullMethodologyDataSchema>,
  dataset: SeedsDataset
) {
  console.log("   Seeding emission factors...");

  // Extract and flatten emission factors from all subcategories, tracking all ancestors
  const emissionFactorsData = nestedData.flatMap((methodology) =>
    methodology.categories.flatMap((category) =>
      category.subcategories.flatMap((subcategory) =>
        (subcategory.emission_factors || []).map((ef) => ({
          country_iso_code: methodology.country_iso_code,
          methodology_version_name: methodology.name,
          category_name: category.name,
          subcategory_name: subcategory.name,
          dimension_value_1: ef.dimension_value_1,
          dimension_value_2: ef.dimension_value_2,
          rate_measurement_unit_abbreviation:
            ef.rate_measurement_unit_abbreviation,
          source: ef.source,
          value: ef.value,
        }))
      )
    )
  );

  // Fetch subcategories with their full path (category, methodology_version, country)
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

  // Create a map of subcategories by full path: country_iso_code:methodology_version_name:category_name:subcategory_name
  const subcategoriesByFullPath = new Map(
    subcategories.map((subcategory) => [
      `${subcategory.category.methodology_version.country.iso_code}:${subcategory.category.methodology_version.name}:${subcategory.category.name}:${subcategory.name}`,
      subcategory,
    ])
  );

  // Fetch rate measurement units to map abbreviation to id
  const rateMeasurementUnits = await prisma.rate_measurement_unit.findMany();
  const rateMeasurementUnitsByAbbr = new Map(
    rateMeasurementUnits.map((rmu) => [rmu.abbreviation, rmu])
  );

  // Fetch all dimensions and their values
  const dimensions = await prisma.emission_factor_dimension.findMany({
    include: {
      subcategory: true,
      emission_factor_dimension_values: true,
    },
  });

  // Create a map of dimensions by subcategory_id and code
  const dimensionsBySubcategoryAndCode = new Map(
    dimensions.map((dim) => [`${dim.subcategory_id}:${dim.code}`, dim])
  );

  // Create a map of dimension values by dimension_id and value name
  const valuesByDimensionIdAndName = new Map(
    dimensions.flatMap((dim) =>
      dim.emission_factor_dimension_values.map((val) => [
        `${dim.id}:${val.value}`,
        val,
      ])
    )
  );

  // Fetch status catalog for ACTIVE status
  const activeStatus = await prisma.status_catalog.findFirst({
    where: { code: "ACTIVE" },
  });

  if (!activeStatus) {
    throw new Error(
      `Status with code 'ACTIVE' not found for dataset ${dataset}`
    );
  }

  // Prepare emission factors data
  const emissionFactorsToCreate = emissionFactorsData.map((ef) => {
    const subcategory = subcategoriesByFullPath.get(
      `${ef.country_iso_code}:${ef.methodology_version_name}:${ef.category_name}:${ef.subcategory_name}`
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory '${ef.subcategory_name}' not found for category '${ef.category_name}' in methodology '${ef.methodology_version_name}' for country '${ef.country_iso_code}' in dataset ${dataset}`
      );
    }

    const rateMeasurementUnit = rateMeasurementUnitsByAbbr.get(
      ef.rate_measurement_unit_abbreviation
    );
    if (!rateMeasurementUnit) {
      throw new Error(
        `Rate measurement unit '${ef.rate_measurement_unit_abbreviation}' not found for dataset ${dataset}`
      );
    }

    let dimensionValue1Id: bigint | null = null;
    if (ef.dimension_value_1) {
      const dimension1 = dimensionsBySubcategoryAndCode.get(
        `${subcategory.id}:${ef.dimension_value_1.dimension_code}`
      );
      if (!dimension1) {
        throw new Error(
          `Dimension '${ef.dimension_value_1.dimension_code}' not found for subcategory '${ef.subcategory_name}' (category '${ef.category_name}', methodology '${ef.methodology_version_name}', country '${ef.country_iso_code}') in dataset ${dataset}`
        );
      }

      const value1 = valuesByDimensionIdAndName.get(
        `${dimension1.id}:${ef.dimension_value_1.value_name}`
      );
      if (!value1) {
        throw new Error(
          `Dimension value '${ef.dimension_value_1.value_name}' not found for dimension '${ef.dimension_value_1.dimension_code}' in subcategory '${ef.subcategory_name}' (category '${ef.category_name}', methodology '${ef.methodology_version_name}', country '${ef.country_iso_code}') in dataset ${dataset}`
        );
      }
      dimensionValue1Id = value1.id;
    }

    let dimensionValue2Id: bigint | null = null;
    if (ef.dimension_value_2) {
      const dimension2 = dimensionsBySubcategoryAndCode.get(
        `${subcategory.id}:${ef.dimension_value_2.dimension_code}`
      );
      if (!dimension2) {
        throw new Error(
          `Dimension '${ef.dimension_value_2.dimension_code}' not found for subcategory '${ef.subcategory_name}' (category '${ef.category_name}', methodology '${ef.methodology_version_name}', country '${ef.country_iso_code}') in dataset ${dataset}`
        );
      }

      const value2 = valuesByDimensionIdAndName.get(
        `${dimension2.id}:${ef.dimension_value_2.value_name}`
      );
      if (!value2) {
        throw new Error(
          `Dimension value '${ef.dimension_value_2.value_name}' not found for dimension '${ef.dimension_value_2.dimension_code}' in subcategory '${ef.subcategory_name}' (category '${ef.category_name}', methodology '${ef.methodology_version_name}', country '${ef.country_iso_code}') in dataset ${dataset}`
        );
      }
      dimensionValue2Id = value2.id;
    }

    return {
      subcategory_id: subcategory.id,
      dimension_value_1_id: dimensionValue1Id,
      dimension_value_2_id: dimensionValue2Id,
      rate_measurement_unit_id: rateMeasurementUnit.id,
      source: ef.source,
      gas_details: {},
      value: ef.value,
      status_id: activeStatus.id,
    };
  });

  // Batch create emission factors (skips duplicates)
  await prisma.emission_factor.createMany({
    data: emissionFactorsToCreate,
    skipDuplicates: true,
  });

  // Verify all emission factors were created
  const emissionFactors = await prisma.emission_factor.findMany();

  if (emissionFactors.length !== emissionFactorsData.length)
    throw new Error(
      `Expected ${emissionFactorsData.length} emission factors but found ${emissionFactors.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${emissionFactorsData.length} emission factors exist for dataset ${dataset}`
  );
}
