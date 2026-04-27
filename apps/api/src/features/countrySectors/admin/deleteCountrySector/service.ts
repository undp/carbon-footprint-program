import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import { type DeleteCountrySectorResponse, type User } from "@repo/types";
import {
  DeleteBlockedByReferencesError,
  ResourceNotFoundError,
} from "@/errors/index.js";
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

    const [activeSubsectors, activeMainActivities, recommendations] =
      await Promise.all([
        tx.countrySubsector.count({
          where: {
            countrySectorId: sectorId,
            status: CountrySubsectorStatus.ACTIVE,
          },
        }),
        tx.organizationMainActivity.count({
          where: {
            countrySectorId: sectorId,
            status: OrganizationMainActivityStatus.ACTIVE,
          },
        }),
        tx.subcategoryRecommendation.count({
          where: { sectorId: sectorId },
        }),
      ]);

    const blockingTypes: string[] = [];
    if (activeSubsectors > 0) blockingTypes.push("subrubros");
    if (activeMainActivities > 0) blockingTypes.push("actividades principales");
    if (recommendations > 0)
      blockingTypes.push("recomendaciones de subcategoría");

    if (blockingTypes.length > 0) {
      const err = new DeleteBlockedByReferencesError(blockingTypes.join(", "));
      (err as Error & { userMessage?: string }).userMessage =
        `No se puede eliminar el rubro porque tiene ${blockingTypes.join(", ")} activos asociados. Elimínalos primero.`;
      throw err;
    }

    const updated = await tx.countrySector.update({
      where: { id: sectorId },
      data: {
        status: CountrySectorStatus.DELETED,
        updatedById: BigInt(user.id),
      },
      select: adminCountrySectorSelect,
    });

    return mapCountrySectorToAdmin(updated);
  });
};
