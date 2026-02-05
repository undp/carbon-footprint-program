import {
  type PrismaClient,
  MethodologyVersionStatus,
  Prisma,
} from "@repo/database";
import type {
  CreateMethodologyRequest,
  CreateMethodologyResponse,
} from "@repo/types";
import { mapMethodologyToResponse } from "../mappers.js";
import {
  MethodologyNameAlreadyExistsError,
  NoCountryFoundError,
  getDuplicatedFieldsFromP2002Error,
} from "../errors.js";

export const createMethodologyService = async (
  prismaClient: PrismaClient,
  data: CreateMethodologyRequest
): Promise<CreateMethodologyResponse> => {
  // Get the first country from the database
  const country = await prismaClient.country.findFirst({
    orderBy: { id: "asc" },
  });

  if (!country) {
    throw new NoCountryFoundError();
  }

  try {
    const methodology = await prismaClient.methodologyVersion.create({
      data: {
        countryId: country.id,
        name: data.name,
        description: data.description,
        regulation: data.regulation,
        version: data.version,
        status: MethodologyVersionStatus.UNPUBLISHED,
        createdById: null, // TODO: Add from authenticated user
        updatedById: null,
      },
    });
    return mapMethodologyToResponse(methodology);
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
