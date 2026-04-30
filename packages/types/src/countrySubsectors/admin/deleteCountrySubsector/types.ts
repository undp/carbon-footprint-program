import { z } from "zod";
import type { DeleteCountrySubsectorParamsSchema } from "./schemas.js";

export type DeleteCountrySubsectorParams = z.infer<
  typeof DeleteCountrySubsectorParamsSchema
>;
