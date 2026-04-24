import type { PrismaClient } from "@repo/database";
import {
  SubcategoryRecommendationStatus,
  type UpdateSubcategoryRecommendationQuery,
  type UpdateSubcategoryRecommendationRequest,
  type UpdateSubcategoryRecommendationResponse,
  type User,
} from "@repo/types";
import { UserNotFoundError } from "../../users/errors.js";
import { loadGroup, resolveDefaultCountryId } from "../helpers.js";

export const updateSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  query: UpdateSubcategoryRecommendationQuery,
  data: UpdateSubcategoryRecommendationRequest,
  user: User | null
): Promise<UpdateSubcategoryRecommendationResponse> => {
  if (!user) {
    throw new UserNotFoundError();
  }

  const sectorId = BigInt(query.sectorId);
  const subsectorId =
    query.subsectorId !== null ? BigInt(query.subsectorId) : null;
  const userId = BigInt(user.id);
  const requestedIds = new Set(
    data.subcategoryIds.map((id) => BigInt(id).toString())
  );

  return prismaClient.$transaction(async (tx) => {
    const countryId = await resolveDefaultCountryId(tx);

    const existingRows = await tx.subcategoryRecommendation.findMany({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      select: { id: true, subcategoryId: true },
    });

    const existingIds = new Set(
      existingRows.map((row) => row.subcategoryId.toString())
    );

    const toRemove = existingRows.filter(
      (row) => !requestedIds.has(row.subcategoryId.toString())
    );
    const toAdd = [...requestedIds].filter((id) => !existingIds.has(id));

    if (toRemove.length > 0) {
      await tx.subcategoryRecommendation.updateMany({
        where: { id: { in: toRemove.map((row) => row.id) } },
        data: {
          status: SubcategoryRecommendationStatus.DELETED,
          updatedById: userId,
        },
      });
    }

    if (toAdd.length > 0) {
      await tx.subcategoryRecommendation.createMany({
        data: toAdd.map((subcategoryId) => ({
          sectorId,
          subsectorId,
          subcategoryId: BigInt(subcategoryId),
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: userId,
          updatedAt: null,
        })),
      });
    }

    const refreshed = await loadGroup(tx, sectorId, subsectorId);
    if (refreshed) {
      return refreshed;
    }

    // Empty group after update — resolve names so the response still has
    // context for the client.
    const [sector, subsector] = await Promise.all([
      tx.countrySector.findFirst({
        where: { id: sectorId, countryId },
        select: { id: true, name: true },
      }),
      subsectorId !== null
        ? tx.countrySubsector.findFirst({
            where: { id: subsectorId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      sectorId: sectorId.toString(),
      subsectorId: subsectorId?.toString() ?? null,
      sectorName: sector?.name ?? "",
      subsectorName: subsector?.name ?? null,
      subcategoryIds: [],
    };
  });
};
