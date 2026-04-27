import {
  type PrismaClient,
  CountrySubsectorStatus,
  Prisma,
} from "@repo/database";
import { type RestoreCountrySubsectorResponse, type User } from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
} from "@/errors/index.js";
import createError from "@fastify/error";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

const RestoreOnActiveError = createError(
  "RESTORE_ON_ACTIVE",
  "The row is already ACTIVE",
  400
);

export const restoreCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<RestoreCountrySubsectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const existing = await tx.countrySubsector.findUnique({
        where: { id: subsectorId },
        select: {
          id: true,
          status: true,
          countrySectorId: true,
          name: true,
        },
      });
      if (!existing) {
        throw new ResourceNotFoundError("CountrySubsector", id);
      }

      if (existing.status === CountrySubsectorStatus.ACTIVE) {
        const err = new RestoreOnActiveError();
        err.message = "El subrubro ya se encuentra activo.";
        throw err;
      }

      const collision = await tx.countrySubsector.findFirst({
        where: {
          countrySectorId: existing.countrySectorId,
          name: existing.name,
          status: CountrySubsectorStatus.ACTIVE,
          id: { not: subsectorId },
        },
        select: { id: true },
      });
      if (collision) {
        const err = new DatabaseUniqueConstraintViolationError();
        err.message =
          "Ya existe un subrubro activo con el mismo nombre dentro del rubro. Renombra o elimina el subrubro activo antes de restaurar.";
        throw err;
      }

      const updated = await tx.countrySubsector.update({
        where: { id: subsectorId },
        data: {
          status: CountrySubsectorStatus.ACTIVE,
          updatedById: BigInt(user.id),
        },
        select: adminCountrySubsectorSelect,
      });
      return mapCountrySubsectorToAdmin(updated);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const err = new DatabaseUniqueConstraintViolationError();
      err.message =
        "Ya existe un subrubro activo con el mismo nombre dentro del rubro. Renombra o elimina el subrubro activo antes de restaurar.";
      throw err;
    }
    throw error;
  }
};
