import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import {
  type RestoreCountryOrganizationSizeResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
} from "@/errors/index.js";
import createError from "@fastify/error";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountryOrganizationSizeSelect,
  mapCountryOrganizationSizeToAdmin,
} from "../helpers.js";

const RestoreOnActiveError = createError(
  "RESTORE_ON_ACTIVE",
  "The row is already ACTIVE",
  400
);

export const restoreCountryOrganizationSizeService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<RestoreCountryOrganizationSizeResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sizeId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const existing = await tx.countryOrganizationSize.findUnique({
      where: { id: sizeId },
      select: {
        id: true,
        status: true,
        countryId: true,
        name: true,
      },
    });
    if (!existing) {
      throw new ResourceNotFoundError("CountryOrganizationSize", id);
    }

    if (existing.status === CountryOrganizationSizeStatus.ACTIVE) {
      const err = new RestoreOnActiveError();
      err.message = "El tamaño de organización ya se encuentra activo.";
      throw err;
    }

    const collision = await tx.countryOrganizationSize.findFirst({
      where: {
        countryId: existing.countryId,
        name: existing.name,
        status: CountryOrganizationSizeStatus.ACTIVE,
        id: { not: sizeId },
      },
      select: { id: true },
    });
    if (collision) {
      const err = new DatabaseUniqueConstraintViolationError();
      err.message =
        "Ya existe un tamaño de organización activo con el mismo nombre. Renombra o elimina el activo antes de restaurar.";
      throw err;
    }

    const updated = await tx.countryOrganizationSize.update({
      where: { id: sizeId },
      data: {
        status: CountryOrganizationSizeStatus.ACTIVE,
        updatedById: BigInt(user.id),
      },
      select: adminCountryOrganizationSizeSelect,
    });
    return mapCountryOrganizationSizeToAdmin(updated);
  });
};
