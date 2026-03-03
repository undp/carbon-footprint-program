import { z } from "zod";
import type { GetAllCountrySectorsResponseSchema } from "./schemas.ts";

export type GetAllCountrySectorsResponse = z.infer<
  typeof GetAllCountrySectorsResponseSchema
>;
