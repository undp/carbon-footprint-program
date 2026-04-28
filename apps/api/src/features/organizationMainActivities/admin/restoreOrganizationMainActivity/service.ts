import {
  type PrismaClient,
  OrganizationMainActivityStatus,
  CountrySectorStatus,
  CountrySubsectorStatus,
  Prisma,
} from "@repo/database";
import {
  type RestoreOrganizationMainActivityResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ParentNotActiveError,
  ResourceNotFoundError,
} from "@/errors/index.js";
import createError from "@fastify/error";

const SectorSubsectorMismatchError = createError(
  "SECTOR_SUBSECTOR_MISMATCH",
  "The provided subsector does not belong to the provided sector",
  400
);
import { UserNotFoundError } from "../../../users/errors.js";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

const RestoreOnActiveError = createError(
  "RESTORE_ON_ACTIVE",
  "The row is already ACTIVE",
  400
);

export const restoreOrganizationMainActivityService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<RestoreOrganizationMainActivityResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const activityId = BigInt(id);

  try {
    return await prismaClient.$transaction(async (tx) => {
      const existing = await tx.organizationMainActivity.findUnique({
        where: { id: activityId },
        select: {
          id: true,
          status: true,
          name: true,
          countrySectorId: true,
          countrySubsectorId: true,
        },
      });
      if (!existing) {
        throw new ResourceNotFoundError("OrganizationMainActivity", id);
      }

      if (existing.status === OrganizationMainActivityStatus.ACTIVE) {
        const err = new RestoreOnActiveError();
        err.message = "La actividad principal ya se encuentra activa.";
        throw err;
      }

      // Block restore when the linked rubro/subrubro is no longer ACTIVE so
      // restored activities never resurrect with stale parent references.
      // ParentNotActiveError (vs ResourceNotFoundError) lets the frontend show a dialog
      // explaining which parent must be restored first.
      if (existing.countrySectorId !== null) {
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
          const err = new ParentNotActiveError("CountrySector");
          err.message = `No se puede restaurar la actividad principal "${existing.name}" porque el rubro "${parentSector.name}" está eliminado. Restáuralo primero.`;
          throw err;
        }
      }

      if (existing.countrySubsectorId !== null) {
        const parentSubsector = await tx.countrySubsector.findUnique({
          where: { id: existing.countrySubsectorId },
          select: {
            id: true,
            status: true,
            name: true,
            countrySectorId: true,
          },
        });
        if (!parentSubsector) {
          throw new ResourceNotFoundError(
            "CountrySubsector",
            existing.countrySubsectorId.toString()
          );
        }
        if (parentSubsector.status !== CountrySubsectorStatus.ACTIVE) {
          const err = new ParentNotActiveError("CountrySubsector");
          err.message = `No se puede restaurar la actividad principal "${existing.name}" porque el subrubro "${parentSubsector.name}" está eliminado. Restáuralo primero.`;
          throw err;
        }

        if (
          existing.countrySectorId !== null &&
          parentSubsector.countrySectorId !== existing.countrySectorId
        ) {
          const err = new SectorSubsectorMismatchError();
          err.message =
            "El subrubro asociado ya no pertenece al rubro indicado.";
          throw err;
        }
      }

      const collision = await tx.organizationMainActivity.findFirst({
        where: {
          name: existing.name,
          countrySectorId: existing.countrySectorId,
          countrySubsectorId: existing.countrySubsectorId,
          status: OrganizationMainActivityStatus.ACTIVE,
          id: { not: activityId },
        },
        select: { id: true },
      });
      if (collision) {
        const err = new DatabaseUniqueConstraintViolationError();
        err.message =
          "Ya existe una actividad principal activa con el mismo nombre y rubro/subrubro. Renombra o elimina la activa antes de restaurar.";
        throw err;
      }

      const updated = await tx.organizationMainActivity.update({
        where: { id: activityId },
        data: {
          status: OrganizationMainActivityStatus.ACTIVE,
          updatedById: BigInt(user.id),
        },
        select: adminMainActivitySelect,
      });
      return mapMainActivityToAdmin(updated);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const err = new DatabaseUniqueConstraintViolationError();
      err.message =
        "Ya existe una actividad principal activa con el mismo nombre y rubro/subrubro. Renombra o elimina la activa antes de restaurar.";
      throw err;
    }
    throw error;
  }
};
