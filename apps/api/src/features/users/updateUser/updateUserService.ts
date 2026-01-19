import { type PrismaClient, Prisma } from "@repo/database";
import type { UpdateUserBody, UpdateUserResponse } from "@repo/types";
import createError from "@fastify/error";
import { mapUserToResponse } from "../mappers.js";

const EmailAlreadyInUseError = createError(
  "EMAIL_ALREADY_IN_USE",
  "Email already in use",
  400
);

const InvalidCountryJobPositionIdError = createError(
  "INVALID_COUNTRY_JOB_POSITION_ID",
  "Invalid countryJobPositionId",
  400
);

export const updateUserService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateUserBody
): Promise<UpdateUserResponse | null> => {
  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.UserUncheckedUpdateInput = {};

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.countryJobPositionId !== undefined) {
    updateData.countryJobPositionId = data.countryJobPositionId === null ? null : BigInt(data.countryJobPositionId);
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

  // TODO: Add updated by id from logged in user
  updateData.updatedById = null;

  try {
    const updatedUser = await prismaClient.user.update({
      where: { id: BigInt(id) },
      data: updateData,
    });
    return mapUserToResponse(updatedUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record not found
        return null;
      }
      if (error.code === "P2002") {
        throw new EmailAlreadyInUseError();
      }
      if (error.code === "P2003") {
        throw new InvalidCountryJobPositionIdError();
      }
    }
    throw error;
  }
};
