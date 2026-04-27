import {
  type PrismaClient,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
} from "@repo/database";
import { type DeleteCountrySubsectorResponse, type User } from "@repo/types";
import {
  DeleteBlockedByReferencesError,
  ResourceNotFoundError,
} from "@/errors/index.js";
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

    const [activeMainActivities, recommendations] = await Promise.all([
      tx.organizationMainActivity.count({
        where: {
          countrySubsectorId: subsectorId,
          status: OrganizationMainActivityStatus.ACTIVE,
        },
      }),
      tx.subcategoryRecommendation.count({
        where: { subsectorId: subsectorId },
      }),
    ]);

    const blockingTypes: string[] = [];
    if (activeMainActivities > 0) blockingTypes.push("actividades principales");
    if (recommendations > 0)
      blockingTypes.push("recomendaciones de subcategoría");

    if (blockingTypes.length > 0) {
      const err = new DeleteBlockedByReferencesError(blockingTypes.join(", "));
      (err as Error & { userMessage?: string }).userMessage =
        `No se puede eliminar el subrubro porque tiene ${blockingTypes.join(", ")} activos asociados. Elimínalos primero.`;
      throw err;
    }

    const updated = await tx.countrySubsector.update({
      where: { id: subsectorId },
      data: {
        status: CountrySubsectorStatus.DELETED,
        updatedById: BigInt(user.id),
      },
      select: adminCountrySubsectorSelect,
    });

    return mapCountrySubsectorToAdmin(updated);
  });
};
