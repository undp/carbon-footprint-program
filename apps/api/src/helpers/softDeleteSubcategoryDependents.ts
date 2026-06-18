import { type Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  ReductionPlanInitiativeStatus,
  SubcategoryRecommendationStatus,
} from "@repo/types";

/**
 * Soft-deletes every record that hangs off the subcategories matched by
 * `subcategoryWhere`: emission factors, their dimensions and dimension values,
 * reduction-plan initiatives, and subcategory recommendations.
 *
 * Shared by deleteSubcategory (a single subcategory) and deleteCategory (every
 * subcategory under the category) so both paths cascade identically and can't
 * drift apart — otherwise deleting a category would leave initiatives and
 * recommendations ACTIVE under a now-DELETED subcategory.
 *
 * It does not touch the subcategory rows themselves: each caller owns that step
 * (deleteCategory also reorders sibling category positions, deleteSubcategory
 * deletes one row).
 *
 * Must run inside the caller's transaction so the cascade and the subcategory
 * delete commit atomically.
 */
export const softDeleteSubcategoryDependents = async (
  tx: Prisma.TransactionClient,
  subcategoryWhere: Prisma.SubcategoryWhereInput,
  userId: bigint
): Promise<void> => {
  await tx.emissionFactor.updateMany({
    where: {
      subcategory: subcategoryWhere,
      status: EmissionFactorStatus.ACTIVE,
    },
    data: {
      status: EmissionFactorStatus.DELETED,
      updatedById: userId,
    },
  });

  await tx.emissionFactorDimensionValue.updateMany({
    where: {
      dimension: { subcategory: subcategoryWhere },
      status: EmissionFactorDimensionValueStatus.ACTIVE,
    },
    data: {
      status: EmissionFactorDimensionValueStatus.DELETED,
      updatedById: userId,
    },
  });

  await tx.emissionFactorDimension.updateMany({
    where: {
      subcategory: subcategoryWhere,
      status: EmissionFactorDimensionStatus.ACTIVE,
    },
    data: {
      status: EmissionFactorDimensionStatus.DELETED,
      updatedById: userId,
    },
  });

  await tx.reductionPlanInitiative.updateMany({
    where: {
      subcategory: subcategoryWhere,
      status: ReductionPlanInitiativeStatus.ACTIVE,
    },
    data: {
      status: ReductionPlanInitiativeStatus.DELETED,
      updatedById: userId,
    },
  });

  await tx.subcategoryRecommendation.updateMany({
    where: {
      subcategory: subcategoryWhere,
      status: SubcategoryRecommendationStatus.ACTIVE,
    },
    data: {
      status: SubcategoryRecommendationStatus.DELETED,
      updatedById: userId,
    },
  });
};
