import { type PrismaClient, Prisma } from "@repo/database";
import type { UpdateUserBody, UpdateUserResponse, User } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";
import {
  EmailAlreadyInUseError,
  IdpUserIdAlreadyInUseError,
  InvalidCountryJobPositionIdError,
  UserNotFoundError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";

export const updateUserService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateUserBody,
  user: User | null
): Promise<UpdateUserResponse> => {
  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.UserUncheckedUpdateInput = {};

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.countryJobPositionId !== undefined) {
    updateData.countryJobPositionId =
      data.countryJobPositionId === null
        ? null
        : BigInt(data.countryJobPositionId);
  }

  if (data.firstName !== undefined) {
    updateData.firstName = data.firstName;
  }

  if (data.lastName !== undefined) {
    updateData.lastName = data.lastName;
  }

  if (data.idpUserId !== undefined) {
    updateData.idpUserId = data.idpUserId;
  }

  if (data.idpName !== undefined) {
    updateData.idpName = data.idpName ?? null;
  }

  // Only set updatedById if there are actual fields to update
  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = user ? BigInt(user.id) : null;
  }

  try {
    const updatedUser = await prismaClient.user.update({
      where: { id: BigInt(id) },
      data: updateData,
    });
    return mapUserToResponse(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new UserNotFoundError(id);
      }
      if (error.code === "P2002") {
        // Unique constraint violation
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);

        if (duplicatedFields.includes("idp_user_id")) {
          throw new IdpUserIdAlreadyInUseError();
        }
        if (duplicatedFields.includes("email")) {
          throw new EmailAlreadyInUseError();
        }
        // Fallback for other unique constraint violations
        throw new DatabaseUniqueConstraintViolationError();
      }
      if (error.code === "P2003") {
        // Foreign key constraint violation
        throw new InvalidCountryJobPositionIdError();
      }
    }
    throw error;
  }
};
