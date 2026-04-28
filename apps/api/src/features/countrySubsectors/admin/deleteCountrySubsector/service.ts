import {
  type PrismaClient,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import { type DeleteCountrySubsectorResponse, type User } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySubsectorSelect,
  mapCountrySubsectorToAdmin,
} from "../helpers.js";

export const deleteCountrySubsectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteCountrySubsectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const subsectorId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const existing = await tx.countrySubsector.findUnique({
      where: { id: subsectorId },
      select: { id: true },
    });
    if (!existing) {
      throw new ResourceNotFoundError("CountrySubsector", id);
    }

    const updaterId = BigInt(user.id);

    // Cascade soft-delete: las main activities hijas se eliminan junto con el subrubro.
    // El conteo de impacto se muestra en el frontend antes de confirmar.
    await tx.organizationMainActivity.updateMany({
      where: {
        countrySubsectorId: subsectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById: updaterId,
      },
    });

    const updated = await tx.countrySubsector.update({
      where: { id: subsectorId },
      data: {
        status: CountrySubsectorStatus.DELETED,
        updatedById: updaterId,
      },
      select: adminCountrySubsectorSelect,
    });

    return mapCountrySubsectorToAdmin(updated);
  });
};
