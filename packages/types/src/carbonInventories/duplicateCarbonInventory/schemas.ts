import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const DuplicateCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The ID of the carbon inventory to duplicate"),
});

export const DuplicateCarbonInventoryResponseSchema = z.object({
  id: IdSchema.describe("The ID of the newly created carbon inventory"),
});
