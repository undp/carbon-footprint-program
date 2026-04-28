import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import { type DeleteCountrySectorResponse, type User } from "@repo/types";
import { ResourceNotFoundError } from "@/errors/index.js";
import { UserNotFoundError } from "../../../users/errors.js";
import {
  adminCountrySectorSelect,
  mapCountrySectorToAdmin,
} from "../helpers.js";

export const deleteCountrySectorService = async (
  prismaClient: PrismaClient,
  id: string,
  user: User | null
): Promise<DeleteCountrySectorResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(id);

  return await prismaClient.$transaction(async (tx) => {
    const existing = await tx.countrySector.findUnique({
      where: { id: sectorId },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new ResourceNotFoundError("CountrySector", id);
    }

    const updaterId = BigInt(user.id);

    // Cascade soft-delete: deepest level first. Hijos/refs externas que apunten a estas
    // filas quedarán con FK a un row DELETED — el frontend muestra el conteo de impacto
    // en un dialog de confirmación previo (ver DeleteWarningDialog) para que el usuario
    // pueda decidir informado.
    await tx.organizationMainActivity.updateMany({
      where: {
        countrySectorId: sectorId,
        status: OrganizationMainActivityStatus.ACTIVE,
      },
      data: {
        status: OrganizationMainActivityStatus.DELETED,
        updatedById: updaterId,
      },
    });
    await tx.countrySubsector.updateMany({
      where: {
        countrySectorId: sectorId,
        status: CountrySubsectorStatus.ACTIVE,
      },
      data: {
        status: CountrySubsectorStatus.DELETED,
        updatedById: updaterId,
      },
    });

    const updated = await tx.countrySector.update({
      where: { id: sectorId },
      data: {
        status: CountrySectorStatus.DELETED,
        updatedById: updaterId,
      },
      select: adminCountrySectorSelect,
    });

    return mapCountrySectorToAdmin(updated);
  });
};
