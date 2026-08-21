import type { PrismaClient } from "@repo/database";
import type {
  GetAllTerritoriesQuery,
  GetAllTerritoriesResponse,
} from "@repo/types";

/**
 * Children of `parentId`, or the roots of the hierarchy when it is absent.
 *
 * The catalog is read one level at a time rather than as a whole tree: the
 * official catalog reaches the sector level, which is tens of thousands of rows,
 * and the form only ever needs the siblings under the node the user just picked.
 */
export const getAllTerritoriesService = async (
  prismaClient: PrismaClient,
  filters?: GetAllTerritoriesQuery | null
): Promise<GetAllTerritoriesResponse> => {
  const territories = await prismaClient.territory.findMany({
    where: {
      parentId: filters?.parentId ? BigInt(filters.parentId) : null,
    },
    select: {
      id: true,
      name: true,
      level: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return territories.map((territory) => ({
    ...territory,
    id: territory.id.toString(),
  }));
};
