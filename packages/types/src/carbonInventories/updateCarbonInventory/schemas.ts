import { CarbonInventoryBaseSchema } from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";
import { z } from "zod";

export const UpdateCarbonInventoryRequestSchema =
  CarbonInventoryBaseSchema.pick({
    name: true,
    organizationId: true,
    organizationBranchId: true,
    organizationData: true,
    year: true,
    usageMode: true,
    preselectedNodesId: true,
    status: true,
    isEditable: true,
  })
    .partial()
    .strict()
    .refine((value) => Object.values(value).some((v) => v !== undefined), {
      message: "At least one field must be provided with a defined value",
    });

export const UpdateCarbonInventoryResponseSchema =
  CarbonInventoryBaseSchema.omit({ status: true });

export const UpdateCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});
