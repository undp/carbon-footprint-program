import { z } from "zod";
import type { DeleteCountrySectorParamsSchema } from "./schemas.js";

export type DeleteCountrySectorParams = z.infer<
  typeof DeleteCountrySectorParamsSchema
>;
