import { type PrismaClient, Prisma } from "@repo/database";
import {
  type CreateCountrySectorRequest,
  type CreateCountrySectorResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  attachDetails,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { NoCountryFoundError } from "../../../methodologies/errors.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySectorSelect,
  mapCountrySectorToAdmin,
} from "../helpers.js";

export const createCountrySectorService = async (
  prismaClient: PrismaClient,
  data: CreateCountrySectorRequest,
  user: User | null
): Promise<CreateCountrySectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  try {
    return await prismaClient.$transaction(async (tx) => {
      const country = await tx.country.findFirst({
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (!country) {
        throw new NoCountryFoundError();
      }

      const created = await tx.countrySector.create({
        data: {
          countryId: country.id,
          name: data.name,
          description: data.description ?? null,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        select: adminCountrySectorSelect,
      });

      return mapCountrySectorToAdmin(created);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
            resourceType: "CountrySector",
            context: "CREATE",
          });
        }
      }
    }
    throw error;
  }
};
