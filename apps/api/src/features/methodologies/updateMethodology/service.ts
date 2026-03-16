import { type PrismaClient, Prisma } from "@repo/database";
import type {
  UpdateMethodologyRequest,
  UpdateMethodologyResponse,
} from "@repo/types";
import { MethodologyVersionStatus, type User } from "@repo/types";
import { mapMethodologyToResponse } from "../mappers.js";
import {
  MethodologyNameVersionAlreadyExistsError,
  MethodologyIsDeletedError,
  MethodologyNotFoundError,
} from "../errors.js";
import { getDuplicatedFieldsFromP2002Error } from "@/errors/index.js";

export const updateMethodologyService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateMethodologyRequest,
  user: User | null
): Promise<UpdateMethodologyResponse> => {
  const targetMethodology = await prismaClient.methodologyVersion.findUnique({
    where: { id: BigInt(id) },
    select: { countryId: true, status: true },
  });

  if (!targetMethodology) {
    throw new MethodologyNotFoundError();
  }

  if (targetMethodology.status === MethodologyVersionStatus.DELETED) {
    throw new MethodologyIsDeletedError();
  }

  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.MethodologyVersionUncheckedUpdateInput = {};

  if (data.name) {
    updateData.name = data.name;
  }

  if (data.description) {
    updateData.description = data.description;
  }

  if (data.regulation) {
    updateData.regulation = data.regulation;
  }

  if (data.version) {
    updateData.version = data.version;
  }

  if (data.status) {
    updateData.status = data.status;
  }

  // Only set updatedById if there are actual fields to update
  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = user ? BigInt(user.id) : null;
  }

  try {
    // If setting status to PUBLISHED, unpublish other methodologies of the same country
    if (data.status === MethodologyVersionStatus.PUBLISHED) {
      // Use transaction to ensure atomicity
      const methodology = await prismaClient.$transaction(async (tx) => {
        // Unpublish all other PUBLISHED methodologies for this country
        await tx.methodologyVersion.updateMany({
          where: {
            countryId: targetMethodology.countryId,
            status: MethodologyVersionStatus.PUBLISHED,
            id: { not: BigInt(id) },
          },
          data: {
            status: MethodologyVersionStatus.UNPUBLISHED,
            updatedById: null,
          },
        });

        // Update the target methodology
        return tx.methodologyVersion.update({
          where: { id: BigInt(id) },
          data: updateData,
        });
      });

      return mapMethodologyToResponse(methodology);
    }

    const methodology = await prismaClient.methodologyVersion.update({
      where: {
        id: BigInt(id),
      },
      data: updateData,
    });
    return mapMethodologyToResponse(methodology);
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
