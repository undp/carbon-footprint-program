import { type PrismaClient, CountrySectorStatus, Prisma } from "@repo/database";
import { type RestoreCountrySectorResponse, type User } from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  RestoreOnActiveError,
  attachDetails,
} from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySectorSelect,
  mapCountrySectorToAdmin,
} from "../helpers.js";

export const restoreCountrySectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<RestoreCountrySectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const existing = await tx.countrySector.findUnique({
        where: { id: sectorId },
        select: { id: true, status: true, countryId: true, name: true },
      });
      if (!existing) {
        throw new ResourceNotFoundError("CountrySector", id);
      }

      if (existing.status === CountrySectorStatus.ACTIVE) {
        throw attachDetails(new RestoreOnActiveError(), {
          resourceType: "CountrySector",
        });
      }

      const collision = await tx.countrySector.findFirst({
        where: {
          countryId: existing.countryId,
          name: existing.name,
          status: CountrySectorStatus.ACTIVE,
          id: { not: sectorId },
        },
        select: { id: true },
      });
      if (collision) {
        throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
          resourceType: "CountrySector",
          context: "RESTORE",
        });
      }

      const updated = await tx.countrySector.update({
        where: { id: sectorId },
        data: {
          status: CountrySectorStatus.ACTIVE,
          updatedById: BigInt(user.id),
        },
        select: adminCountrySectorSelect,
      });

      return mapCountrySectorToAdmin(updated);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
        resourceType: "CountrySector",
        context: "RESTORE",
      });
    }
    throw error;
  }
};
