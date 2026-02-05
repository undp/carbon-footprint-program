import { z } from "zod";
import { MethodologyWithRelationsSchema } from "./base.js";

// Response Schema
export const GetAllMethodologiesResponseSchema = z.array(MethodologyWithRelationsSchema);

// TypeScript Types
export type GetAllMethodologiesResponse = z.infer<typeof GetAllMethodologiesResponseSchema>;
