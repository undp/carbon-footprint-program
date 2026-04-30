import {
  type PrismaClient,
  MethodologyVersionStatus,
  Prisma,
} from "@repo/database";
import { type DuplicateMethodologyResponse, type User } from "@repo/types";
import { mapMethodologyToResponse } from "../mappers.js";
import {
  MethodologyNotFoundError,
  MethodologyNameVersionAlreadyExistsError,
} from "../errors.js";
import { generateUniqueCopyName } from "@/helpers/generateUniqueCopyName.js";
import map from "lodash-es/map.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";
import {
  cloneCategories,
  cloneEmissionFactorDimensions,
  cloneEmissionFactorDimensionValues,
  cloneEmissionFactors,
  cloneReductionPlanInitiatives,
  cloneSubcategories,
  cloneSubcategoryRecommendations,
} from "./helpers.js";

export const duplicateMethodologyService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DuplicateMethodologyResponse> => {
  try {
    const userId = user ? BigInt(user.id) : null;

    const duplicated = await prismaClient.$transaction(async (tx) => {
      // 1. Methodology version — clone the parent record under a unique name.
      const original = await tx.methodologyVersion.findUnique({
        where: { id: BigInt(id) },
      });

      if (!original) {
        throw new MethodologyNotFoundError();
      }

      // Generate the copy name inside the transaction to minimize the race window.
      const existingNames = await tx.methodologyVersion.findMany({
        where: {
          countryId: original.countryId,
          status: { not: MethodologyVersionStatus.DELETED },
        },
        select: { name: true },
      });

      const duplicatedName = generateUniqueCopyName(
        original.name,
        map(existingNames, "name")
      );

      const newMethodology = await tx.methodologyVersion.create({
        data: {
          countryId: original.countryId,
          name: duplicatedName,
          description: original.description,
          regulation: original.regulation,
          version: original.version,
          status: MethodologyVersionStatus.UNPUBLISHED,
          createdById: userId,
          updatedAt: null,
        },
      });

      // 2. Categories
      const categoryIdMap = await cloneCategories(
        tx,
        original.id,
        newMethodology.id,
        userId
      );

      // 3. Subcategories (+ measurement unit links)
      const subcategoryIdMap = await cloneSubcategories(
        tx,
        categoryIdMap,
        userId
      );

      // Nothing below depends on data outside the subcategory subtree.
      if (subcategoryIdMap.size === 0) {
        return newMethodology;
      }

      // 4. Emission factor dimensions
      const dimensionIdMap = await cloneEmissionFactorDimensions(
        tx,
        subcategoryIdMap,
        userId
      );

      // 5. Emission factor dimension values (two-pass for self-referential parentValueId)
      const dimensionValueIdMap = await cloneEmissionFactorDimensionValues(
        tx,
        dimensionIdMap,
        userId
      );

      // 6. Emission factors
      await cloneEmissionFactors(
        tx,
        subcategoryIdMap,
        dimensionValueIdMap,
        userId
      );

      // 7. Reduction plan initiatives
      await cloneReductionPlanInitiatives(
        tx,
        subcategoryIdMap,
        dimensionValueIdMap,
        userId
      );

      // 8. Subcategory recommendations
      await cloneSubcategoryRecommendations(tx, subcategoryIdMap, userId);

      return newMethodology;
    });

    return mapMethodologyToResponse(duplicated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (
          duplicatedFields.includes("name") ||
          duplicatedFields.includes("country_id") ||
          duplicatedFields.includes("version")
        ) {
          throw new MethodologyNameVersionAlreadyExistsError();
        }
      }
    }
    throw error;
  }
};
