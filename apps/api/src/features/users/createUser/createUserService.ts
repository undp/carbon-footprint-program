import { type PrismaClient } from "@repo/database";
import type { CreateUserBody, CreateUserResponse } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";

export const createUserService = async (
  prismaClient: PrismaClient,
  data: CreateUserBody
): Promise<CreateUserResponse> => {
  const existingUser = await prismaClient.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error(`User already exists with email: ${data.email}`);
  }

  const user = await prismaClient.user.create({
    data: {
      email: data.email,
      countryJobPositionId: BigInt(data.countryJobPositionId),
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      createdById: null,
      updatedById: null,
    },
  });

  return mapUserToResponse(user);
};
