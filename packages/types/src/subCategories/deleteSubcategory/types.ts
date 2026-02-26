import { z } from "zod";
import type { DeleteSubcategoryParamsSchema } from "./schemas.js";

export type DeleteSubcategoryParams = z.infer<
  typeof DeleteSubcategoryParamsSchema
>;
