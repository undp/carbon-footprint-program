import {
  CategoryStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";
import { z } from "zod";
import { checkForDuplicates, type SeedsDataset } from "@/utils/index.js";
import { FullMethodologyDataSchema } from "../shared.js";

export interface PositionedSubcategory {
  countryIsoCode: string;
  methodologyVersionName: string;
  categoryName: string;
  position: number;
}

/**
 * Authored positions must run 1..N inside each category.
 *
 * This is the only check the authored positions need: 1..N with no gaps also
 * means no duplicates, since [1, 2, 2] does not sort to [1, 2, 3] either. It is
 * stricter than the database's partial unique index, which accepts [1, 2, 4] and
 * [2, 3, 4] — and the authored order is published as a numbered table in the
 * docs and carried into the methodology export, so a subcategory dropped from
 * the JSON without renumbering would leave a permanent hole users can see. Gaps
 * that appear at runtime from soft deletes are expected and fine; this is only
 * about authored seed data.
 */
export function checkPositionsAreContiguous(
  data: PositionedSubcategory[]
): void {
  const positionsByCategory = new Map<string, number[]>();

  for (const row of data) {
    const key = [
      row.countryIsoCode,
      row.methodologyVersionName,
      row.categoryName,
    ].join(" > ");

    const positions = positionsByCategory.get(key);
    if (positions) {
      positions.push(row.position);
    } else {
      positionsByCategory.set(key, [row.position]);
    }
  }

  const offenders = [...positionsByCategory.entries()]
    .map(([key, positions]) => ({
      key,
      sorted: [...positions].sort((a, b) => a - b),
    }))
    .filter(({ sorted }) =>
      sorted.some((position, index) => position !== index + 1)
    )
    .map(({ key, sorted }) => `${key} (${sorted.join(", ")})`);

  if (offenders.length > 0) {
    throw new Error(
      `Subcategory positions must run 1..N with no gaps inside each category. ` +
        `Offending categories: ${offenders.join("; ")}. Please renumber and try again.`
    );
  }
}

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
        position: subcategory.position,
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

  // Positions must also be unique per category (enforced by a partial unique
  // index in the database). No separate duplicate check for them: 1..N with no
  // gaps already implies uniqueness, and the message below names the category
  // and prints its sorted positions, so the duplicate is visible.
  checkPositionsAreContiguous(subcategoriesData);

  // Fetch categories with their methodology versions and countries to map by full path
  const categories = await prisma.category.findMany({
    // Live rows only: the partial unique indexes ignore DELETED ones, so a
    // category a maintainer soft-deleted and this seed re-created has two rows
    // for the same full path, and the map would keep whichever the unordered
    // read returned last — attaching the subcategories below to the dead one.
    where: { status: CategoryStatus.ACTIVE },
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
      position: subcategory.position,
    };
  });

  // Batch create subcategories (skips duplicates)
  await prisma.subcategory.createMany({
    data: subcategoriesToCreate,
    skipDuplicates: true,
  });

  // Verify all subcategories were created
  const subcategories = await prisma.subcategory.findMany({
    // Live rows only, for the same reason as the categories read above: a
    // soft-deleted row would satisfy the existence check below and could shadow
    // the ACTIVE row just created for the same full path, silently leaving the
    // live subcategory with none of the measurement units seeded further down.
    where: { status: SubcategoryStatus.ACTIVE },
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

  // Create a map of subcategories by full path for lookup
  const subcategoriesByFullPath = new Map(
    subcategories.map((subcategory) => [
      `${subcategory.category.methodologyVersion.country.isoCode}:${subcategory.category.methodologyVersion.name}:${subcategory.category.name}:${subcategory.name}`,
      subcategory,
    ])
  );

  // skipDuplicates drops a row that collides with any partial unique index, not
  // only the one on (category, name): since positions became unique per category
  // too, a row whose position is already held by an unrelated subcategory
  // disappears without an error. Name those rows — a bare count says neither
  // which row nor which constraint.
  const missingSubcategories = subcategoriesData.filter(
    (subcategory) =>
      !subcategoriesByFullPath.has(
        `${subcategory.countryIsoCode}:${subcategory.methodologyVersionName}:${subcategory.categoryName}:${subcategory.name}`
      )
  );

  if (missingSubcategories.length > 0) {
    const details = missingSubcategories
      .map(
        (subcategory) =>
          `'${subcategory.name}' (category '${subcategory.categoryName}', position ${subcategory.position})`
      )
      .join(", ");

    throw new Error(
      `${missingSubcategories.length} subcategories were not created for dataset ${dataset}: ${details}. A row is skipped when its (category, name) or (category, position) is already taken by an existing subcategory.`
    );
  }

  // No count check on top of the block above: `subcategories` is every
  // subcategory in the database, so the only way the counts could differ once
  // every authored row was found is that the database holds rows this dataset
  // never authored — a subcategory a maintainer added through the UI, which is
  // legitimate and must not abort a re-seed.

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
