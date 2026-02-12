import { z } from "zod";
import { MethodologyWithCountsSchema } from "../baseSchemas.js";

// Response Schema
export const GetAllMethodologiesResponseSchema = z.array(
  MethodologyWithCountsSchema
);
