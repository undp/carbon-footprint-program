import { z } from "zod";
import { TerritoryLevelSchema } from "../../baseSchemas/index.js";

/**
 * The levels of the hierarchy the catalog actually holds rows for, outermost
 * first. The organization form renders one selector per entry, so a level that
 * ships later becomes visible without a code change, and a level nobody has data
 * for is never a dead control.
 */
export const GetTerritoryLevelsResponseSchema = z.array(TerritoryLevelSchema);
