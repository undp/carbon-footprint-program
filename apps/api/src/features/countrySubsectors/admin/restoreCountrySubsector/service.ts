import {
  type PrismaClient,
  CountrySubsectorStatus,
  CountrySectorStatus,
  Prisma,
} from "@repo/database";
import { type RestoreCountrySubsectorResponse, type User } from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ParentNotActiveError,
  ResourceNotFoundError,
  RestoreOnActiveError,
  attachDetails,
} from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

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
        throw attachDetails(new RestoreOnActiveError(), {
          resourceType: "CountrySubsector",
        });
      }

      // Block restore when the parent sector has been soft-deleted so the
      // catalog never exposes an ACTIVE subsector orphaned from its rubro.
      // ParentNotActiveError (vs ResourceNotFoundError) lets the frontend show a dialog
      // explaining which parent must be restored first.
      const parentSector = await tx.countrySector.findUnique({
        where: { id: existing.countrySectorId },
        select: { id: true, status: true, name: true },
      });
      if (!parentSector) {
        throw new ResourceNotFoundError(
          "CountrySector",
          existing.countrySectorId.toString()
        );
      }
      if (parentSector.status !== CountrySectorStatus.ACTIVE) {
        throw attachDetails(new ParentNotActiveError("CountrySector"), {
          resourceType: "CountrySubsector",
          resourceName: existing.name,
          parentType: "CountrySector",
          parentName: parentSector.name,
        });
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
        throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
          resourceType: "CountrySubsector",
          context: "RESTORE",
        });
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
      throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
        resourceType: "CountrySubsector",
        context: "RESTORE",
      });
    }
    throw error;
  }
};
