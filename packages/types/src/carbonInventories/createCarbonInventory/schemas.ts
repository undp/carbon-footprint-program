import { CarbonInventoryBaseSchema } from "../../baseSchemas/index.js";

export const CreateCarbonInventoryRequestSchema =
  CarbonInventoryBaseSchema.pick({
    usageMode: true,
  });

export const CreateCarbonInventoryResponseSchema = CarbonInventoryBaseSchema;
