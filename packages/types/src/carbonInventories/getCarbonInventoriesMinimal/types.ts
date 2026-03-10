import { z } from "zod";
import type { GetCarbonInventoriesMinimalResponseSchema } from "./schemas.js";

export type GetCarbonInventoriesMinimalResponse = z.infer<
  typeof GetCarbonInventoriesMinimalResponseSchema
>;
