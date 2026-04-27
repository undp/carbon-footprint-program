import {
  type PrismaClient,
  Prisma,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";
import {
  type UpdateOrganizationMainActivityRequest,
  type UpdateOrganizationMainActivityResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
  getDuplicatedFieldsFromP2002Error,
} from "@/errors/index.js";
import createError from "@fastify/error";
import { UserNotFoundError } from "../../../users/errors.js";
import { adminMainActivitySelect, mapMainActivityToAdmin } from "../helpers.js";

const SectorSubsectorMismatchError = createError(
  "SECTOR_SUBSECTOR_MISMATCH",
  "The provided subsector does not belong to the provided sector",
  400
);

export const updateOrganizationMainActivityService = async (
  prismaClient: PrismaClient,
  id: string,
  data: UpdateOrganizationMainActivityRequest,
  user: User | null
): Promise<UpdateOrganizationMainActivityResponse> => {
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
          countrySectorId: true,
          countrySubsectorId: true,
        },
      });
      if (!existing) {
        throw new ResourceNotFoundError("OrganizationMainActivity", id);
      }

      // Compute the effective (sectorId, subsectorId) pair after applying the patch.
      const effectiveSectorId =
        data.countrySectorId !== undefined
          ? data.countrySectorId === null
            ? null
            : BigInt(data.countrySectorId)
          : existing.countrySectorId;
      const effectiveSubsectorId =
        data.countrySubsectorId !== undefined
          ? data.countrySubsectorId === null
            ? null
            : BigInt(data.countrySubsectorId)
          : existing.countrySubsectorId;

      // Validate ACTIVE parents on the values touched by the patch.
      if (data.countrySectorId !== undefined && effectiveSectorId !== null) {
        const sector = await tx.countrySector.findFirst({
          where: {
            id: effectiveSectorId,
            status: CountrySectorStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (!sector) {
          throw new ResourceNotFoundError(
            "CountrySector",
            data.countrySectorId as string
          );
        }
      }
      if (
        data.countrySubsectorId !== undefined &&
        effectiveSubsectorId !== null
      ) {
        const subsector = await tx.countrySubsector.findFirst({
          where: {
            id: effectiveSubsectorId,
            status: CountrySubsectorStatus.ACTIVE,
          },
          select: { id: true, countrySectorId: true },
        });
        if (!subsector) {
          throw new ResourceNotFoundError(
            "CountrySubsector",
            data.countrySubsectorId as string
          );
        }
      }

      // If both effective ids are present, assert the subsector belongs to the effective
      // sector. We re-fetch the subsector to avoid relying on a possibly skipped lookup
      // above (e.g. if the patch only changed countrySectorId).
      if (effectiveSubsectorId !== null && effectiveSectorId !== null) {
        const subsector = await tx.countrySubsector.findUnique({
          where: { id: effectiveSubsectorId },
          select: { countrySectorId: true },
        });
        if (!subsector || subsector.countrySectorId !== effectiveSectorId) {
          const err = new SectorSubsectorMismatchError();
          err.message =
            "El subrubro seleccionado no pertenece al rubro indicado.";
          throw err;
        }
      }

      const updateData: Prisma.OrganizationMainActivityUpdateInput = {
        updater: { connect: { id: BigInt(user.id) } },
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) {
        updateData.description =
          data.description === null || data.description === ""
            ? null
            : data.description;
      }
      if (data.countrySectorId !== undefined) {
        updateData.countrySector =
          data.countrySectorId === null
            ? { disconnect: true }
            : { connect: { id: BigInt(data.countrySectorId) } };
      }
      if (data.countrySubsectorId !== undefined) {
        updateData.countrySubsector =
          data.countrySubsectorId === null
            ? { disconnect: true }
            : { connect: { id: BigInt(data.countrySubsectorId) } };
      }

      const updated = await tx.organizationMainActivity.update({
        where: { id: activityId },
        data: updateData,
        select: adminMainActivitySelect,
      });
      return mapMainActivityToAdmin(updated);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const duplicatedFields = getDuplicatedFieldsFromP2002Error(error);
        if (duplicatedFields.includes("name")) {
          const err = new DatabaseUniqueConstraintViolationError();
          err.message =
            "Ya existe una actividad principal activa con ese nombre y la misma combinación de rubro/subrubro.";
          throw err;
        }
      }
    }
    throw error;
  }
};
