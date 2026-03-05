import {
  type PrismaClient,
  MethodologyVersionStatus,
  Prisma,
} from "@repo/database";
import {
  type DuplicateMethodologyResponse,
  type User,
  CategoryStatus,
  SubCategoryStatus,
} from "@repo/types";
import { mapMethodologyToResponse } from "../mappers.js";
import {
  MethodologyNotFoundError,
  MethodologyNameVersionAlreadyExistsError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";
import { generateUniqueCopyName } from "@/helpers/generateUniqueCopyName.js";
import map from "lodash-es/map.js";

export const duplicateMethodologyService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DuplicateMethodologyResponse> => {
  // Find the original methodology
  const original = await prismaClient.methodologyVersion.findUnique({
    where: { id: BigInt(id) },
  });

  if (!original) {
    throw new MethodologyNotFoundError();
  }

  try {
    const userId = user ? BigInt(user.id) : null;

    // Use transaction to duplicate methodology AND its active categories
    const duplicated = await prismaClient.$transaction(async (tx) => {
      // Generate unique copy name inside the transaction to minimize race window
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

      // Create a new methodology based on the original
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

      // Duplicate all active categories from the original methodology
      const activeCategories = await tx.category.findMany({
        where: {
          methodologyVersionId: original.id,
          status: CategoryStatus.ACTIVE,
        },
      });

      // Create categories individually to capture old → new ID mapping
      const categoryIdMap = new Map<bigint, bigint>();
      for (const cat of activeCategories) {
        const newCat = await tx.category.create({
          data: {
            methodologyVersionId: newMethodology.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            synonyms: cat.synonyms,
            description: cat.description,
            examples: cat.examples,
            position: cat.position,
            status: cat.status,
            createdById: userId,
            updatedAt: null,
          },
        });
        categoryIdMap.set(cat.id, newCat.id);
      }

      // Duplicate all active subcategories from the original categories
      if (activeCategories.length > 0) {
        const activeSubcategories = await tx.subcategory.findMany({
          where: {
            categoryId: { in: activeCategories.map((cat) => cat.id) },
            status: SubCategoryStatus.ACTIVE,
          },
          include: {
            subcategoryMeasurementUnits: {
              select: { measurementUnitId: true },
            },
          },
        });

        // Create subcategories individually to capture old → new ID mapping
        const measurementUnitLinks: {
          subcategoryId: bigint;
          measurementUnitId: bigint;
        }[] = [];

        for (const sub of activeSubcategories) {
          const newSub = await tx.subcategory.create({
            data: {
              categoryId: categoryIdMap.get(sub.categoryId)!,
              name: sub.name,
              icon: sub.icon,
              description: sub.description,
              examples: sub.examples,
              status: sub.status,
              createdById: userId,
              updatedAt: null,
            },
          });

          for (const link of sub.subcategoryMeasurementUnits) {
            measurementUnitLinks.push({
              subcategoryId: newSub.id,
              measurementUnitId: link.measurementUnitId,
            });
          }
        }

        if (measurementUnitLinks.length > 0) {
          await tx.subcategoryMeasurementUnit.createMany({
            data: measurementUnitLinks,
          });
        }
      }

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
