import { type PrismaClient, Prisma } from "@repo/database";
import {
  type UpdateCountryOrganizationSizeRequest,
  type UpdateCountryOrganizationSizeResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

export const updateCountryOrganizationSizeService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateCountryOrganizationSizeRequest,
  user: User | null
): Promise<UpdateCountryOrganizationSizeResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sizeId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const existing = await tx.countryOrganizationSize.findUnique({
        where: { id: sizeId },
        select: { id: true },
      });
      if (!existing) {
        throw new ResourceNotFoundError("CountryOrganizationSize", id);
      }

      const updateData: Prisma.CountryOrganizationSizeUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) {
        updateData.description =
          data.description === null || data.description === ""
            ? null
            : data.description;
      }

      const updated = await tx.countryOrganizationSize.update({
        where: { id: sizeId },
        data: updateData,
        select: adminCountryOrganizationSizeSelect,
      });
      return mapCountryOrganizationSizeToAdmin(updated);
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
