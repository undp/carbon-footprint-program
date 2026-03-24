import { z } from "zod";
import type { SelfDeclareCarboInventoryParamsSchema } from "./schemas.js";

export type SelfDeclareCarbonInventoryParams = z.infer<
  typeof SelfDeclareCarboInventoryParamsSchema
>;
