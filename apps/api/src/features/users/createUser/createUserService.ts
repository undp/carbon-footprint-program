import { type PrismaClient, Prisma } from "@repo/database";
import type { CreateUserBody, CreateUserResponse } from "@repo/types";
import createError from "@fastify/error";
import { mapUserToResponse } from "../mappers.js";

const EmailAlreadyInUseError = createError(
  "EMAIL_ALREADY_IN_USE",
  "Email already in use",
  409
);

const InvalidCountryJobPositionIdError = createError(
  "INVALID_COUNTRY_JOB_POSITION_ID",
  "Invalid countryJobPositionId: the provided reference does not exist",
  400
);

export const createUserService = async (
  prismaClient: PrismaClient,
  data: CreateUserBody
): Promise<CreateUserResponse> => {
  const existingUser = data.email ? await prismaClient.user.findUnique({
    where: { email: data.email },
  }) : null;

  if (existingUser) {
    throw new EmailAlreadyInUseError();
  }

  try {
    const user = await prismaClient.user.create({
      data: {
        email: data.email,
        countryJobPositionId: data.countryJobPositionId ? BigInt(data.countryJobPositionId) : null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        idpUserId: data.idpUserId ?? null,
        idpName: data.idpName ?? null,
        createdById: null,
        updatedById: null,
      },
    });

    return mapUserToResponse(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        // Foreign key constraint violation
        throw new InvalidCountryJobPositionIdError();
      }
    }
    throw error;
  }
};
