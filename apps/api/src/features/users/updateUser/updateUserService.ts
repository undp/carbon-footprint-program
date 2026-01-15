import { type PrismaClient, Prisma } from "@repo/database";
import type { UpdateUserBody, UpdateUserResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

export const updateUserService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateUserBody
): Promise<UpdateUserResponse | null> => {
  // Check if the user exists
  const existingUser = await prismaClient.user.findUnique({
    where: { id: BigInt(id) },
  });

  if (!existingUser) {
    return null;
  }

  // Build the update data object dynamically based on provided fields
  const updateData: Prisma.UserUncheckedUpdateInput = {};

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (data.countryJobPositionId !== undefined) {
    updateData.countryJobPositionId = BigInt(data.countryJobPositionId);
  }

  if (data.firstName !== undefined) {
    updateData.firstName = data.firstName;
  }

  if (data.lastName !== undefined) {
    updateData.lastName = data.lastName;
  }

  // TODO: Add updated by id from logged in user
  updateData.updatedById = null;

  const updatedUser = await prismaClient.user.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return mapUserToResponse(updatedUser);
};
