import {
  type PrismaClient,
  MethodologyVersionStatus,
  Prisma,
} from "@repo/database";
import type { DuplicateMethodologyResponse } from "@repo/types";
import { mapMethodologyToResponse } from "../mappers.js";
import {
  MethodologyNotFoundError,
  MethodologyNameAlreadyExistsError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";

export const duplicateMethodologyService = async (
  prismaClient: PrismaClient,
  methodologyId: string
): Promise<DuplicateMethodologyResponse> => {
  // Find the original methodology
  const original = await prismaClient.methodologyVersion.findUnique({
    where: { id: BigInt(methodologyId) },
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

  const existingNameSet = new Set(existingNames.map((item) => item.name));
  let duplicatedName = `${original.name} (copy)`;
  while (existingNameSet.has(duplicatedName)) {
    duplicatedName = `${duplicatedName} (copy)`;
  }

  try {
    // Create a new methodology based on the original
    const duplicated = await prismaClient.methodologyVersion.create({
      data: {
        countryId: original.countryId,
        name: duplicatedName,
        description: original.description,
        regulation: original.regulation,
        version: original.version,
        status: MethodologyVersionStatus.UNPUBLISHED,
        createdById: null, // TODO: Add from authenticated user
        updatedById: null,
      },
    });

    return mapMethodologyToResponse(duplicated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (
          duplicatedFields.includes("name") ||
          duplicatedFields.includes("country_id")
        ) {
          throw new MethodologyNameAlreadyExistsError();
        }
      }
    }
    throw error;
  }
};
