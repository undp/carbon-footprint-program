import { CarbonInventoryBaseSchema } from "../../baseSchemas/index.js";

export const CreateCarbonInventoryRequestSchema =
  CarbonInventoryBaseSchema.pick({
    usageMode: true,
    organizationId: true,
  });

export const CreateCarbonInventoryResponseSchema =
  CarbonInventoryBaseSchema.omit({
    status: true,
  });
