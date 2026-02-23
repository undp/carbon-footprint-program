import { type PrismaClient, Prisma } from "@repo/database";
import type { CreateUserBody, CreateUserResponse, User } from "@repo/types";
import { mapUserToResponse } from "../mappers.js";
import {
  EmailAlreadyInUseError,
  IdpUserIdAlreadyInUseError,
  InvalidCountryJobPositionIdError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";

export const createUserService = async (
  prismaClient: PrismaClient,
  data: CreateUserBody,
  user: User | null
): Promise<CreateUserResponse> => {
  try {
    const userId = user ? BigInt(user.id) : null;

    const newUser = await prismaClient.user.create({
      data: {
        email: data.email,
        countryJobPositionId: data.countryJobPositionId
          ? BigInt(data.countryJobPositionId)
          : null,
        firstName: data.firstName,
        lastName: data.lastName,
        idpUserId: data.idpUserId ?? null,
        idpName: data.idpName ?? null,
        createdById: userId,
        updatedAt: null,
      },
    });

    return mapUserToResponse(newUser);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
