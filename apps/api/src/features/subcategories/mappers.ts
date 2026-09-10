import type {
  Category as PrismaCategory,
  MeasurementUnit as PrismaMeasurementUnit,
  Subcategory as PrismaSubcategory,
} from "@repo/database";
import {
  type CreateSubcategoryResponse,
  type SubcategoryBase,
  type UpdateSubcategoryResponse,
  IconNameSchema,
} from "@repo/types";

/**
 * Maps a Prisma Subcategory to the shared base shape.
 * Converts BigInt IDs to strings and dates to ISO strings.
 */
export function mapSubcategoryToBase(
  subcategory: PrismaSubcategory
): SubcategoryBase {
  return {
    id: subcategory.id.toString(),
    categoryId: subcategory.categoryId.toString(),
    name: subcategory.name,
    icon: IconNameSchema.parse(subcategory.icon),
    description: subcategory.description,
    explanation: subcategory.explanation,
    position: subcategory.position,
    status: subcategory.status,
    createdAt: subcategory.createdAt.toISOString(),
    updatedAt: subcategory.updatedAt?.toISOString() ?? null,
    createdById: subcategory.createdById?.toString() ?? null,
    updatedById: subcategory.updatedById?.toString() ?? null,
  };
}

/** What both services `select`: the row plus its category. */
type SubcategoryWithCategoryRow = Pick<
  PrismaSubcategory,
  "id" | "name" | "icon" | "description" | "explanation" | "position"
> & {
  category: Pick<PrismaCategory, "id" | "name" | "color">;
};

/**
 * The create and update responses are the same pick of SubcategoryBase plus
 * the category and the units. Intersecting them keeps that a compile-time
 * claim: the mapper below stops type-checking if the two schemas diverge.
 */
type SubcategoryWithCategoryResponse = CreateSubcategoryResponse &
  UpdateSubcategoryResponse;

/**
 * Maps a subcategory and its measurement units to the create/update response.
 *
 * Shared by both services so a field added to that contract is one edit rather
 * than two hand-built objects kept in sync.
 */
export function mapSubcategoryWithCategoryToResponse(
  subcategory: SubcategoryWithCategoryRow,
  measurementUnits: Pick<PrismaMeasurementUnit, "id" | "name">[]
): SubcategoryWithCategoryResponse {
  return {
    id: subcategory.id.toString(),
    name: subcategory.name,
    icon: IconNameSchema.parse(subcategory.icon),
    description: subcategory.description,
    explanation: subcategory.explanation,
    position: subcategory.position,
    category: {
      id: subcategory.category.id.toString(),
      name: subcategory.category.name,
      color: subcategory.category.color,
    },
    measurementUnits: measurementUnits.map((unit) => ({
      id: unit.id.toString(),
      name: unit.name,
    })),
  };
}
