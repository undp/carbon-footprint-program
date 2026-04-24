import type { PrismaClient } from "@repo/database";
import { SubcategoryRecommendationStatus } from "@repo/types";
import type {
  UpdateSubcategoryRecommendationBody,
  UpdateSubcategoryRecommendationQuery,
  UpdateSubcategoryRecommendationResponse,
  User,
} from "@repo/types";
import { buildGroupedResponse } from "../helpers.js";

export const updateSubcategoryRecommendationService = async (
  prismaClient: PrismaClient,
  query: UpdateSubcategoryRecommendationQuery,
  data: UpdateSubcategoryRecommendationBody,
  user: User | null
): Promise<UpdateSubcategoryRecommendationResponse> => {
  const sectorId = BigInt(query.sectorId);
  const subsectorId =
    query.subsectorId !== null ? BigInt(query.subsectorId) : null;
  const userId = user ? BigInt(user.id) : null;
  const incomingIds = new Set(data.subcategoryIds);

  const [sector, subsector] = await Promise.all([
    prismaClient.countrySector.findUnique({
      where: { id: sectorId },
      select: { id: true, name: true },
    }),
    subsectorId !== null
      ? prismaClient.countrySubsector.findUnique({
          where: { id: subsectorId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  const group = await prismaClient.$transaction(async (tx) => {
    const existingRows = await tx.subcategoryRecommendation.findMany({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      select: { id: true, subcategoryId: true },
    });

    const existingIds = new Set(
      existingRows.map((r) => Number(r.subcategoryId))
    );

    const toRemoveIds = existingRows
      .filter((r) => !incomingIds.has(Number(r.subcategoryId)))
      .map((r) => r.id);

    const toAddIds = data.subcategoryIds.filter((id) => !existingIds.has(id));

    if (toRemoveIds.length > 0) {
      await tx.subcategoryRecommendation.updateMany({
        where: { id: { in: toRemoveIds } },
        data: {
          status: SubcategoryRecommendationStatus.DELETED,
          updatedById: userId,
        },
      });
    }

    if (toAddIds.length > 0) {
      await tx.subcategoryRecommendation.createMany({
        data: toAddIds.map((subcategoryId) => ({
          subcategoryId: BigInt(subcategoryId),
          sectorId,
          subsectorId,
          status: SubcategoryRecommendationStatus.ACTIVE,
          createdById: userId,
        })),
      });
    }

    return tx.subcategoryRecommendation.findMany({
      where: {
        sectorId,
        subsectorId,
        status: SubcategoryRecommendationStatus.ACTIVE,
      },
      include: {
        sector: { select: { id: true, name: true } },
        subsector: { select: { id: true, name: true } },
      },
    });
  });

  const grouped = buildGroupedResponse(group);

  if (grouped.length === 0) {
    return {
      sectorId: query.sectorId,
      subsectorId: query.subsectorId,
      sectorName: sector?.name ?? "",
      subsectorName: subsector?.name ?? null,
      subcategoryIds: [],
    };
  }

  return grouped[0]!;
};
