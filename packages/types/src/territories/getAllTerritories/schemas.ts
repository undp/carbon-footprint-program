import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { TerritoryBaseSchema } from "../../baseSchemas/index.js";

/**
 * Children of one node of the territorial hierarchy. Omitting `parentId` asks for
 * the roots, so the five dependent selectors of the organization form each issue
 * the same request with the value the previous one produced.
 */
export const GetAllTerritoriesQuerySchema = z.object({
  parentId: IdSchema.optional().describe(
    "Parent territory whose children are returned. Omit for the roots of the hierarchy."
  ),
});

export const GetAllTerritoriesResponseSchema = z.array(
  TerritoryBaseSchema.pick({
    id: true,
    name: true,
    level: true,
  })
);
