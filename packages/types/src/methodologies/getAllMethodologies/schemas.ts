import { z } from "zod";
import { MethodologyWithRelationsSchema } from "../baseSchemas.js";

// Response Schema
export const GetAllMethodologiesResponseSchema = z.array(
  MethodologyWithRelationsSchema
);
