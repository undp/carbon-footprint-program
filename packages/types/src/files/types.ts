import { z } from "zod";
import { RouteFileTypeSchema } from "../baseSchemas/file.js";

export const FileType = RouteFileTypeSchema.enum;

export type FileType = z.infer<typeof RouteFileTypeSchema>;
