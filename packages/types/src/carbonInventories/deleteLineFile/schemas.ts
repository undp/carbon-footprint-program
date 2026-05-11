import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const DeleteLineFileParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
  uuid: z.uuid().describe("The file UUID"),
});

export const DeleteLineFileResponseSchema = z.object({
  uuid: z.uuid().describe("The deleted file UUID"),
});
