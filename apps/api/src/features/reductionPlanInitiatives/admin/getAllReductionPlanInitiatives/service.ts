import {
  ReductionPlanInitiativeStatus,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import type {
  GetAllReductionPlanInitiativesQuery,
  GetAllReductionPlanInitiativesResponse,
} from "@repo/types";
import {
  adminReductionPlanInitiativeInclude,
  mapReductionPlanInitiativeToListItem,
} from "../mappers.js";

export const getAllReductionPlanInitiativesService = async (
  prismaClient: PrismaClient,
  query: GetAllReductionPlanInitiativesQuery | null
): Promise<GetAllReductionPlanInitiativesResponse> => {
  const where: Prisma.ReductionPlanInitiativeWhereInput = {
    status: ReductionPlanInitiativeStatus.ACTIVE,
  };

  if (query?.methodologyVersionId) {
    where.subcategory = {
      category: {
        methodologyVersionId: BigInt(query.methodologyVersionId),
      },
    };
  }

  const rows = await prismaClient.reductionPlanInitiative.findMany({
    where,
    include: adminReductionPlanInitiativeInclude,
    // The `where` filters the initiative's status, not the category's or the
    // subcategory's, so soft-deleted rows of either level are in scope — and
    // positions are unique only among non-DELETED ones, so `id` breaks both
    // ties, as in getAllEmissionFactors. Without the category key the
    // subcategories of two categories sharing a position interleave.
    //
    // The initiative's own `id` closes the last tie: two ACTIVE initiatives on
    // the same subcategory can share a title, and without a final key they fall
    // through to heap order, so editing one moves it inside its group on the
    // next refetch.
    orderBy: [
      { subcategory: { category: { position: "asc" } } },
      { subcategory: { category: { id: "asc" } } },
      { subcategory: { position: "asc" } },
      { subcategory: { id: "asc" } },
      { title: "asc" },
      { id: "asc" },
    ],
  });

  return rows.map(mapReductionPlanInitiativeToListItem);
};
