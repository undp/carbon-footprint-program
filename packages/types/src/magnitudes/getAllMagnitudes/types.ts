import { z } from "zod";
import type { GetAllMagnitudesResponseSchema } from "./schemas.js";

export type GetAllMagnitudesResponse = z.infer<
  typeof GetAllMagnitudesResponseSchema
>;
