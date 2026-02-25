import { z } from "zod";
import type { GetFilesResponseSchema, GetFilesQuerySchema } from "./schemas.js";

export type GetFilesResponse = z.infer<typeof GetFilesResponseSchema>;
export type GetFilesQuery = z.infer<typeof GetFilesQuerySchema>;
