import type { z } from "zod";
import type { ReductionProjectDisplayStatusSchema } from "./schemas.js";

export type ReductionProjectDisplayStatus = z.infer<
  typeof ReductionProjectDisplayStatusSchema
>;
