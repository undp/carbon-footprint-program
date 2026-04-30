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
  RestoreOnActiveError,
  attachDetails,
} from "@/errors/index.js";
import { SectorSubsectorMismatchError } from "../../errors.js";
import { UserNotFoundError } from "../../../users/errors.js";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

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
        throw attachDetails(new RestoreOnActiveError(), {
          resourceType: "OrganizationMainActivity",
        });
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
          throw attachDetails(new ParentNotActiveError("CountrySector"), {
            resourceType: "OrganizationMainActivity",
            resourceName: existing.name,
            parentType: "CountrySector",
            parentName: parentSector.name,
          });
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
          throw attachDetails(new ParentNotActiveError("CountrySubsector"), {
            resourceType: "OrganizationMainActivity",
            resourceName: existing.name,
            parentType: "CountrySubsector",
            parentName: parentSubsector.name,
          });
        }

        if (
          existing.countrySectorId !== null &&
          parentSubsector.countrySectorId !== existing.countrySectorId
        ) {
          throw new SectorSubsectorMismatchError();
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
        throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
          resourceType: "OrganizationMainActivity",
          context: "RESTORE",
        });
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
      throw attachDetails(new DatabaseUniqueConstraintViolationError(), {
        resourceType: "OrganizationMainActivity",
        context: "RESTORE",
      });
    }
    throw error;
  }
};
