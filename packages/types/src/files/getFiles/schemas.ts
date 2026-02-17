import { z } from "zod";
import { FileSchema, FileStatusSchema } from "../baseSchemas.js";

export const GetFilesQuerySchema = z.object({
  status: FileStatusSchema.optional().describe("Filter files by status"),
});

export const GetFilesResponseSchema = z.array(FileSchema);
