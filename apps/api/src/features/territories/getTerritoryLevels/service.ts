import { type PrismaClient, TerritoryLevel } from "@repo/database";
import type { GetTerritoryLevelsResponse } from "@repo/types";

/**
 * The levels the catalog holds rows for, outermost first.
 *
 * The official hierarchy is five levels deep but only the ones an official
 * source has been obtained for are loaded, so the form asks the catalog what
 * exists rather than carrying a hardcoded list that would drift the day the
 * remaining levels land.
 *
 * Ordered against the enum's declaration, which is the hierarchy order, rather
 * than by letting Postgres sort the enum — the intent survives someone adding a
 * value in the wrong place.
 */
export const getTerritoryLevelsService = async (
  prismaClient: PrismaClient
): Promise<GetTerritoryLevelsResponse> => {
  const rows = await prismaClient.territory.findMany({
    distinct: ["level"],
    select: { level: true },
  });

  const present = new Set(rows.map((row) => row.level));

  return Object.values(TerritoryLevel).filter((level) => present.has(level));
};
