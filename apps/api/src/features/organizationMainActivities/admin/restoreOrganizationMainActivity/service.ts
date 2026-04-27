import {
  type PrismaClient,
  OrganizationMainActivityStatus,
} from "@repo/database";
import {
  type RestoreOrganizationMainActivityResponse,
  type User,
} from "@repo/types";
import {
  DatabaseUniqueConstraintViolationError,
  ResourceNotFoundError,
} from "@/errors/index.js";
import createError from "@fastify/error";
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
      (err as Error & { userMessage?: string }).userMessage =
        "La actividad principal ya se encuentra activa.";
      throw err;
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
      (err as Error & { userMessage?: string }).userMessage =
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
};
