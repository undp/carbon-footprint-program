import { z } from "zod";
import { GetCarbonInventoriesMinimalResponseSchema } from "./schemas.js";

export type GetCarbonInventoriesMinimalResponse = z.infer<
  typeof GetCarbonInventoriesMinimalResponseSchema
>;
