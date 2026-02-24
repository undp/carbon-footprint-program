import { z } from "zod";
import type { FileSchema, FileTypeSchema } from "./baseSchemas.js";

export type File = z.infer<typeof FileSchema>;
export type FileType = z.infer<typeof FileTypeSchema>;
