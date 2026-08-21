import { z } from "zod";
import { IdSchema } from "../zod.js";
import { TerritoryLevel } from "../enums.js";

export const TerritoryLevelSchema = z.enum(TerritoryLevel);

export const TerritoryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the territory"),
  name: z.string().min(1).describe("The name of the territory"),
  level: TerritoryLevelSchema.describe(
    "The level of the hierarchy this territory belongs to"
  ),
  parentId: IdSchema.nullable().describe(
    "The ID of the parent territory, or null for a root of the hierarchy"
  ),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
});
