import { z } from "zod";
import type { GetFilesResponseSchema, GetFilesQuerySchema } from "./schemas.ts";

export type GetFilesResponse = z.infer<typeof GetFilesResponseSchema>;
export type GetFilesQuery = z.infer<typeof GetFilesQuerySchema>;
