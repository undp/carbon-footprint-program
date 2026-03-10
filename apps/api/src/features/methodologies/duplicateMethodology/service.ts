import {
  type PrismaClient,
  MethodologyVersionStatus,
  Prisma,
} from "@repo/database";
import {
  type DuplicateMethodologyResponse,
  type User,
  CategoryStatus,
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

  const existingNames = await prismaClient.methodologyVersion.findMany({
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

  try {
    const userId = user ? BigInt(user.id) : null;

    // Create a new methodology based on the original

    // Use transaction to duplicate methodology AND its active categories
    const duplicated = await prismaClient.$transaction(async (tx) => {
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

      if (activeCategories.length > 0) {
        await tx.category.createMany({
          data: activeCategories.map((cat) => ({
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
          })),
        });
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
