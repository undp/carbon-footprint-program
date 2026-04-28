import { type PrismaClient, Prisma } from "@repo/database";
import {
  type CreateCountryOrganizationSizeRequest,
  type CreateCountryOrganizationSizeResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { NoCountryFoundError } from "../../../methodologies/errors.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

export const createCountryOrganizationSizeService = async (
  prismaClient: PrismaClient,
  data: CreateCountryOrganizationSizeRequest,
  user: User | null
): Promise<CreateCountryOrganizationSizeResponse> => {
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

      const aggregate = await tx.countryOrganizationSize.aggregate({
        where: { countryId: country.id },
        _max: { position: true },
      });
      const nextPosition = (aggregate._max.position ?? 0) + 1;

      const created = await tx.countryOrganizationSize.create({
        data: {
          countryId: country.id,
          name: data.name,
          description: data.description ?? null,
          position: nextPosition,
          createdById: BigInt(user.id),
          updatedAt: null,
        },
        select: adminCountryOrganizationSizeSelect,
      });

      return mapCountryOrganizationSizeToAdmin(created);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          const err = new DatabaseUniqueConstraintViolationError();
          err.message =
            "Ya existe un tamaño de organización activo con ese nombre.";
          throw err;
        }
      }
    }
    throw error;
  }
};
