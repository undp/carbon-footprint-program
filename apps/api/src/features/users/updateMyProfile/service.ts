import { type PrismaClient, Prisma } from "@repo/database";
import type { UpdateMyProfileBody, UpdateMyProfileResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";
import {
  EmailAlreadyInUseError,
  IdpUserIdAlreadyInUseError,
  InvalidCountryJobPositionIdError,
  UserNotFoundError,
} from "../errors.js";
import {
  DatabaseUniqueConstraintViolationError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";

export const updateMyProfileService = async (
  prismaClient: PrismaClient,
  userId: string,
  data: UpdateMyProfileBody
): Promise<UpdateMyProfileResponse> => {
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
  if (data.termsAccepted !== undefined) {
    updateData.termsAccepted = data.termsAccepted;
  }
  if (data.onboardingCompleted !== undefined) {
    updateData.onboardingCompleted = data.onboardingCompleted;
    // Stamp the completion time server-side (never trust a client clock); clear
    // it if the flag is ever unset.
    updateData.onboardingCompletedAt = data.onboardingCompleted
      ? new Date()
      : null;
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedById = BigInt(userId);
  }

  try {
    const updatedUser = await prismaClient.user.update({
      where: { id: BigInt(userId) },
      data: updateData,
    });
    return mapUserToResponse(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new UserNotFoundError(userId);
      }
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("idp_user_id")) {
          throw new IdpUserIdAlreadyInUseError();
        }
        if (duplicatedFields.includes("email")) {
          throw new EmailAlreadyInUseError();
        }
        throw new DatabaseUniqueConstraintViolationError();
      }
      if (error.code === "P2003") {
        throw new InvalidCountryJobPositionIdError();
      }
    }
    throw error;
  }
};
