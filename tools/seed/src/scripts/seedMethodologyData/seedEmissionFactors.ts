import { type PrismaClient } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
} from "@repo/database/enums";
import { z } from "zod";
import { type SeedsDataset } from "@/utils/index.js";
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
        (subcategory.emissionFactors || []).map((ef) => ({
          countryIsoCode: methodology.countryIsoCode,
          methodologyVersionName: methodology.name,
          categoryName: category.name,
          subcategoryName: subcategory.name,
          dimensionValue1: ef.dimensionValue1,
          dimensionValue2: ef.dimensionValue2,
          rateMeasurementUnitAbbreviation: ef.rateMeasurementUnitAbbreviation,
          source: ef.source,
          value: ef.value,
        }))
      )
    )
  );

  // Fetch subcategories with their full path (category, methodologyVersion, country)
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

  // Create a map of subcategories by full path: countryIsoCode:methodologyVersionName:categoryName:subcategoryName
  const subcategoriesByFullPath = new Map(
    subcategories.map((subcategory) => [
      `${subcategory.category.methodologyVersion.country.isoCode}:${subcategory.category.methodologyVersion.name}:${subcategory.category.name}:${subcategory.name}`,
      subcategory,
    ])
  );

  // Fetch rate measurement units to map abbreviation to id
  const rateMeasurementUnits = await prisma.rateMeasurementUnit.findMany();
  const rateMeasurementUnitsByAbbr = new Map(
    rateMeasurementUnits.map((rmu) => [rmu.abbreviation, rmu])
  );

  // Fetch all dimensions and their values
  const dimensions = await prisma.emissionFactorDimension.findMany({
    where: {
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    include: {
      subcategory: true,
      values: {
        where: {
          status: EmissionFactorDimensionValueStatus.ACTIVE,
        },
      },
    },
  });

  // Create a map of dimensions by subcategoryId and code
  const dimensionsBySubcategoryAndCode = new Map(
    dimensions.map((dim) => [`${dim.subcategoryId}:${dim.code}`, dim])
  );

  // Create a map of dimension values by dimensionId and value name
  const valuesByDimensionIdAndName = new Map(
    dimensions.flatMap((dim) =>
      dim.values.map((val) => [`${dim.id}:${val.value}`, val])
    )
  );

  // Prepare emission factors data
  const emissionFactorsToCreate = emissionFactorsData.map((ef) => {
    const subcategory = subcategoriesByFullPath.get(
      `${ef.countryIsoCode}:${ef.methodologyVersionName}:${ef.categoryName}:${ef.subcategoryName}`
    );
    if (!subcategory) {
      throw new Error(
        `Subcategory '${ef.subcategoryName}' not found for category '${ef.categoryName}' in methodology '${ef.methodologyVersionName}' for country '${ef.countryIsoCode}' in dataset ${dataset}`
      );
    }

    const rateMeasurementUnit = rateMeasurementUnitsByAbbr.get(
      ef.rateMeasurementUnitAbbreviation
    );
    if (!rateMeasurementUnit) {
      throw new Error(
        `Rate measurement unit '${ef.rateMeasurementUnitAbbreviation}' not found for dataset ${dataset}`
      );
    }

    let dimensionValue1Id: bigint | null = null;
    if (ef.dimensionValue1) {
      const dimension1 = dimensionsBySubcategoryAndCode.get(
        `${subcategory.id}:${ef.dimensionValue1.dimensionCode}`
      );
      if (!dimension1) {
        throw new Error(
          `Dimension '${ef.dimensionValue1.dimensionCode}' not found for subcategory '${ef.subcategoryName}' (category '${ef.categoryName}', methodology '${ef.methodologyVersionName}', country '${ef.countryIsoCode}') in dataset ${dataset}`
        );
      }

      const value1 = valuesByDimensionIdAndName.get(
        `${dimension1.id}:${ef.dimensionValue1.valueName}`
      );
      if (!value1) {
        throw new Error(
          `Dimension value '${ef.dimensionValue1.valueName}' not found for dimension '${ef.dimensionValue1.dimensionCode}' in subcategory '${ef.subcategoryName}' (category '${ef.categoryName}', methodology '${ef.methodologyVersionName}', country '${ef.countryIsoCode}') in dataset ${dataset}`
        );
      }
      dimensionValue1Id = value1.id;
    }

    let dimensionValue2Id: bigint | null = null;
    if (ef.dimensionValue2) {
      const dimension2 = dimensionsBySubcategoryAndCode.get(
        `${subcategory.id}:${ef.dimensionValue2.dimensionCode}`
      );
      if (!dimension2) {
        throw new Error(
          `Dimension '${ef.dimensionValue2.dimensionCode}' not found for subcategory '${ef.subcategoryName}' (category '${ef.categoryName}', methodology '${ef.methodologyVersionName}', country '${ef.countryIsoCode}') in dataset ${dataset}`
        );
      }

      const value2 = valuesByDimensionIdAndName.get(
        `${dimension2.id}:${ef.dimensionValue2.valueName}`
      );
      if (!value2) {
        throw new Error(
          `Dimension value '${ef.dimensionValue2.valueName}' not found for dimension '${ef.dimensionValue2.dimensionCode}' in subcategory '${ef.subcategoryName}' (category '${ef.categoryName}', methodology '${ef.methodologyVersionName}', country '${ef.countryIsoCode}') in dataset ${dataset}`
        );
      }
      dimensionValue2Id = value2.id;
    }

    return {
      subcategoryId: subcategory.id,
      dimensionValue1Id: dimensionValue1Id,
      dimensionValue2Id: dimensionValue2Id,
      rateMeasurementUnitId: rateMeasurementUnit.id,
      source: ef.source,
      gasDetails: {},
      value: ef.value,
    };
  });

  // Batch create emission factors (skips duplicates)
  await prisma.emissionFactor.createMany({
    data: emissionFactorsToCreate,
    skipDuplicates: true,
  });

  // Verify all emission factors were created
  const emissionFactors = await prisma.emissionFactor.findMany();

  if (emissionFactors.length !== emissionFactorsData.length)
    throw new Error(
      `Expected ${emissionFactorsData.length} emission factors but found ${emissionFactors.length} for dataset ${dataset}`
    );

  console.log(
    `   ✓ Ensured ${emissionFactorsData.length} emission factors exist for dataset ${dataset}`
  );
}
