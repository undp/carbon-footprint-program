import { z } from "zod";
import { IdSchema, listQueryParam } from "../../zod.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";

export const GetCarbonInventoriesMinimalParamsSchema = z.object({
  statuses: listQueryParam()
    .pipe(CarbonInventoryDisplayStatusSchema.array())
    .optional(),
  selfDeclared: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

export type GetCarbonInventoriesMinimalParams = z.infer<
  typeof GetCarbonInventoriesMinimalParamsSchema
>;

export const GetCarbonInventoriesMinimalItemSchema = z.object({
  id: IdSchema,
  name: z.string().nullable(),
  year: z.number().int().nullable(),
  status: CarbonInventoryDisplayStatusSchema,
});

export const GetCarbonInventoriesMinimalResponseSchema = z.array(
  GetCarbonInventoriesMinimalItemSchema
);
